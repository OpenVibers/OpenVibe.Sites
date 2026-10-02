#!/usr/bin/env node
'use strict';
/**
 * OpenVibe.Sites is frozen (plan T11 lane D): the product catalog lives in OpenVibe.Contracts and
 * sites.json is its generated mirror (scripts/sync-catalog.js). The placeholder pages in
 * dist/<domain>/ and the vhosts in deploy/nginx/ are no longer generated: they stay as committed and
 * production serves them until each product serves its own domain (docs/retirement.md).
 *
 *   node build.js            → dist/<domain>/{terms,privacy,dmca}.html and dist/_shared/
 *   node build.js --check    → exit 1 when those are stale (CI / deploy guard)
 *
 * What still builds: the legal pages, from the pinned openvibe-shared, and one copy of its browser
 * files, served by every Sites vhost at /shared/.
 */
const fs = require('fs');
const path = require('path');
// The network's legal documents, from the pinned OpenVibe.Shared release (package.json).
const legal = require('openvibe-shared/legal');
// D42 (roadmap WS-P task 4): the pages run this repository's pinned copy of the shared browser files, served by
// every Sites vhost at /shared/ from one copy in dist/_shared/, never openvibe.network's.
const sharedFiles = require('openvibe-shared/files');
// Which clauses apply to each domain once it opens (mirrors OpenVibe.Network/server/frame/sites.js).
const LEGAL_PROFILE = { chat: 'ugc', codes: 'ugc', blog: 'info', wiki: 'ugc', news: 'info', reviews: 'ugc', tips: 'streaming', vip: 'account', trade: 'ugc', host: 'hosting', deals: 'info', coupons: 'info', stream: 'streaming' };
// Sites whose own server has no page routes: their legal pages are built here and served by nginx.
const LEGAL_ONLY = [{ domain: 'openvibe.games', name: 'OpenVibe.Games', id: 'games', profile: 'games' }];
const legalSite = (site) => ({ id: site.tld, service: 'network', host: site.domain, name: site.name, profile: site.legalProfile || LEGAL_PROFILE[site.tld] || 'info' });

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8'));

function build() {
    const out = {};
    for (const site of catalog.sites) for (const kind of ['terms', 'privacy', 'dmca']) out[`${site.domain}/${kind}.html`] = legal.page(kind, legalSite(site));
    for (const g of LEGAL_ONLY) for (const kind of ['terms', 'privacy', 'dmca']) out[`${g.domain}/${kind}.html`] = legal.page(kind, { id: g.id, service: g.id, host: g.domain, name: g.name, profile: g.profile });
    // One copy of every browser file of the pinned openvibe-shared (the pages' scripts and what they load beside them).
    for (const name of sharedFiles.BROWSER) out[`_shared/${name}`] = fs.readFileSync(sharedFiles.path(name), 'utf8');
    return out;
}

const files = build();
if (process.argv.includes('--check')) {
    let stale = 0;
    for (const [rel, content] of Object.entries(files)) {
        const p = path.join(DIST, rel);
        // lastmod/datePublished change daily; compare with dates neutralised.
        const norm = (s) => String(s).replace(/\d{4}-\d{2}-\d{2}/g, 'DATE');
        if (!fs.existsSync(p) || norm(fs.readFileSync(p, 'utf8')) !== norm(content)) { console.error(`stale: ${rel}`); stale++; }
    }
    process.exit(stale ? 1 : 0);
}
for (const [rel, content] of Object.entries(files)) {
    const p = path.join(DIST, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
}
console.log(`built legal pages and /shared/ for ${catalog.sites.length} sites → dist/`);
