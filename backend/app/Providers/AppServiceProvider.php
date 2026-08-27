<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Keyed on email + IP together, not either alone: IP-only would only
        // ever exercise a single vector, and email-only lets an attacker who
        // doesn't know the password lock out the real owner just by
        // hammering their email from anywhere. ->string()->lower() (not
        // Str::lower($request->input('email'))) because this closure runs
        // before LoginRequest's validation — a malformed request with no
        // email field hits this with a missing input, and the fluent helper
        // safely defaults to an empty string instead of risking a type
        // error on null ahead of validation ever getting a chance to run.
        RateLimiter::for('login', function (Request $request) {
            $key = $request->string('email')->lower().'|'.$request->ip();

            return Limit::perMinute(5)->by($key)->response(function (Request $request, array $headers) {
                return response()->json([
                    'message' => "Too many login attempts. Please try again in {$headers['Retry-After']} seconds.",
                ], 429, $headers);
            });
        });
    }
}
