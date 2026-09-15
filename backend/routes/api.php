<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BlogPostController;
use App\Http\Controllers\Api\BotPreviewController;
use App\Http\Controllers\Api\ImageController;
use App\Http\Controllers\Api\My\BlogPostController as MyBlogPostController;
use App\Http\Controllers\Api\My\BlogPostCoverImageController;
use App\Http\Controllers\Api\My\BlogPostOgImageController;
use App\Http\Controllers\Api\My\NoteController as MyNoteController;
use App\Http\Controllers\Api\My\NoteImageController;
use App\Http\Controllers\Api\My\SiteSettingsController as MySiteSettingsController;
use App\Http\Controllers\Api\My\SiteSettingsFaviconController;
use App\Http\Controllers\Api\My\SiteSettingsOgImageController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\SiteSettingsController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

// --- Public, read-only. Only ever returns public notes / published posts. ---

Route::get('/notes', [NoteController::class, 'index']);
Route::get('/notes/{note}', [NoteController::class, 'show']);

Route::get('/blog-posts', [BlogPostController::class, 'index']);
Route::get('/blog-posts/{blog_post:slug}', [BlogPostController::class, 'show']);

Route::get('/tags', [TagController::class, 'index']);

Route::get('/site-settings', [SiteSettingsController::class, 'show']);

// Auth is optional here, resolved manually inside ImageController — a
// published post's cover image must load for a signed-out visitor, while a
// private note's image still needs the owner's token. See ImageController.
Route::get('/images/{image}', [ImageController::class, 'show']);

// Bot-only, read-only static <head> renderer for social-media crawlers —
// never linked to by the SPA, only ever reached via frontend/nginx.conf's
// User-Agent-triggered internal proxy. Public and safe to hit directly too:
// it exposes strictly a subset of what /blog-posts/{slug} already exposes
// for a published post. See docs/server-setup-runbook.md.
Route::get('/bot-preview/{path?}', [BotPreviewController::class, 'show'])->where('path', '.*');

// --- Private. Requires a Sanctum token; scoped to the caller's own records. ---

Route::middleware('auth:sanctum')->prefix('my')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('notes', MyNoteController::class);
    Route::apiResource('blog-posts', MyBlogPostController::class);

    Route::post('/notes/{note}/images', [NoteImageController::class, 'store']);
    Route::post('/blog-posts/{blog_post}/cover-image', [BlogPostCoverImageController::class, 'store']);
    Route::delete('/blog-posts/{blog_post}/cover-image', [BlogPostCoverImageController::class, 'destroy']);
    Route::post('/blog-posts/{blog_post}/og-image', [BlogPostOgImageController::class, 'store']);
    Route::delete('/blog-posts/{blog_post}/og-image', [BlogPostOgImageController::class, 'destroy']);

    Route::get('/settings', [MySiteSettingsController::class, 'show']);
    Route::put('/settings', [MySiteSettingsController::class, 'update']);
    Route::post('/settings/favicon', [SiteSettingsFaviconController::class, 'store']);
    Route::post('/settings/og-image', [SiteSettingsOgImageController::class, 'store']);
    Route::delete('/settings/og-image', [SiteSettingsOgImageController::class, 'destroy']);
});
