<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Support\Facades\Storage;

#[Fillable(['title', 'slug', 'content', 'published_at'])]
class BlogPost extends Model
{
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Not exposed via Fillable — cover_image_path is only ever written by
    // BlogPostCoverImageController, never mass-assignable from the regular
    // update endpoint, same boundary as user_id.
    public function coverImage(): MorphOne
    {
        return $this->morphOne(Image::class, 'imageable');
    }

    /**
     * Look posts up by slug in route model binding.
     */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function scopePublished(Builder $query): void
    {
        $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    protected static function booted(): void
    {
        // A polymorphic relation has no DB-level FK to cascade on delete, so
        // this is the only place that stops a deleted post's cover image
        // from orphaning both its B2 object and its images row.
        static::deleting(function (BlogPost $blogPost) {
            if ($image = $blogPost->coverImage) {
                Storage::disk('images')->delete($image->path);
                $image->delete();
            }
        });
    }
}
