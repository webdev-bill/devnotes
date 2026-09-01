<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

// Defense in depth: never trust the client's Content-Type header or the
// file's extension. Two independent checks against the real bytes, kept
// separate (not merged into one condition) so a failure is traceable to
// exactly which one caught it.
class GenuineImageContent implements ValidationRule
{
    private const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile) {
            $fail('The :attribute must be an uploaded file.');

            return;
        }

        $realPath = $value->getRealPath();

        if (! $this->passesFinfoSniff($realPath)) {
            $fail("The :attribute's content does not match an allowed image type (jpeg, png, webp).");

            return;
        }

        if (! $this->passesGetimagesizeCheck($realPath)) {
            $fail('The :attribute could not be verified as a valid, decodable image.');
        }
    }

    private function passesFinfoSniff(string $realPath): bool
    {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $sniffedMime = finfo_file($finfo, $realPath);
        finfo_close($finfo);

        return in_array($sniffedMime, self::ALLOWED_MIME_TYPES, true);
    }

    private function passesGetimagesizeCheck(string $realPath): bool
    {
        $info = @getimagesize($realPath);

        return $info !== false && in_array($info['mime'] ?? null, self::ALLOWED_MIME_TYPES, true);
    }
}
