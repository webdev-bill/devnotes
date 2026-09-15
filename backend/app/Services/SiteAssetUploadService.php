<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;

// Site-wide assets (favicon, OG images) go on the `public` disk (storage:link),
// not the `images` B2 disk that note/blog-post images use — these need to be
// reachable at a stable, direct URL without going through ImageController's
// auth resolution, and need to survive without a redeploy the moment they're
// uploaded. Separate from ImageUploadService because the output formats and
// disk both differ from that service's WebP-to-B2 pipeline.
class SiteAssetUploadService
{
    private const FAVICON_ICO_SIZE = 32;

    private const FAVICON_PNG_SIZE = 512;

    private const OG_IMAGE_WIDTH = 1200;

    private const OG_IMAGE_HEIGHT = 630;

    private const OG_IMAGE_QUALITY = 80;

    private readonly ImageManager $manager;

    public function __construct()
    {
        // autoOrientation: false — see ImageUploadService for why this must
        // run before any resize, not as part of decode. Same fix applies here.
        $this->manager = ImageManager::gd(autoOrientation: false);
    }

    /**
     * Decode the uploaded image once and derive both a standalone PNG and a
     * minimal single-image .ico from it — never from the raw upload bytes.
     * GD (the only image driver installed in this project) cannot decode or
     * encode true .ico format, so the .ico is hand-built: a 6-byte ICONDIR
     * header + a 16-byte ICONDIRENTRY + a PNG payload, which is valid ICO
     * format since Windows Vista and supported by every current browser.
     *
     * @return array{ico_path: string, png_path: string}
     */
    public function storeFavicon(UploadedFile $file): array
    {
        $source = $this->manager->read($file->getRealPath());
        $source->scaleDown(width: 2048, height: 2048);
        $source->orient();

        $icoPng = (clone $source)->cover(self::FAVICON_ICO_SIZE, self::FAVICON_ICO_SIZE)->toPng();
        $standalonePng = (clone $source)->cover(self::FAVICON_PNG_SIZE, self::FAVICON_PNG_SIZE)->toPng();

        $icoBytes = $this->wrapPngAsIco((string) $icoPng, self::FAVICON_ICO_SIZE);

        $icoPath = 'favicon/favicon.ico';
        $pngPath = 'favicon/favicon.png';

        Storage::disk('public')->put($icoPath, $icoBytes);
        Storage::disk('public')->put($pngPath, (string) $standalonePng);

        return ['ico_path' => $icoPath, 'png_path' => $pngPath];
    }

    /**
     * Decode, crop-to-fill the standard 1200x630 OG aspect ratio, and
     * re-encode as JPEG (not this project's usual WebP — see
     * docs/server-setup-runbook.md: social-preview fetchers have a real
     * history of inconsistent WebP support, and a broken preview image
     * defeats the point of this whole feature).
     */
    public function storeOgImage(UploadedFile $file, string $path): string
    {
        $image = $this->manager->read($file->getRealPath());
        $image->scaleDown(width: 2400, height: 2400);
        $image->orient();
        $image->cover(self::OG_IMAGE_WIDTH, self::OG_IMAGE_HEIGHT);

        $encoded = $image->toJpeg(quality: self::OG_IMAGE_QUALITY);

        Storage::disk('public')->put($path, (string) $encoded);

        return $path;
    }

    /**
     * Wrap a single PNG image as a minimal valid .ico container.
     * Layout: ICONDIR (reserved=0, type=1 "icon", count=1) + one
     * ICONDIRENTRY (width, height, colorCount=0, reserved=0, planes=1,
     * bitCount=32, byte size of the PNG, offset=22 i.e. right after these
     * two fixed-size headers) + the raw PNG bytes.
     */
    private function wrapPngAsIco(string $pngData, int $size): string
    {
        $header = pack('vvv', 0, 1, 1);
        $entry = pack('CCCCvvVV', $size, $size, 0, 0, 1, 32, strlen($pngData), 22);

        return $header.$entry.$pngData;
    }
}
