'use strict';
// The two notices are current, while product pages stay frozen.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const notices = require('../notices.json');
const frozen = require('../frozen.json');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

assert.strictEqual(require('../build.js').check(), 0, 'generated notice files are current');
assert.doesNotMatch(read('build.js'), /repoFacts|visionViz|facts\.json|sites\.json/, 'builder has no product generator dependencies');
assert.doesNotMatch(read('scripts/facts.js'), /facts\.json|sites\.json/, 'retired snapshot script has no catalog inputs');

assert.deepStrictEqual(notices.map(n => n.domain), [
    'realtime.openvibe.network', 'status.openvibe.network',
]);
assert.strictEqual(new Set(frozen).size, frozen.length, 'frozen domains are unique');
assert.strictEqual(frozen.length, 27, 'all 27 product domains are frozen');
// OpenVibe.AI serves ai.openvibe.services itself and ai.openvibe.network answers 301 to it since 2026-10-07 (AI#23).
assert.ok(!frozen.includes('ai.openvibe.services') && !exists('dist/ai.openvibe.services') && !exists('dist/ai.openvibe.network') && !exists('deploy/nginx/ai.openvibe.services.conf') && !exists('deploy/nginx/ai.openvibe.network.conf'), 'OpenVibe.AI owns both AI addresses');
// OpenVibe.Events serves openvibe.events itself since 2026-10-07 (its own vhost; Events#16).
assert.ok(!frozen.includes('openvibe.events') && !exists('dist/openvibe.events') && !exists('deploy/nginx/openvibe.events.conf'), 'Events owns openvibe.events');
assert.ok(!frozen.includes('openvibe.host') && !exists('dist/openvibe.host') && !exists('deploy/nginx/openvibe.host.conf'), 'OpenVibe.Host owns openvibe.host');
const active = new Set(notices.map(n => n.domain));
for (const domain of frozen) {
    assert.ok(!active.has(domain), `${domain}: product is not a notice`);
    assert.ok(exists(`dist/${domain}/index.html`), `${domain}: frozen front page`);
    assert.ok(exists(`deploy/nginx/${domain}.conf`), `${domain}: frozen vhost`);
}
assert.ok(!exists('deploy/nginx/openvibe.bot.conf'), 'Bot owns its vhost');
// OpenVibe.Bot serves its own front page, robots.txt, release.json and status.json (OpenVibe.Bot#34,
// 2026-10-07); Sites keeps only the legal pages, 404 page, sitemap and manifest for openvibe.bot.
assert.deepStrictEqual(fs.readdirSync(path.join(ROOT, 'dist/openvibe.bot')).sort(),
    ['404.html', 'dmca.html', 'manifest.webmanifest', 'privacy.html', 'sitemap.xml', 'terms.html'],
    'openvibe.bot holds only its legal pages, 404, sitemap and manifest (Bot#34)');
assert.ok(!exists('dist/openvibe.bot/index.html'), 'openvibe.bot has no Sites front page (Bot#34)');
// A frozen placeholder never claims a product is live, never uses pricing copy (no "free"/"$0"/"no ads"; "free
// speech" is fine) and never offers hosting no OpenVibe service provides (2026-09-24 audit).
const PRICING = /\$0\b|\bfor free\b|\bfree (forever|to use|of charge|plan|tier)\b|\bno ads\b|\bad-free\b/i;
const UNBACKED = /handled for you|host your (bot|mod)|bots,? (and|&amp;|&) mods hosting|\bservice hosting\b/i;
for (const domain of frozen) {
    const html = read(`dist/${domain}/index.html`);
    assert.ok(html.includes('this page is a placeholder, nothing here is live yet'), `${domain}: says it is a placeholder`);
    assert.doesNotMatch(html, PRICING, `${domain}: pricing copy`);
    assert.doesNotMatch(html, UNBACKED, `${domain}: claims a hosting product that does not exist`);
}
for (const domain of ['openvibe.actor']) {
    assert.ok(frozen.includes(domain), `${domain}: remains frozen`);
    assert.match(read(`dist/${domain}/index.html`), /<meta name="robots" content="index, follow, max-image-preview:large">/, `${domain}: original indexing`);
    assert.strictEqual(JSON.parse(read(`dist/${domain}/status.json`)).stage, 'placeholder', `${domain}: lifecycle stage`);
    assert.strictEqual(JSON.parse(read(`dist/${domain}/release.json`)).kind, 'placeholder', `${domain}: release kind`);
    assert.ok(exists(`dist/${domain}/sitemap.xml`), `${domain}: frozen sitemap`);
    assert.ok(read(`dist/${domain}/robots.txt`).includes(`Sitemap: https://${domain}/sitemap.xml`), `${domain}: sitemap advertised`);
}

for (const notice of notices) {
    const d = notice.domain;
    const html = read(`dist/${d}/index.html`);
    assert.match(html, /<meta name="robots" content="noindex(?:, follow)?">/, `${d}: noindex`);
    for (const link of notice.links) assert.ok(html.includes(`href="${link.href}"`), `${d}: destination ${link.href}`);
    for (const file of ['404.html', 'robots.txt', 'manifest.webmanifest', 'status.json', 'release.json']) {
        assert.ok(exists(`dist/${d}/${file}`), `${d}: ${file}`);
    }
    assert.match(read(`dist/${d}/404.html`), /<meta name="robots" content="noindex">/, `${d}: 404 is noindex`);
    assert.ok(read(`dist/${d}/404.html`).includes(`href="https://${d}/"`), `${d}: 404 links home`);
    assert.doesNotMatch(read(`dist/${d}/robots.txt`), /Sitemap:/, `${d}: no sitemap advertised`);
    const release = JSON.parse(read(`dist/${d}/release.json`));
    assert.strictEqual(release.service, notice.tld, `${d}: release service`);
    assert.strictEqual(release.kind, 'notice', `${d}: release kind`);
    assert.match(release.release, /^[0-9a-f]{12}$/, `${d}: release hash`);
    if (notice.vhostOwner) {
        assert.strictEqual(notice.vhostOwner, 'OpenVibers/OpenVibe.Bot');
        assert.ok(!exists(`deploy/nginx/${d}.conf`), `${d}: owner provides the vhost`);
    } else {
        const conf = read(`deploy/nginx/${d}.conf`);
        assert.ok(conf.includes(`server_name ${d}`), `${d}: server_name`);
        assert.ok(conf.includes(`root /opt/openvibe.sites/dist/${d};`), `${d}: static root`);
        assert.ok(conf.includes('error_page 404 /404.html;'), `${d}: true 404 page`);
        assert.ok(conf.includes('try_files $uri $uri.html $uri/ =404;'), `${d}: unknown paths return 404`);
    }
}
console.log(`sites build: ${notices.length} notices current; ${frozen.length} product domains frozen`);
