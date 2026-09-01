<?php

namespace Tests\Feature;

use App\Enums\NoteVisibility;
use App\Models\Image;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ImageUploadTest extends TestCase
{
    use RefreshDatabase;

    private function realJpeg(): string
    {
        $gd = imagecreatetruecolor(400, 300);
        imagefill($gd, 0, 0, imagecolorallocate($gd, 200, 50, 50));
        ob_start();
        imagejpeg($gd, null, 90);
        $bytes = ob_get_clean();
        imagedestroy($gd);

        return $bytes;
    }

    private function realPng(): string
    {
        $gd = imagecreatetruecolor(200, 200);
        imagefill($gd, 0, 0, imagecolorallocate($gd, 40, 120, 200));
        ob_start();
        imagepng($gd);
        $bytes = ob_get_clean();
        imagedestroy($gd);

        return $bytes;
    }

    /**
     * A real, landscape JPEG (width != height, so a 90/270 rotation is
     * verifiable by dimension swap alone) carrying a genuine EXIF APP1
     * segment with the given Orientation tag -- spliced in by hand (PHP's
     * GD has no EXIF writer), the same technique used to reproduce and then
     * confirm-fix the sideways-cover-image bug.
     */
    private function jpegWithExifOrientation(int $orientation): string
    {
        $gd = imagecreatetruecolor(400, 300);
        imagefill($gd, 0, 0, imagecolorallocate($gd, 200, 50, 50));
        ob_start();
        imagejpeg($gd, null, 90);
        $jpeg = ob_get_clean();
        imagedestroy($gd);

        $tiff = "II\x2A\x00".pack('V', 8);
        $tiff .= pack('v', 1);
        $tiff .= pack('vvV', 0x0112, 3, 1).pack('v', $orientation)."\x00\x00";
        $tiff .= pack('V', 0);
        $exif = "Exif\x00\x00".$tiff;
        $app1 = "\xFF\xE1".pack('n', strlen($exif) + 2).$exif;

        return substr($jpeg, 0, 2).$app1.substr($jpeg, 2);
    }

    private function uploadedFileFromBytes(string $bytes, string $name, ?string $mimeType = null): UploadedFile
    {
        $tmp = tempnam(sys_get_temp_dir(), 'img');
        file_put_contents($tmp, $bytes);

        return new UploadedFile($tmp, $name, $mimeType, null, true);
    }

    public function test_valid_jpeg_note_image_upload_is_reencoded_and_stored_as_webp(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $note = $user->notes()->create(['title' => 't', 'content' => 'c', 'visibility' => NoteVisibility::Private]);

        $response = $this->actingAs($user, 'sanctum')->post("/api/my/notes/{$note->id}/images", [
            'image' => $this->uploadedFileFromBytes($this->realJpeg(), 'photo.jpg'),
        ]);

        $response->assertCreated();
        $response->assertJsonMissingPath('path'); // hidden -- frontend never sees the raw B2 key

        $image = Image::first();
        $this->assertSame('image/webp', $image->mime_type);
        $this->assertStringEndsWith('.webp', $image->path);
        $this->assertTrue($image->imageable->is($note));

        Storage::disk('images')->assertExists($image->path);
        $storedBytes = Storage::disk('images')->get($image->path);
        $info = getimagesize('data://image/webp;base64,'.base64_encode($storedBytes));
        $this->assertSame('image/webp', $info['mime']);
        // Confirms real re-encoding happened, not a pass-through of the JPEG bytes.
        $this->assertNotSame($this->realJpeg(), $storedBytes);
    }

    #[DataProvider('exifOrientationsThatSwapDimensions')]
    public function test_upload_is_rotated_upright_per_exif_orientation(int $orientation): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $note = $user->notes()->create(['title' => 't', 'content' => 'c', 'visibility' => NoteVisibility::Private]);

        // Source is 400x300 (landscape); orientations 6 and 8 are a 90/270
        // rotation, so a correctly-oriented output must come out 300x400
        // (portrait) -- this is what actually caught the real bug: without
        // the exif extension, the stored WebP stayed 400x300 (never
        // rotated), i.e. sideways.
        $response = $this->actingAs($user, 'sanctum')->post("/api/my/notes/{$note->id}/images", [
            'image' => $this->uploadedFileFromBytes($this->jpegWithExifOrientation($orientation), 'photo.jpg'),
        ]);

        $response->assertCreated();

        $storedBytes = Storage::disk('images')->get(Image::first()->path);
        $info = getimagesize('data://image/webp;base64,'.base64_encode($storedBytes));

        $this->assertSame(300, $info[0], "width for orientation {$orientation}");
        $this->assertSame(400, $info[1], "height for orientation {$orientation}");
    }

    public static function exifOrientationsThatSwapDimensions(): array
    {
        return [
            'orientation 6 (rotate 90 CW)' => [6],
            'orientation 8 (rotate 270 CW)' => [8],
        ];
    }

    public function test_upload_with_normal_exif_orientation_is_not_rotated(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $note = $user->notes()->create(['title' => 't', 'content' => 'c', 'visibility' => NoteVisibility::Private]);

        $response = $this->actingAs($user, 'sanctum')->post("/api/my/notes/{$note->id}/images", [
            'image' => $this->uploadedFileFromBytes($this->jpegWithExifOrientation(1), 'photo.jpg'),
        ]);

        $response->assertCreated();

        $storedBytes = Storage::disk('images')->get(Image::first()->path);
        $info = getimagesize('data://image/webp;base64,'.base64_encode($storedBytes));

        $this->assertSame(400, $info[0]);
        $this->assertSame(300, $info[1]);
    }

    public function test_valid_png_cover_image_upload_replaces_previous_and_deletes_old_object(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $post = $user->blogPosts()->create(['title' => 't', 'slug' => 't-slug', 'content' => 'c']);

        $first = $this->actingAs($user, 'sanctum')->post("/api/my/blog-posts/{$post->slug}/cover-image", [
            'image' => $this->uploadedFileFromBytes($this->realPng(), 'cover.png'),
        ]);
        $first->assertOk();
        $firstPath = $post->fresh()->coverImage->path;
        Storage::disk('images')->assertExists($firstPath);
        $this->assertNotNull($post->fresh()->cover_image_path);

        $second = $this->actingAs($user, 'sanctum')->post("/api/my/blog-posts/{$post->slug}/cover-image", [
            'image' => $this->uploadedFileFromBytes($this->realPng(), 'cover2.png'),
        ]);
        $second->assertOk();

        $post->refresh();
        Storage::disk('images')->assertMissing($firstPath); // old object actually deleted
        Storage::disk('images')->assertExists($post->coverImage->path);
        $this->assertSame($post->coverImage->path, $post->cover_image_path);
        $this->assertSame(1, Image::count()); // old row deleted too, not orphaned
    }

    public function test_file_masquerading_as_jpeg_is_rejected_by_the_finfo_sniff(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $note = $user->notes()->create(['title' => 't', 'content' => 'c', 'visibility' => NoteVisibility::Private]);

        // Real PHP source, renamed to .jpg with a spoofed image/jpeg MIME type
        // on the multipart part -- exactly what the task asked to defend against.
        $php = $this->uploadedFileFromBytes('<'.'?php echo "pwned"; ?>', 'shell.jpg', 'image/jpeg');

        $response = $this->actingAs($user, 'sanctum')->post("/api/my/notes/{$note->id}/images", [
            'image' => $php,
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'image' => ["The image's content does not match an allowed image type (jpeg, png, webp)."],
        ]);
        $this->assertSame(0, Image::count());
    }

    public function test_finfo_rejection_is_logged_since_validation_exceptions_are_not_reported_by_default(): void
    {
        Storage::fake('images');
        Log::spy();
        $user = User::factory()->create();
        $note = $user->notes()->create(['title' => 't', 'content' => 'c', 'visibility' => NoteVisibility::Private]);

        $php = $this->uploadedFileFromBytes('<'.'?php echo "pwned"; ?>', 'shell.jpg', 'image/jpeg');

        $this->actingAs($user, 'sanctum')->post("/api/my/notes/{$note->id}/images", ['image' => $php]);

        Log::shouldHaveReceived('warning')
            ->once()
            ->with('Image upload rejected: finfo content sniff', \Mockery::on(
                fn ($context) => $context['original_name'] === 'shell.jpg' && $context['sniffed_mime'] !== 'image/jpeg'
            ));
    }

    public function test_truncated_jpeg_passes_finfo_but_is_rejected_by_getimagesize(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $note = $user->notes()->create(['title' => 't', 'content' => 'c', 'visibility' => NoteVisibility::Private]);

        // Keep only the JPEG header (finfo's magic-byte sniff still reads this
        // as image/jpeg) but truncate the rest, so getimagesize() genuinely
        // fails to parse it as a decodable image -- a distinct failure path
        // from the finfo check above.
        $truncated = substr($this->realJpeg(), 0, 30);

        $response = $this->actingAs($user, 'sanctum')->post("/api/my/notes/{$note->id}/images", [
            'image' => $this->uploadedFileFromBytes($truncated, 'corrupt.jpg'),
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'image' => ['The image could not be verified as a valid, decodable image.'],
        ]);
        $this->assertSame(0, Image::count());
    }

    public function test_oversized_file_is_rejected(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $note = $user->notes()->create(['title' => 't', 'content' => 'c', 'visibility' => NoteVisibility::Private]);

        $file = UploadedFile::fake()->create('big.jpg', 5121); // just over 5MB, in KB

        $response = $this->actingAs($user, 'sanctum')->post("/api/my/notes/{$note->id}/images", [
            'image' => $file,
        ]);

        $response->assertStatus(422);
    }

    public function test_uploading_to_another_users_note_is_forbidden(): void
    {
        Storage::fake('images');
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $note = $owner->notes()->create(['title' => 't', 'content' => 'c', 'visibility' => NoteVisibility::Private]);

        $response = $this->actingAs($attacker, 'sanctum')->post("/api/my/notes/{$note->id}/images", [
            'image' => $this->uploadedFileFromBytes($this->realJpeg(), 'photo.jpg'),
        ]);

        $response->assertForbidden();
    }

    public function test_private_note_image_is_not_visible_unauthenticated_or_to_another_user(): void
    {
        Storage::fake('images');
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $note = $owner->notes()->create(['title' => 't', 'content' => 'c', 'visibility' => NoteVisibility::Private]);
        $image = $note->images()->create(['path' => 'images/x.webp', 'mime_type' => 'image/webp', 'size' => 10]);
        Storage::disk('images')->put($image->path, 'fake-bytes');

        $this->get("/api/images/{$image->id}")->assertNotFound();
        $this->actingAs($other, 'sanctum')->get("/api/images/{$image->id}")->assertForbidden();
        $this->actingAs($owner, 'sanctum')->get("/api/images/{$image->id}")->assertOk();
    }

    public function test_published_blog_post_cover_image_is_visible_publicly_unauthenticated(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $post = $user->blogPosts()->create([
            'title' => 't', 'slug' => 't-slug', 'content' => 'c', 'published_at' => now()->subMinute(),
        ]);
        $image = $post->coverImage()->create(['path' => 'images/cover.webp', 'mime_type' => 'image/webp', 'size' => 10]);
        Storage::disk('images')->put($image->path, 'fake-bytes');

        $this->get("/api/images/{$image->id}")->assertOk();
    }

    public function test_draft_blog_post_cover_image_is_not_visible_unauthenticated(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $post = $user->blogPosts()->create(['title' => 't', 'slug' => 't-slug', 'content' => 'c']);
        $image = $post->coverImage()->create(['path' => 'images/cover.webp', 'mime_type' => 'image/webp', 'size' => 10]);
        Storage::disk('images')->put($image->path, 'fake-bytes');

        $this->get("/api/images/{$image->id}")->assertNotFound();
        $this->actingAs($user, 'sanctum')->get("/api/images/{$image->id}")->assertOk();
    }

    public function test_deleting_a_note_deletes_its_images_from_storage_and_the_database(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $note = $user->notes()->create(['title' => 't', 'content' => 'c', 'visibility' => NoteVisibility::Private]);
        $image = $note->images()->create(['path' => 'images/x.webp', 'mime_type' => 'image/webp', 'size' => 10]);
        Storage::disk('images')->put($image->path, 'fake-bytes');

        $note->delete();

        Storage::disk('images')->assertMissing($image->path);
        $this->assertSame(0, Image::count());
    }

    public function test_deleting_a_blog_post_deletes_its_cover_image_from_storage_and_the_database(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();
        $post = $user->blogPosts()->create(['title' => 't', 'slug' => 't-slug', 'content' => 'c']);
        $image = $post->coverImage()->create(['path' => 'images/cover.webp', 'mime_type' => 'image/webp', 'size' => 10]);
        Storage::disk('images')->put($image->path, 'fake-bytes');

        $post->delete();

        Storage::disk('images')->assertMissing($image->path);
        $this->assertSame(0, Image::count());
    }
}
