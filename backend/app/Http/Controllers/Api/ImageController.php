<?php

namespace App\Http\Controllers\Api;

use App\Enums\NoteVisibility;
use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Image;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImageController extends Controller
{
    /**
     * Stream an image's bytes, gated by the same authorization boundary as
     * its owning note/blog post: publicly visible if the owner (a public
     * note, a published blog post) is publicly visible, otherwise only the
     * owning user via the existing NotePolicy/BlogPostPolicy "view" check.
     */
    public function show(Request $request, Image $image): StreamedResponse
    {
        $imageable = $image->imageable;

        $isPublic = match (true) {
            $imageable instanceof Note => $imageable->visibility === NoteVisibility::Public,
            $imageable instanceof BlogPost => $imageable->published_at?->isPast() ?? false,
            default => false,
        };

        if (! $isPublic) {
            // No token (or an invalid one) resolves to a null user here rather
            // than aborting, since this route carries no auth:sanctum
            // middleware — that's what lets a published post's cover image
            // load for a signed-out visitor in the first place.
            $user = $request->user();

            // 404, not 401/403: mirrors the public NoteController, which 404s
            // a private note by id rather than revealing it exists.
            abort_if($user === null, 404);

            // 403 for a wrong (but authenticated) user — same Policy, same
            // cross-user behavior as the dashboard show/update/delete actions.
            Gate::authorize('view', $imageable);
        }

        return Storage::disk('images')->response($image->path, null, [
            'Content-Type' => $image->mime_type,
            'Cache-Control' => $isPublic ? 'public, max-age=86400' : 'private, max-age=60',
        ]);
    }
}
