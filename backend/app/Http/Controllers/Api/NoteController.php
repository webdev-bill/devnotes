<?php

namespace App\Http\Controllers\Api;

use App\Enums\NoteVisibility;
use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    /**
     * List public notes, optionally filtered by tag and/or search term.
     */
    public function index(Request $request): LengthAwarePaginator
    {
        return Note::query()
            ->public()
            ->with('tags')
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
     * Show a single public note.
     */
    public function show(Note $note): Note
    {
        abort_unless($note->visibility === NoteVisibility::Public, 404);

        return $note->load('tags');
    }
}
