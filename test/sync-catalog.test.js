'use strict';
// sites.json is the generated mirror of the Contracts product catalog: it matches the pinned
// openvibe-contracts, and every domain Sites serves is still in it (or listed below until it is).
//   node test/sync-catalog.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'sync-catalog.js'), '--check'], { stdio: 'inherit' });

const { catalog } = require('openvibe-contracts/lib/products');
const domains = new Set(catalog().map(r => r.domain));
// Placeholders added after openvibe-contracts v0.84.0 that have no product manifest there yet: sync-catalog
// keeps them as they are. Drop a domain from this list with the Contracts bump that adds it.
const AWAITING_CONTRACTS = ['openvibe.work', 'openvibe.zone'];
for (const d of AWAITING_CONTRACTS) assert.ok(!domains.has(d), `${d}: is in the Contracts catalog now; remove it from AWAITING_CONTRACTS`);
const sites = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8')).sites;
for (const conf of fs.readdirSync(path.join(ROOT, 'deploy', 'nginx'))) {
    const d = conf.replace(/\.conf$/, '');
    assert.ok(sites.some(s => s.domain === d), `${d}: has a vhost, so sites.json keeps it`);
    assert.ok(domains.has(d) || AWAITING_CONTRACTS.includes(d), `${d}: has a home in the Contracts catalog`);
}
console.log(`sync-catalog: ${sites.length} sites, all in the Contracts catalog but ${AWAITING_CONTRACTS.join(', ')}`);
