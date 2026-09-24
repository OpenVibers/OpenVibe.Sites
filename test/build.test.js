'use strict';
// OpenVibe.Sites: the built placeholders are current, complete and honest.
//   node test/build.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// dist/ and the vhosts must match sites.json + build.js (deploy serves dist/ as committed).
execFileSync(process.execPath, [path.join(ROOT, 'build.js'), '--check'], { stdio: 'pipe' });

// Pricing copy is never used on the network (no "free"/"$0"/"no ads" claims); "free speech" is fine.
const PRICING = /\$0\b|\bfor free\b|\bfree (forever|to use|of charge|plan|tier)\b|\bno ads\b|\bad-free\b/i;
// Claims no OpenVibe service makes good on (2026-09-24 audit): Host serves static files only (Stage C,
// running user code, is not started) and handles neither DNS nor logs for anyone.
const UNBACKED = /handled for you|host your (bot|mod)|bots,? (and|&amp;|&) mods hosting|\bservice hosting\b/i;

let pages = 0;
for (const site of catalog.sites) {
    const d = site.domain;
    const html = read(`dist/${d}/index.html`);
    pages++;
    assert.match(html, /<title>[^<]+<\/title>/, `${d}: title`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://${d.replace(/\./g, '\\.')}/?"`), `${d}: canonical`);
    assert.match(html, /placeholder/i, `${d}: says it is a placeholder (never claim a product is live)`);
    assert.doesNotMatch(html, PRICING, `${d}: pricing copy`);
    assert.doesNotMatch(html, UNBACKED, `${d}: claims a hosting product that does not exist`);
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        assert.doesNotThrow(() => JSON.parse(m[1]), `${d}: JSON-LD parses`);
    }
    for (const f of ['robots.txt', 'sitemap.xml', 'manifest.webmanifest']) {
        assert.ok(fs.existsSync(path.join(ROOT, 'dist', d, f)), `${d}: ${f}`);
    }
    const conf = read(`deploy/nginx/${d}.conf`);
    assert.ok(conf.includes(`server_name ${d}`), `${d}: vhost server_name`);
    assert.ok(conf.includes(`root /opt/openvibe.sites/dist/${d};`), `${d}: vhost root`);
}

// Labels come from facts (facts.json: each repository's STATUS.json + the Network registry), never a
// hand-kept list: a product whose code exists is never "charter only", and a product that runs says
// what its public launch waits for (roadmap §32.7 launch rule, §32.10).
const facts = JSON.parse(read('facts.json'));
const NO_CODE = /charter only|no code yet/i;
for (const site of catalog.sites) {
    if (!site.plannedRepo) continue;
    const d = site.domain;
    const f = facts.repos[site.plannedRepo];
    assert.ok(f, `${d}: facts.json has a row for ${site.plannedRepo} (node scripts/facts.js)`);
    const html = read(`dist/${d}/index.html`);
    const status = JSON.parse(read(`dist/${d}/status.json`));
    const st = f.status || {}; const rg = f.registry || {};
    const hasCode = st.code === true || ['live', 'internal'].includes(rg.state);
    if (hasCode) {
        assert.doesNotMatch(html, NO_CODE, `${d}: ${site.plannedRepo} has code, so the page never says "charter only, no code yet"`);
        assert.notStrictEqual(status.repoStage, 'charter-only', `${d}: status.json repoStage`);
    }
    const runs = rg.state === 'internal' || (st.code === true && st.deployed === true);
    if (runs && st.stage !== 'closed' && rg.state !== 'live') {
        assert.ok(site.launch, `${d}: the service runs, so sites.json says what its public launch waits for ("launch")`);
        assert.ok(html.includes(`The public launch is waiting for ${site.launch.replace(/'/g, '&#39;')}.`), `${d}: the page says what the launch waits for`);
        assert.match(html, /in development/, `${d}: labelled in development`);
        assert.strictEqual(status.repoStage, 'service-running', `${d}: status.json repoStage`);
        assert.strictEqual(status.launchWaitsFor, site.launch, `${d}: status.json launchWaitsFor`);
    }
    if (rg.state === 'live' && rg.public_site === 'service') {
        assert.ok(html.includes(`href="${rg.origin}/"`), `${d}: links the live service ${rg.origin}`);
        assert.strictEqual(status.repoStage, 'surface-of-a-live-service', `${d}: status.json repoStage`);
    }
}
// facts.json is current with the sibling checkouts when they are here (CI has none; skip there).
const REPOS_DIR = process.env.OPENVIBERS_DIR || path.join(ROOT, '..');
for (const [repo, f] of Object.entries(facts.repos)) {
    const dir = path.join(REPOS_DIR, repo);
    if (!fs.existsSync(path.join(dir, '.git')) || !f.status) continue;
    let s;
    try { s = JSON.parse(execFileSync('git', ['-C', dir, 'show', 'HEAD:STATUS.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { continue; }
    assert.strictEqual(f.status.stage, s.stage || null, `${repo}: STATUS.json stage changed; run node scripts/facts.js and rebuild`);
    assert.strictEqual(f.status.code, s.code === true, `${repo}: STATUS.json code changed; run node scripts/facts.js and rebuild`);
}

// A domain that a real service answers is never also a placeholder here (roadmap 7.2 rule 8).
const LIVE_SERVICES = ['events.openvibe.network', 'billing.openvibe.network', 'openvibe.wiki', 'openvibe.blog', 'openvibe.codes', 'openvibe.community', 'openvibe.live', 'openvibe.media', 'openvibe.tools', 'openvibe.network'];
for (const d of LIVE_SERVICES) {
    assert.ok(!catalog.sites.some((s) => s.domain === d), `${d} is a running service and must not have a placeholder`);
}
console.log(`sites build: ${pages} placeholder pages current, honest and complete`);
