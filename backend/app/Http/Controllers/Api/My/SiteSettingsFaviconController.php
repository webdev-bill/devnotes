<?php

namespace App\Http\Controllers\Api\My;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSiteAssetRequest;
use App\Models\SiteSettings;
use App\Services\SiteAssetUploadService;

class SiteSettingsFaviconController extends Controller
{
    public function __construct(private readonly SiteAssetUploadService $uploads) {}

    /**
     * Upload (or replace) the site favicon. Fixed paths, overwritten in
     * place — this is a singleton, not a polymorphic per-record image, so
     * there's no old-file bookkeeping to do beyond just overwriting.
     *
     * @return array<string, mixed>
     */
    public function store(StoreSiteAssetRequest $request): array
    {
        $stored = $this->uploads->storeFavicon($request->file('image'));

        $settings = SiteSettings::current();
        $settings->forceFill([
            'favicon_ico_path' => $stored['ico_path'],
            'favicon_png_path' => $stored['png_path'],
        ])->save();

        return $settings->toApiArray();
    }
}
