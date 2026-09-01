<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BlogPostController;
use App\Http\Controllers\Api\ImageController;
use App\Http\Controllers\Api\My\BlogPostController as MyBlogPostController;
use App\Http\Controllers\Api\My\BlogPostCoverImageController;
use App\Http\Controllers\Api\My\NoteController as MyNoteController;
use App\Http\Controllers\Api\My\NoteImageController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

// --- Public, read-only. Only ever returns public notes / published posts. ---

Route::get('/notes', [NoteController::class, 'index']);
Route::get('/notes/{note}', [NoteController::class, 'show']);

Route::get('/blog-posts', [BlogPostController::class, 'index']);
Route::get('/blog-posts/{blog_post:slug}', [BlogPostController::class, 'show']);

Route::get('/tags', [TagController::class, 'index']);

// Auth is optional here, resolved manually inside ImageController — a
// published post's cover image must load for a signed-out visitor, while a
// private note's image still needs the owner's token. See ImageController.
Route::get('/images/{image}', [ImageController::class, 'show']);

// --- Private. Requires a Sanctum token; scoped to the caller's own records. ---

Route::middleware('auth:sanctum')->prefix('my')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('notes', MyNoteController::class);
    Route::apiResource('blog-posts', MyBlogPostController::class);

    Route::post('/notes/{note}/images', [NoteImageController::class, 'store']);
    Route::post('/blog-posts/{blog_post}/cover-image', [BlogPostCoverImageController::class, 'store']);
    Route::delete('/blog-posts/{blog_post}/cover-image', [BlogPostCoverImageController::class, 'destroy']);
});
