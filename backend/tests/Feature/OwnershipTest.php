<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OwnershipTest extends TestCase
{
    use RefreshDatabase;

    // --- Notes ---

    public function test_another_user_cannot_view_update_or_delete_a_private_note(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $note = Note::factory()->private()->for($owner)->create(['title' => 'Original']);

        $this->actingAs($other, 'sanctum');

        $this->getJson("/api/my/notes/{$note->id}")->assertForbidden();
        $this->putJson("/api/my/notes/{$note->id}", ['title' => 'Hijacked'])->assertForbidden();
        $this->deleteJson("/api/my/notes/{$note->id}")->assertForbidden();

        $this->assertDatabaseHas('notes', ['id' => $note->id, 'title' => 'Original', 'user_id' => $owner->id]);
    }

    public function test_my_notes_index_lists_only_the_callers_own_notes(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        Note::factory()->private()->for($owner)->create(['title' => 'Owner note']);
        Note::factory()->private()->for($other)->create(['title' => 'Other note']);

        $response = $this->actingAs($other, 'sanctum')->getJson('/api/my/notes');

        $response->assertOk();
        $this->assertSame(['Other note'], $response->json('data.*.title'));
    }

    public function test_user_id_in_the_body_is_ignored_when_creating_a_note(): void
    {
        $victim = User::factory()->create();
        $attacker = User::factory()->create();

        $response = $this->actingAs($attacker, 'sanctum')->postJson('/api/my/notes', [
            'title' => 'Planted',
            'content' => 'c',
            'visibility' => 'private',
            'user_id' => $victim->id,
        ]);

        $response->assertCreated();
        $this->assertSame($attacker->id, Note::sole()->user_id);
    }

    public function test_user_id_in_the_body_is_ignored_when_updating_a_note(): void
    {
        $victim = User::factory()->create();
        $owner = User::factory()->create();
        $note = Note::factory()->for($owner)->create();

        $this->actingAs($owner, 'sanctum')->putJson("/api/my/notes/{$note->id}", [
            'title' => 'Renamed',
            'user_id' => $victim->id,
        ])->assertOk();

        $this->assertDatabaseHas('notes', ['id' => $note->id, 'title' => 'Renamed', 'user_id' => $owner->id]);
    }

    // --- Blog posts ---

    public function test_another_user_cannot_view_update_or_delete_a_blog_post(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $post = BlogPost::factory()->draft()->for($owner)->create(['title' => 'Original']);

        $this->actingAs($other, 'sanctum');

        $this->getJson("/api/my/blog-posts/{$post->slug}")->assertForbidden();
        $this->putJson("/api/my/blog-posts/{$post->slug}", ['title' => 'Hijacked'])->assertForbidden();
        $this->deleteJson("/api/my/blog-posts/{$post->slug}")->assertForbidden();

        $this->assertDatabaseHas('blog_posts', ['id' => $post->id, 'title' => 'Original', 'user_id' => $owner->id]);
    }

    public function test_my_blog_posts_index_lists_only_the_callers_own_posts(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        BlogPost::factory()->for($owner)->create(['title' => 'Owner post']);
        BlogPost::factory()->for($other)->create(['title' => 'Other post']);

        $response = $this->actingAs($other, 'sanctum')->getJson('/api/my/blog-posts');

        $response->assertOk();
        $this->assertSame(['Other post'], $response->json('data.*.title'));
    }

    public function test_user_id_in_the_body_is_ignored_when_creating_a_blog_post(): void
    {
        $victim = User::factory()->create();
        $attacker = User::factory()->create();

        $response = $this->actingAs($attacker, 'sanctum')->postJson('/api/my/blog-posts', [
            'title' => 'Planted post',
            'content' => 'c',
            'user_id' => $victim->id,
        ]);

        $response->assertCreated();
        $this->assertSame($attacker->id, BlogPost::sole()->user_id);
    }

    public function test_user_id_in_the_body_is_ignored_when_updating_a_blog_post(): void
    {
        $victim = User::factory()->create();
        $owner = User::factory()->create();
        $post = BlogPost::factory()->for($owner)->create();

        $this->actingAs($owner, 'sanctum')->putJson("/api/my/blog-posts/{$post->slug}", [
            'title' => 'Renamed',
            'user_id' => $victim->id,
        ])->assertOk();

        $this->assertDatabaseHas('blog_posts', ['id' => $post->id, 'title' => 'Renamed', 'user_id' => $owner->id]);
    }
}
