<?php

namespace App\Http\Controllers\Api\My;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateSiteSettingsRequest;
use App\Models\SiteSettings;

// Singleton resource — no store/destroy, there is exactly one settings row.
class SiteSettingsController extends Controller
{
    /**
     * @return array<string, mixed>
     */
    public function show(): array
    {
        return SiteSettings::current()->toApiArray();
    }

    /**
     * @return array<string, mixed>
     */
    public function update(UpdateSiteSettingsRequest $request): array
    {
        $settings = SiteSettings::current();
        $settings->update($request->safe()->all());

        return $settings->toApiArray();
    }
}
