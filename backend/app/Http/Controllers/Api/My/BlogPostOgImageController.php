<?php

namespace App\Http\Controllers\Api\My;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSiteAssetRequest;
use App\Models\BlogPost;
use App\Services\SiteAssetUploadService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

// Per-post OG image override — stored on the `public` disk at a
// deterministic path (og/post-{id}.jpg), unlike the cover image (which
// lives on the `images` B2 disk with a random name). A deterministic path
// needs no "delete previous" bookkeeping — a re-upload just overwrites it.
// StoreSiteAssetRequest doesn't know which model to authorize against (it's
// shared with the site-wide, ownerless favicon/OG-image endpoints), so
// ownership is checked here explicitly, same as
// BlogPostCoverImageController::destroy.
class BlogPostOgImageController extends Controller
{
    public function __construct(private readonly SiteAssetUploadService $uploads) {}

    public function store(StoreSiteAssetRequest $request, BlogPost $blog_post): BlogPost
    {
        Gate::authorize('update', $blog_post);

        $path = 'og/post-'.$blog_post->id.'.jpg';
        $this->uploads->storeOgImage($request->file('image'), $path);

        $blog_post->forceFill(['og_image_path' => $path])->save();

        return $blog_post->fresh('coverImage');
    }

    public function destroy(BlogPost $blog_post): Response
    {
        Gate::authorize('update', $blog_post);

        if ($blog_post->og_image_path) {
            Storage::disk('public')->delete($blog_post->og_image_path);
            $blog_post->forceFill(['og_image_path' => null])->save();
        }

        return response()->noContent();
    }
}
