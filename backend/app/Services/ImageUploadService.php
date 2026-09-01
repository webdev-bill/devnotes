<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;

// Re-encoding every accepted upload is itself a security control, not just an
// optimization: the bytes actually written to B2 are always server-produced
// from decoded pixel data, never the client's original file content.
class ImageUploadService
{
    private const MAX_DIMENSION = 1600;

    private const WEBP_QUALITY = 80;

    private readonly ImageManager $manager;

    public function __construct()
    {
        // autoOrientation: false is deliberate — see the comment above
        // orient() below. Without this, ImageManager::gd()'s default
        // (autoOrientation: true) applies EXIF rotation *inside* read(),
        // on the full-resolution decoded image, before scaleDown() is even
        // reachable from our code.
        $this->manager = ImageManager::gd(autoOrientation: false);
    }

    /**
     * Decode, resize, re-encode as WebP, and store on the "images" disk.
     * Assumes GenuineImageContent has already validated the upload.
     *
     * @return array{path: string, mime_type: string, size: int}
     */
    public function store(UploadedFile $file): array
    {
        $image = $this->manager->read($file->getRealPath());

        // Never upscale a smaller source image. Deliberately BEFORE orient()
        // below — this order is a real fix for a real production crash, not
        // stylistic. With the driver's default autoOrientation (the order
        // this shipped with originally), EXIF rotation runs inside read(),
        // on the full-resolution image, before any resize is possible —
        // GD's rotate has to hold the rotated full-resolution copy alongside
        // the original momentarily. For a real 4624x2080 phone photo this
        // measured ~193MB peak, over PHP's 128M stock memory_limit, and hit
        // a hard, uncatchable "Allowed memory size exhausted" fatal — a
        // crash with an empty response body and nothing in any log (fatals
        // of this class bypass Laravel's exception handler entirely; see
        // uploads.ini for why nothing reached the log either). Scaling down
        // FIRST, then orienting the now-small image, measured ~58MB peak for
        // the same photo — orient()/scaleDown() give the same final
        // dimensions regardless of order (MAX_DIMENSION is symmetric on
        // both axes), so this is a pure memory fix with no behavior change.
        $image->scaleDown(width: self::MAX_DIMENSION, height: self::MAX_DIMENSION);

        // EXIF orientation data is still attached to $image regardless of
        // autoOrientation (the decoder always extracts it — only whether it
        // auto-applies the rotation is gated by that config), so this still
        // correctly rotates the image; it just now runs on the already-small
        // copy instead of the full-resolution source.
        $image->orient();

        // strip: true drops EXIF (including GPS) from the re-encoded output,
        // mirroring the client-side WebP tool's (incidental, canvas-redraw)
        // EXIF stripping — here it's explicit since GD can otherwise retain it.
        $encoded = $image->toWebp(quality: self::WEBP_QUALITY, strip: true);

        $path = 'images/'.Str::random(40).'.webp';

        Storage::disk('images')->put($path, (string) $encoded);

        return [
            'path' => $path,
            'mime_type' => 'image/webp',
            'size' => strlen((string) $encoded),
        ];
    }
}
