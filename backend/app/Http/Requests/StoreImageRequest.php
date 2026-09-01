<?php

namespace App\Http\Requests;

use App\Rules\GenuineImageContent;
use Illuminate\Foundation\Http\FormRequest;

// Shared by both image-upload endpoints (note inline images, blog post cover
// image) — validation is identical; only the owning model (and therefore the
// authorization check) differs, resolved generically from whichever route
// param is present.
class StoreImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $imageable = $this->route('note') ?? $this->route('blog_post');

        return $imageable !== null && $this->user()->can('update', $imageable);
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
