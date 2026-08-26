<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BlogPostController;
use App\Http\Controllers\Api\My\BlogPostController as MyBlogPostController;
use App\Http\Controllers\Api\My\NoteController as MyNoteController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

// --- Public, read-only. Only ever returns public notes / published posts. ---

Route::get('/notes', [NoteController::class, 'index']);
Route::get('/notes/{note}', [NoteController::class, 'show']);

Route::get('/blog-posts', [BlogPostController::class, 'index']);
Route::get('/blog-posts/{blog_post:slug}', [BlogPostController::class, 'show']);

Route::get('/tags', [TagController::class, 'index']);

// --- Private. Requires a Sanctum token; scoped to the caller's own records. ---

Route::middleware('auth:sanctum')->prefix('my')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('notes', MyNoteController::class);
    Route::apiResource('blog-posts', MyBlogPostController::class);
});
