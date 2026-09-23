<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicNoteVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_public_notes_and_never_private_ones(): void
    {
        Note::factory()->public()->create(['title' => 'Public note']);
        Note::factory()->private()->create(['title' => 'Private note']);

        $response = $this->getJson('/api/notes');

        $response->assertOk();
        $this->assertSame(['Public note'], $response->json('data.*.title'));
    }

    public function test_search_never_returns_a_private_note_matching_by_title_or_content(): void
    {
        Note::factory()->public()->create(['title' => 'Postgres indexing tips', 'content' => 'btree vs gin']);
        Note::factory()->private()->create(['title' => 'Postgres credentials', 'content' => 'nothing to see']);
        // Matches on content only: this is the case that would leak if the
        // title-OR-content condition ever lost its grouping closure, i.e.
        // `public AND title ilike x OR content ilike x`.
        Note::factory()->private()->create(['title' => 'Unrelated', 'content' => 'the postgres superuser password']);

        // Lowercase term against a capitalised title — also pins that search
        // is case-insensitive (ilike), which only a real Postgres run proves.
        $response = $this->getJson('/api/notes?search=postgres');

        $response->assertOk();
        $this->assertSame(['Postgres indexing tips'], $response->json('data.*.title'));
    }

    public function test_tag_filter_never_returns_a_private_note_with_that_tag(): void
    {
        $tag = Tag::factory()->create(['name' => 'Docker', 'slug' => 'docker']);
        Note::factory()->public()->hasAttached($tag)->create(['title' => 'Public docker note']);
        Note::factory()->private()->hasAttached($tag)->create(['title' => 'Private docker note']);
        Note::factory()->public()->create(['title' => 'Untagged public note']);

        $response = $this->getJson('/api/notes?tag=docker');

        $response->assertOk();
        $this->assertSame(['Public docker note'], $response->json('data.*.title'));
    }

    public function test_combined_search_and_tag_filters_never_return_a_private_note(): void
    {
        $tag = Tag::factory()->create(['name' => 'Laravel', 'slug' => 'laravel']);
        Note::factory()->public()->hasAttached($tag)->create(['title' => 'Sanctum setup']);
        Note::factory()->private()->hasAttached($tag)->create(['title' => 'Sanctum secret token']);

        $response = $this->getJson('/api/notes?tag=laravel&search=sanctum');

        $response->assertOk();
        $this->assertSame(['Sanctum setup'], $response->json('data.*.title'));
    }

    public function test_show_returns_404_for_a_private_note(): void
    {
        $note = Note::factory()->private()->create();

        $this->getJson("/api/notes/{$note->id}")->assertNotFound();
    }

    public function test_show_returns_404_for_a_private_note_even_to_its_owner(): void
    {
        // The public endpoint ignores who is asking; owners read their own
        // private notes through /api/my/notes/{id} instead.
        $owner = User::factory()->create();
        $note = Note::factory()->private()->for($owner)->create();

        $this->actingAs($owner, 'sanctum')->getJson("/api/notes/{$note->id}")->assertNotFound();
    }

    public function test_show_returns_a_public_note(): void
    {
        $note = Note::factory()->public()->create(['title' => 'Visible']);

        $this->getJson("/api/notes/{$note->id}")
            ->assertOk()
            ->assertJsonPath('title', 'Visible');
    }
}
