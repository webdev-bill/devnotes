<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_correct_credentials_returns_a_working_token(): void
    {
        $user = User::factory()->create(['email' => 'owner@example.com']);

        $response = $this->postJson('/api/login', ['email' => 'owner@example.com', 'password' => 'password']);

        $response->assertOk()->assertJsonStructure(['token']);
        $this->assertSame(1, $user->tokens()->count());

        $this->withToken($response->json('token'))->getJson('/api/my/notes')->assertOk();
    }

    public function test_login_with_wrong_password_returns_401_json(): void
    {
        User::factory()->create(['email' => 'owner@example.com']);

        $this->postJson('/api/login', ['email' => 'owner@example.com', 'password' => 'wrong'])
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'The provided credentials are incorrect.']);
    }

    public function test_login_with_unknown_email_returns_the_same_401_as_a_wrong_password(): void
    {
        $this->postJson('/api/login', ['email' => 'nobody@example.com', 'password' => 'password'])
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'The provided credentials are incorrect.']);
    }

    public function test_logout_revokes_the_token_used_for_the_request(): void
    {
        User::factory()->create(['email' => 'owner@example.com']);
        $token = $this->postJson('/api/login', ['email' => 'owner@example.com', 'password' => 'password'])->json('token');

        $this->withToken($token)->postJson('/api/my/logout')->assertNoContent();
        $this->assertDatabaseCount('personal_access_tokens', 0);

        // Sanctum's guard remembers the user it resolved for the lifetime of
        // the app instance, and a feature test reuses one app across
        // requests. Without this reset the next request would be authorized
        // from that in-memory cache and pass even if the token were still
        // valid — i.e. the assertion below would prove nothing.
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/my/notes')->assertUnauthorized();
    }

    public function test_logout_leaves_the_users_other_tokens_valid(): void
    {
        $user = User::factory()->create();
        $current = $user->createToken('laptop')->plainTextToken;
        $other = $user->createToken('phone')->plainTextToken;

        $this->withToken($current)->postJson('/api/my/logout')->assertNoContent();
        $this->app['auth']->forgetGuards();

        $this->withToken($current)->getJson('/api/my/notes')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken($other)->getJson('/api/my/notes')->assertOk();
    }

    /**
     * Regression test for the redirectGuestsTo(fn () => null) fix in
     * bootstrap/app.php: without it, any unauthenticated request that
     * doesn't ask for JSON made Laravel redirect to route('login'), which
     * doesn't exist in this API-only app → RouteNotFoundException → 500.
     */
    #[DataProvider('acceptHeaders')]
    public function test_unauthenticated_my_routes_return_401_json_regardless_of_accept_header(array $headers): void
    {
        foreach ([['GET', '/api/my/notes'], ['POST', '/api/my/blog-posts'], ['POST', '/api/my/logout']] as [$method, $uri]) {
            // Headers passed straight to call() as server vars: call() does
            // NOT apply withHeaders() (only get()/post()/json() merge those
            // in), which silently turned every data set into the default
            // text/html case — caught by the mutation check in the runbook.
            $response = $this->call($method, $uri, server: $this->transformHeadersToServerVars($headers));

            $response->assertUnauthorized();
            $this->assertSame('application/json', $response->headers->get('Content-Type'), "{$method} {$uri}");
            $this->assertSame('Unauthenticated.', $response->json('message'), "{$method} {$uri}");
        }
    }

    public static function acceptHeaders(): array
    {
        return [
            // Symfony's test request defaults to a browser-style text/html
            // Accept header — the "browser navigates to the URL" case.
            'no Accept header set (framework default, text/html)' => [[]],
            'bare curl (Accept: */*)' => [['Accept' => '*/*']],
            'Accept: application/json' => [['Accept' => 'application/json']],
        ];
    }

    public function test_login_is_throttled_after_five_failed_attempts(): void
    {
        User::factory()->create(['email' => 'owner@example.com']);

        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/login', ['email' => 'owner@example.com', 'password' => 'wrong'])
                ->assertUnauthorized();
        }

        $this->postJson('/api/login', ['email' => 'owner@example.com', 'password' => 'wrong'])
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonPath('message', fn (string $message) => str_starts_with($message, 'Too many login attempts.'));

        // The limiter sits in front of the controller, so once tripped even
        // the correct password is refused until the window resets.
        $this->postJson('/api/login', ['email' => 'owner@example.com', 'password' => 'password'])
            ->assertStatus(429);
    }

    public function test_login_throttle_is_keyed_per_email_not_per_ip_alone(): void
    {
        User::factory()->create(['email' => 'target@example.com']);
        User::factory()->create(['email' => 'bystander@example.com']);

        for ($i = 1; $i <= 6; $i++) {
            $this->postJson('/api/login', ['email' => 'target@example.com', 'password' => 'wrong']);
        }

        // Same IP, different email: not locked out by someone hammering
        // another account (the AppServiceProvider limiter's email|ip key).
        $this->postJson('/api/login', ['email' => 'bystander@example.com', 'password' => 'password'])
            ->assertOk();
    }

    public function test_login_throttle_resets_after_the_one_minute_window(): void
    {
        User::factory()->create(['email' => 'owner@example.com']);

        for ($i = 1; $i <= 6; $i++) {
            $this->postJson('/api/login', ['email' => 'owner@example.com', 'password' => 'wrong']);
        }
        $this->postJson('/api/login', ['email' => 'owner@example.com', 'password' => 'password'])->assertStatus(429);

        $this->travel(61)->seconds();

        $this->postJson('/api/login', ['email' => 'owner@example.com', 'password' => 'password'])->assertOk();
    }
}
