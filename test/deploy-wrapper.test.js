'use strict';
// Verify that deploy/scripts/deploy.sh delegates to ovhost with the Sites service and --restart.
//   node test/deploy-wrapper.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const WRAPPER = path.join(__dirname, '..', 'deploy', 'scripts', 'deploy.sh');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sites-deploy-wrapper-'));
const log = path.join(tmp, 'calls.log');
const ovhost = path.join(tmp, 'ovhost');

try {
    fs.writeFileSync(ovhost, `#!/usr/bin/env bash
echo "ovhost $*" >> "${log}"
exit "\${FAKE_EXIT:-0}"
`, { mode: 0o755 });

    function run(args = [], env = {}) {
        fs.rmSync(log, { force: true });
        const r = spawnSync('bash', [WRAPPER, ...args], {
            env: { PATH: process.env.PATH, OVHOST: ovhost, OVHOST_SUDO: '', ...env },
            encoding: 'utf8',
        });
        let calls = [];
        try { calls = fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean); } catch { /* none */ }
        return { code: r.status, out: r.stdout + r.stderr, calls };
    }

    assert.deepStrictEqual(run().calls, ['ovhost deploy sites --restart']);
    assert.deepStrictEqual(run([], { DRY_RUN: '1' }).calls, ['ovhost plan sites --restart']);
    assert.strictEqual(run([], { FAKE_EXIT: '2' }).code, 2, "ovhost's exit code is the wrapper's");
    const invalidArgs = run(['--nope']);
    assert.strictEqual(invalidArgs.code, 1);
    assert.deepStrictEqual(invalidArgs.calls, []);

    const missing = run([], { OVHOST: path.join(tmp, 'missing-ovhost') });
    assert.strictEqual(missing.code, 1);
    assert.match(missing.out, /ovhost not found/);
    assert.deepStrictEqual(missing.calls, []);
    assert.doesNotMatch(fs.readFileSync(WRAPPER, 'utf8'), /legacy/i);

    console.log('deploy wrapper: all checks passed');
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
