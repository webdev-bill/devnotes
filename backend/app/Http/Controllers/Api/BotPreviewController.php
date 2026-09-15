<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\SiteSettings;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Bot-only, read-only, narrow rendering path — NOT a general SSR mode. Only
// ever reached via frontend/nginx.conf's User-Agent-triggered internal
// proxy (real browsers never hit this route), but safe to be reachable
// directly too: it's public, read-only, and exposes strictly a subset of
// what BlogPostController@show already exposes for a published post (same
// published() scope — never leaks a draft's title/description to a
// crawler). See docs/server-setup-runbook.md for why this path exists at
// all (social crawlers don't execute JavaScript).
class BotPreviewController extends Controller
{
    public function show(Request $request, ?string $path = null): Response
    {
        $settings = SiteSettings::current();
        $path = trim($path ?? '', '/');

        $post = null;
        if (str_starts_with($path, 'blog/')) {
            $slug = substr($path, strlen('blog/'));
            $post = BlogPost::query()->published()->where('slug', $slug)->first();
        }

        return response()->view('bot-preview', [
            'title' => $post?->meta_title ?? $post?->title ?? $settings->site_title,
            'description' => $post?->meta_description ?? $settings->meta_description,
            'ogImage' => $post ? $post->og_image_url : $settings->ogImageUrl(),
            'canonicalUrl' => $request->getSchemeAndHttpHost().'/'.$path,
            'siteTitle' => $settings->site_title,
            'twitterHandle' => $settings->twitter_handle,
            'type' => $post ? 'article' : 'website',
        ])->header('Content-Type', 'text/html; charset=UTF-8');
    }
}
