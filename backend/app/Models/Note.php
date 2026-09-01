<?php

namespace App\Models;

use App\Enums\NoteVisibility;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\Storage;

#[Fillable(['title', 'content', 'language', 'visibility'])]
class Note extends Model
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
            'visibility' => NoteVisibility::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function images(): MorphMany
    {
        return $this->morphMany(Image::class, 'imageable');
    }

    public function scopePublic(Builder $query): void
    {
        $query->where('visibility', NoteVisibility::Public);
    }

    protected static function booted(): void
    {
        // A polymorphic relation has no DB-level FK to cascade on delete, so
        // this is the only place that stops a deleted note's images from
        // orphaning both their B2 objects and their images rows.
        static::deleting(function (Note $note) {
            foreach ($note->images as $image) {
                Storage::disk('images')->delete($image->path);
                $image->delete();
            }
        });
    }
}
