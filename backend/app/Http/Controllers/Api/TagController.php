<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Collection;

class TagController extends Controller
{
    /**
     * List all tags.
     */
    public function index(): Collection
    {
        return Tag::query()->orderBy('name')->get();
    }
}
