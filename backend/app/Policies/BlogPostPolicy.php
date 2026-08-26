<?php

namespace App\Policies;

use App\Models\BlogPost;
use App\Models\User;

class BlogPostPolicy
{
    /**
     * Determine whether the user can view the blog post.
     */
    public function view(User $user, BlogPost $blogPost): bool
    {
        return $user->id === $blogPost->user_id;
    }

    /**
     * Determine whether the user can update the blog post.
     */
    public function update(User $user, BlogPost $blogPost): bool
    {
        return $user->id === $blogPost->user_id;
    }

    /**
     * Determine whether the user can delete the blog post.
     */
    public function delete(User $user, BlogPost $blogPost): bool
    {
        return $user->id === $blogPost->user_id;
    }
}
