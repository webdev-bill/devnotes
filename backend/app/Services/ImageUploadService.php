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
