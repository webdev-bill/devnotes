<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

// Single-row table — there is exactly one settings record, id=1, lazily
// created on first access via current(). No user_id/ownership: this is
// site-wide configuration, not a per-account resource.
#[Fillable(['site_title', 'meta_description', 'twitter_handle'])]
class SiteSettings extends Model
{
    protected $table = 'site_settings';

    // Not exposed via Fillable — these are only ever written by their
    // respective upload controllers (SiteSettingsFaviconController,
    // SiteSettingsOgImageController), same boundary as
    // BlogPost::cover_image_path.
    public function ogImageUrl(): ?string
    {
        return $this->og_image_path ? Storage::disk('public')->url($this->og_image_path) : null;
    }

    public function faviconIcoUrl(): ?string
    {
        return $this->favicon_ico_path ? Storage::disk('public')->url($this->favicon_ico_path) : null;
    }

    public function faviconPngUrl(): ?string
    {
        return $this->favicon_png_path ? Storage::disk('public')->url($this->favicon_png_path) : null;
    }

    /**
     * The one and only settings row, created with sane defaults the first
     * time anything asks for it — no seeder, no separate "setup" step.
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1], ['site_title' => config('app.name')]);
    }

    /**
     * Shape returned to both the public settings endpoint (consumed by the
     * SPA's Helmet defaults) and the dashboard — computed URLs, never raw
     * storage disk paths, since nothing client-side has any use for the
     * latter and every field here is meant to be publicly visible anyway
     * (it's what ends up in publicly-rendered meta tags).
     *
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'site_title' => $this->site_title,
            'meta_description' => $this->meta_description,
            'twitter_handle' => $this->twitter_handle,
            'og_image_url' => $this->ogImageUrl(),
            'favicon_ico_url' => $this->faviconIcoUrl(),
            'favicon_png_url' => $this->faviconPngUrl(),
        ];
    }
}
