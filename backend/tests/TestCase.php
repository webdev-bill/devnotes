<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Refuse to run against anything but a *_test database.
     *
     * Overridden here rather than registered via afterApplicationCreated()
     * because setUpTraits() is what runs RefreshDatabase's migrate:fresh,
     * and afterApplicationCreated callbacks only fire after it returns —
     * too late, the tables would already be gone. The app is booted by this
     * point, so the resolved connection config is final (env, .env and any
     * cached config all applied). getDatabaseName() reads that config
     * without opening a connection, so nothing is sent to the database
     * before the check passes.
     */
    protected function setUpTraits()
    {
        $connection = $this->app['db']->connection();
        $database = (string) $connection->getDatabaseName();

        // Optional _N suffix: `artisan test --parallel` appends a per-process
        // token (devnotes_test_1, devnotes_test_2, ...).
        if (! preg_match('/_test(_\d+)?$/', $database)) {
            throw new RuntimeException(
                "Refusing to run tests against database \"{$database}\" (connection \"{$connection->getName()}\"): "
                .'its name does not end in _test, and RefreshDatabase would drop every table in it. '
                .'Check phpunit.xml (DB_DATABASE must be a <server> entry, see the comment there) '
                .'and run `php artisan config:clear` if config is cached.'
            );
        }

        return parent::setUpTraits();
    }
}
