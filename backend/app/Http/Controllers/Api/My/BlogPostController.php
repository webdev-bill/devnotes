<?php

namespace App\Http\Controllers\Api\My;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBlogPostRequest;
use App\Http\Requests\UpdateBlogPostRequest;
use App\Models\BlogPost;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class BlogPostController extends Controller
{
    /**
     * List all of the authenticated user's blog posts, drafts included.
     */
    public function index(Request $request): LengthAwarePaginator
    {
        return $request->user()->blogPosts()
            ->latest()
            ->paginate();
    }

    /**
     * Create a blog post owned by the authenticated user.
     */
    public function store(StoreBlogPostRequest $request): BlogPost
    {
        return $request->user()->blogPosts()->create([
            ...$request->safe()->except('slug'),
            'slug' => $request->safe()->input('slug') ?: Str::slug($request->safe()->input('title')),
        ]);
    }

    /**
     * Show one of the authenticated user's blog posts, any state.
     */
    public function show(BlogPost $blog_post): BlogPost
    {
        Gate::authorize('view', $blog_post);

        return $blog_post;
    }

    /**
     * Update one of the authenticated user's blog posts.
     */
    public function update(UpdateBlogPostRequest $request, BlogPost $blog_post): BlogPost
    {
        $blog_post->update($request->safe()->all());

        return $blog_post;
    }

    /**
     * Delete one of the authenticated user's blog posts.
     */
    public function destroy(BlogPost $blog_post): Response
    {
        Gate::authorize('delete', $blog_post);

        $blog_post->delete();

        return response()->noContent();
    }
}
