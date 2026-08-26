<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class BlogPostController extends Controller
{
    /**
     * List published blog posts.
     */
    public function index(): LengthAwarePaginator
    {
        return BlogPost::query()
            ->published()
            ->latest('published_at')
            ->paginate();
    }

    /**
     * Show a single published blog post by slug.
     */
    public function show(BlogPost $blog_post): BlogPost
    {
        abort_unless(
            $blog_post->published_at !== null && $blog_post->published_at->isPast(),
            404
        );

        return $blog_post;
    }
}
