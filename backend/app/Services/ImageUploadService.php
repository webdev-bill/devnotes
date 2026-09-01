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
        $this->manager = ImageManager::gd();
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

        // Explicit, even though ImageManager::gd()'s default config already
        // applies this automatically on decode (Config::$autoOrientation
        // defaults to true) — makes the intent visible in our own code
        // rather than relying on an implicit library default, and is a safe
        // no-op if the image is already upright or already corrected. Real
        // bug this guarded against: without the PHP exif extension enabled,
        // Intervention's decoder gets a silently-empty EXIF collection (no
        // error, no warning), so there's nothing here to orient by — the
        // actual fix is the exif extension in the Dockerfiles, not this call.
        $image->orient();

        // Never upscale a smaller source image.
        $image->scaleDown(width: self::MAX_DIMENSION, height: self::MAX_DIMENSION);

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
