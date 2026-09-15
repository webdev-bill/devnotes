<?php

namespace App\Http\Requests;

use App\Rules\GenuineImageContent;
use Illuminate\Foundation\Http\FormRequest;

// Shared by the favicon and OG-image (site-wide + per-post) upload
// endpoints — same content validation as StoreImageRequest, just without
// that request's route-model-based authorization (site settings and blog
// post ownership are authorized differently per endpoint; see each
// controller).
class StoreSiteAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'max:5120', new GenuineImageContent],
        ];
    }
}
