<?php

namespace App\Http\Controllers\Api\My;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreImageRequest;
use App\Models\BlogPost;
use App\Services\ImageUploadService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class BlogPostCoverImageController extends Controller
{
    public function __construct(private readonly ImageUploadService $imageUploads) {}

    /**
     * Upload (or replace) the authenticated user's blog post's cover image.
     * The post must already exist — a cover image attaches to a real row via
     * the polymorphic relation, it isn't held for an unsaved draft.
     */
    public function store(StoreImageRequest $request, BlogPost $blog_post): BlogPost
    {
        // Authorization already checked by StoreImageRequest::authorize().
        $previous = $blog_post->coverImage;

        $stored = $this->imageUploads->store($request->file('image'));
        $blog_post->coverImage()->create($stored);
        $blog_post->forceFill(['cover_image_path' => $stored['path']])->save();

        // Delete the old object only after the new one is safely stored and
        // the post record updated, so a failed upload never leaves the post
        // without a cover.
        if ($previous !== null) {
            Storage::disk('images')->delete($previous->path);
            $previous->delete();
        }

        return $blog_post->fresh('coverImage');
    }

    /**
     * Remove the authenticated user's blog post's cover image, if any.
     */
    public function destroy(BlogPost $blog_post): Response
    {
        Gate::authorize('update', $blog_post);

        if ($image = $blog_post->coverImage) {
            Storage::disk('images')->delete($image->path);
            $image->delete();
            $blog_post->forceFill(['cover_image_path' => null])->save();
        }

        return response()->noContent();
    }
}
