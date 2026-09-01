<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

// imageable_type/imageable_id are deliberately excluded from fillable — like
// user_id on Note/BlogPost, ownership is only ever set via the owning model's
// relation ($note->images()->create(...)), never mass-assigned from a request.
#[Fillable(['path', 'mime_type', 'size'])]
// path is the raw B2 object key — never serialized to the frontend, which
// only ever needs the image's id to build /api/images/{id}.
#[Hidden(['path'])]
class Image extends Model
{
    public function imageable(): MorphTo
    {
        return $this->morphTo();
    }
}
