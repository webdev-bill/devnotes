<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BlogPostPublicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_only_posts_published_in_the_past(): void
    {
        BlogPost::factory()->published()->create(['title' => 'Published post']);
        BlogPost::factory()->draft()->create(['title' => 'Draft post']);
        BlogPost::factory()->scheduled()->create(['title' => 'Scheduled post']);

        $response = $this->getJson('/api/blog-posts');

        $response->assertOk();
        $this->assertSame(['Published post'], $response->json('data.*.title'));
    }

    public function test_show_returns_404_for_a_draft(): void
    {
        $post = BlogPost::factory()->draft()->create();

        $this->getJson("/api/blog-posts/{$post->slug}")->assertNotFound();
    }

    public function test_show_returns_404_for_a_scheduled_post(): void
    {
        $post = BlogPost::factory()->scheduled()->create();

        $this->getJson("/api/blog-posts/{$post->slug}")->assertNotFound();
    }

    public function test_show_returns_a_post_published_in_the_past(): void
    {
        $post = BlogPost::factory()->published()->create(['title' => 'Live']);

        $this->getJson("/api/blog-posts/{$post->slug}")
            ->assertOk()
            ->assertJsonPath('title', 'Live');
    }

    public function test_scheduled_post_becomes_public_once_its_publish_time_passes(): void
    {
        // Exercises the published() scope's `published_at <= now()` as
        // Postgres actually evaluates it (stored timestamp vs. a bound PHP
        // now()), on both sides of the boundary.
        $post = BlogPost::factory()->create(['title' => 'Later', 'published_at' => now()->addHour()]);

        $this->getJson('/api/blog-posts')->assertJsonCount(0, 'data');
        $this->getJson("/api/blog-posts/{$post->slug}")->assertNotFound();

        $this->travel(61)->minutes();

        $this->assertSame(['Later'], $this->getJson('/api/blog-posts')->json('data.*.title'));
        $this->getJson("/api/blog-posts/{$post->slug}")->assertOk();
    }
}
