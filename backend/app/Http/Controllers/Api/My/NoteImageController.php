<?php

namespace App\Http\Controllers\Api\My;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreImageRequest;
use App\Models\Image;
use App\Models\Note;
use App\Services\ImageUploadService;

class NoteImageController extends Controller
{
    public function __construct(private readonly ImageUploadService $imageUploads) {}

    /**
     * Upload an inline image for one of the authenticated user's notes.
     * Returns the created Image so the frontend can build the
     * /api/images/{id} URL to insert into the note's markdown content.
     */
    public function store(StoreImageRequest $request, Note $note): Image
    {
        // Authorization already checked by StoreImageRequest::authorize().
        $stored = $this->imageUploads->store($request->file('image'));

        return $note->images()->create($stored);
    }
}
