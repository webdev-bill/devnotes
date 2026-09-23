<?php

namespace Tests\Feature;

use Tests\TestCase;

// Temporary: proves a failing suite stops the deploy job in CI. Reverted in
// the very next commit — see the runbook's "CI Test Gate" entry.
class CiGateProbeTest extends TestCase
{
    public function test_deliberate_failure_to_prove_ci_blocks_deploy(): void
    {
        $this->fail('Deliberate failure: a red suite must never reach the Droplet.');
    }
}
