<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // This app has no web/HTML routes at all — there is no "login" route
        // to redirect a guest to. Without this, Laravel's default guest
        // redirect falls back to `route('login')` whenever a request doesn't
        // send `Accept: application/json` (e.g. a bare curl call or a
        // browser navigating to the URL directly), which throws
        // RouteNotFoundException and surfaces as a 500 instead of a 401.
        $middleware->redirectGuestsTo(fn () => null);

        // Traefik terminates TLS and forwards plain HTTP over the internal
        // Docker network — without this, Laravel never sees the original
        // request was HTTPS, so generated URLs (e.g. pagination links) come
        // back http://. Trusting '*' rather than a pinned network CIDR is
        // safe here specifically because the backend container has no
        // published port (only reachable via Traefik) — same as Postgres.
        // If a port is ever published here (e.g. for debugging), this must
        // be scoped to Traefik's actual network/CIDR instead of '*', or
        // forwarded headers become spoofable from the public internet.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
