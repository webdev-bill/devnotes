<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteSettings;

// Public, read-only — the SPA's own client-side Helmet defaults (title,
// meta description, favicon, twitter handle) are built from this. Separate
// class from Api\My\SiteSettingsController (which also allows updating),
// same public/private split as BlogPostController vs Api\My\BlogPostController.
class SiteSettingsController extends Controller
{
    /**
     * @return array<string, mixed>
     */
    public function show(): array
    {
        return SiteSettings::current()->toApiArray();
    }
}
