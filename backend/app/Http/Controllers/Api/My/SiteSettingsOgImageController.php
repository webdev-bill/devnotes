<?php

namespace App\Http\Controllers\Api\My;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSiteAssetRequest;
use App\Models\SiteSettings;
use App\Services\SiteAssetUploadService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class SiteSettingsOgImageController extends Controller
{
    private const PATH = 'og/default.jpg';

    public function __construct(private readonly SiteAssetUploadService $uploads) {}

    /**
     * Upload (or replace) the site-wide default OG image. Fixed,
     * deterministic path, overwritten in place — same reasoning as the
     * favicon controller.
     *
     * @return array<string, mixed>
     */
    public function store(StoreSiteAssetRequest $request): array
    {
        $this->uploads->storeOgImage($request->file('image'), self::PATH);

        $settings = SiteSettings::current();
        $settings->forceFill(['og_image_path' => self::PATH])->save();

        return $settings->toApiArray();
    }

    public function destroy(): Response
    {
        $settings = SiteSettings::current();

        if ($settings->og_image_path) {
            Storage::disk('public')->delete($settings->og_image_path);
            $settings->forceFill(['og_image_path' => null])->save();
        }

        return response()->noContent();
    }
}
