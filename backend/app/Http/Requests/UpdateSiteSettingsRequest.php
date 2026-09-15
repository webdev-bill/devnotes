<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSiteSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Single-admin app, same reasoning as StoreBlogPostRequest — any
        // authenticated user may update the one site-wide settings row.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'site_title' => ['required', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            // Stored without the leading @ — rendered with one added back in
            // the twitter:site meta tag.
            'twitter_handle' => ['nullable', 'string', 'max:15', 'regex:/^[A-Za-z0-9_]+$/'],
        ];
    }
}
