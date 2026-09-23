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

let pages = 0;
for (const site of catalog.sites) {
    const d = site.domain;
    const html = read(`dist/${d}/index.html`);
    pages++;
    assert.match(html, /<title>[^<]+<\/title>/, `${d}: title`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://${d.replace(/\./g, '\\.')}/?"`), `${d}: canonical`);
    assert.match(html, /placeholder/i, `${d}: says it is a placeholder (never claim a product is live)`);
    assert.doesNotMatch(html, PRICING, `${d}: pricing copy`);
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

// A domain that a real service answers is never also a placeholder here (roadmap 7.2 rule 8).
const LIVE_SERVICES = ['events.openvibe.network', 'openvibe.community', 'openvibe.live', 'openvibe.media', 'openvibe.tools', 'openvibe.network'];
for (const d of LIVE_SERVICES) {
    assert.ok(!catalog.sites.some((s) => s.domain === d), `${d} is a running service and must not have a placeholder`);
}
console.log(`sites build: ${pages} placeholder pages current, honest and complete`);
