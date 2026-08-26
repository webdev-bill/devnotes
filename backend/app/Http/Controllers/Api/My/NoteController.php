<?php

namespace App\Http\Controllers\Api\My;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNoteRequest;
use App\Http\Requests\UpdateNoteRequest;
use App\Models\Note;
use App\Models\Tag;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class NoteController extends Controller
{
    /**
     * List all of the authenticated user's notes.
     */
    public function index(Request $request): LengthAwarePaginator
    {
        return $request->user()->notes()
            ->with('tags')
            ->when($request->string('visibility')->isNotEmpty(), function ($query) use ($request) {
                $query->where('visibility', $request->string('visibility'));
            })
            ->when($request->string('tag')->isNotEmpty(), function ($query) use ($request) {
                $query->whereHas('tags', fn ($q) => $q->where('slug', $request->string('tag')));
            })
            ->when($request->string('search')->isNotEmpty(), function ($query) use ($request) {
                $term = '%'.$request->string('search').'%';
                $query->where(fn ($q) => $q->where('title', 'ilike', $term)->orWhere('content', 'ilike', $term));
            })
            ->latest()
            ->paginate();
    }

    /**
     * Create a note owned by the authenticated user.
     */
    public function store(StoreNoteRequest $request): Note
    {
        $note = $request->user()->notes()->create($request->safe()->except('tags'));

        $note->tags()->sync($this->tagIdsFor($request->safe()->array('tags')));

        return $note->load('tags');
    }

    /**
     * Show one of the authenticated user's notes, regardless of visibility.
     */
    public function show(Request $request, Note $note): Note
    {
        Gate::authorize('view', $note);

        return $note->load('tags');
    }

    /**
     * Update one of the authenticated user's notes.
     */
    public function update(UpdateNoteRequest $request, Note $note): Note
    {
        $note->update($request->safe()->except('tags'));

        if ($request->safe()->has('tags')) {
            $note->tags()->sync($this->tagIdsFor($request->safe()->array('tags')));
        }

        return $note->load('tags');
    }

    /**
     * Delete one of the authenticated user's notes.
     */
    public function destroy(Note $note): Response
    {
        Gate::authorize('delete', $note);

        $note->delete();

        return response()->noContent();
    }

    /**
     * Resolve tag names to ids, creating any tags that don't exist yet.
     *
     * @param  array<int, string>  $names
     * @return array<int, int>
     */
    private function tagIdsFor(array $names): array
    {
        return collect($names)
            ->map(fn (string $name) => Tag::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name],
            )->id)
            ->all();
    }
}
