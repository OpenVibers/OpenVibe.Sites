'use strict';
// deploy/scripts/deploy.sh is a thin wrapper around `ovhost deploy sites --restart` (OpenVibe.Host,
// strategy static-build; roadmap WS-N task 11) with deploy-legacy.sh (the previous script, unchanged) as
// its fallback, which still pulls first. A fake ovhost records what the wrapper asks for; the fallback
// runs against a temp checkout with a real git origin.
//   node test/deploy-wrapper.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const WRAPPER = path.join(__dirname, '..', 'deploy', 'scripts', 'deploy.sh');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sites-deploy-wrapper-'));
const log = path.join(tmp, 'calls.log');
const sh = (cmd) => execFileSync('bash', ['-c', cmd], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const ovhost = path.join(tmp, 'ovhost');
fs.writeFileSync(ovhost, `#!/usr/bin/env bash
if [ "$1" = capabilities ]; then
  [ -n "$FAKE_OLD" ] && exit 1
  printf '%b\\n' "\${FAKE_CAPS:-ovhost=0.3.0\\ndeploy-api=1\\nservice=sites\\nstrategy=static-build\\nmanaged=yes\\nlayout=git}"
  exit 0
fi
echo "ovhost $*" >> "${log}"
exit "\${FAKE_EXIT:-0}"
`, { mode: 0o755 });
const legacy = path.join(tmp, 'legacy.sh');
fs.writeFileSync(legacy, `#!/usr/bin/env bash\necho "legacy at $(git -C "$REPO" log -1 --format=%s) dist=$(cat "$REPO/dist/x/index.html")" >> "${log}"\n`, { mode: 0o755 });

// A checkout with an origin that is one commit ahead, and a dist/ the last build left dirty.
const origin = path.join(tmp, 'origin.git');
const work = path.join(tmp, 'work');
const repo = path.join(tmp, 'repo');
sh(`git init -q --bare -b main "${origin}" && git init -q -b main "${work}" && cd "${work}" && git config user.email t@t && git config user.name t && mkdir -p dist/x && echo v1 > dist/x/index.html && git add -A && git commit -qm v1 && git remote add origin "${origin}" && git push -q origin main`);
sh(`git clone -q "${origin}" "${repo}" && cd "${work}" && echo v2 > dist/x/index.html && git commit -qam v2 && git push -q origin main`);
fs.writeFileSync(path.join(repo, 'dist', 'x', 'index.html'), 'v1 rebuilt on the host\n');

function run(args = [], env = {}) {
    fs.rmSync(log, { force: true });
    const r = spawnSync('bash', [WRAPPER, ...args], { env: { PATH: process.env.PATH, HOME: tmp, OVHOST: ovhost, OVHOST_SUDO: '', DEPLOY_LEGACY: legacy, REPO: repo, ...env }, encoding: 'utf8' });
    let calls = [];
    try { calls = fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean); } catch { /* none */ }
    return { code: r.status, out: r.stdout + r.stderr, calls };
}

assert.deepStrictEqual(run().calls, ['ovhost deploy sites --restart'], 'rebuild and reinstall every run, as before');
assert.deepStrictEqual(run([], { DRY_RUN: '1' }).calls, ['ovhost plan sites --restart']);
assert.strictEqual(run([], { FAKE_EXIT: '2' }).code, 2, "ovhost's exit code is the wrapper's (2: nginx -t failed, nothing reloaded)");
assert.strictEqual(run(['--nope']).code, 1);

let r = run([], { FAKE_CAPS: 'deploy-api=1\\nstrategy=git-checkout\\nmanaged=yes' });
assert.match(r.out, /does not deploy sites with strategy static-build \(git-checkout\)/);
assert.deepStrictEqual(r.calls, ['legacy at v2 dist=v2'], 'the fallback restores dist/ and pulls before the legacy script runs');
r = run([], { OVHOST_LEGACY: '1', DRY_RUN: '1' });
assert.strictEqual(r.code, 1, 'the legacy script has no DRY_RUN: nothing runs');
r = run([], { FAKE_OLD: '1' });
assert.deepStrictEqual(r.calls, ['legacy at v2 dist=v2']);
assert.match(fs.readFileSync(WRAPPER, 'utf8'), /^set -euo pipefail$/m);
assert.strictEqual(fs.readFileSync(path.join(__dirname, '..', 'deploy', 'scripts', 'deploy-legacy.sh'), 'utf8').includes('sudo nginx -t && sudo systemctl reload nginx'), true, 'deploy-legacy.sh is the previous script: nginx -t gates the reload');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('deploy wrapper: all checks passed');
