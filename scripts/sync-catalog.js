#!/usr/bin/env node
'use strict';
/**
 * sites.json is a generated mirror of the product catalog in OpenVibe.Contracts (plan T11 lane D,
 * audit item 12): the pinned openvibe-contracts' `products.catalog()`, one row per domain, from
 * manifests/products/<domain>.json or a service manifest's `site` block.
 *
 *   node scripts/sync-catalog.js           → rewrite sites.json from the catalog
 *   node scripts/sync-catalog.js --check   → exit 1 when sites.json differs (npm test)
 *
 * Contracts writes links as objects ({ title, text }, { question, answer }, { label, url, note });
 * sites.json keeps the arrays the frozen pages were built from. What Contracts does not carry keeps
 * the value sites.json has today (frozen, never dropped): the `network` block, LOCAL fields, and for
 * a service-home row SERVICE_LOCAL (a service manifest's site name/icon/tagline/legalProfile are the
 * console card's, not the page's). A sites.json domain missing from the catalog is kept and reported.
 */
const fs = require('fs');
const path = require('path');
const { catalog } = require('openvibe-contracts/lib/products');

const FILE = path.join(__dirname, '..', 'sites.json');
// Every field a sites.json entry may carry, in the order a new entry is written.
const FIELDS = ['domain', 'zone', 'hostParts', 'tld', 'kind', 'name', 'icon', 'accent', 'plannedRepo', 'noRepo', 'legalProfile', 'tagline', 'description', 'statusApi', 'linksLead', 'links', 'pillars', 'highlight', 'meanwhile', 'keywords', 'launch', 'core', 'faq', 'vision'];
const LOCAL = new Set(['zone', 'hostParts', 'core']);
const SERVICE_LOCAL = new Set(['name', 'icon', 'tagline', 'legalProfile']);

const link = (l) => (l.note === undefined ? [l.label, l.url] : [l.label, l.url, l.note]);
const SHAPE = {
    pillars: (v) => v.map(p => [p.title, p.text]),
    faq: (v) => v.map(q => [q.question, q.answer]),
    links: (v) => v.map(link),
    meanwhile: (v) => v.map(link),
    highlight: (h) => ({ ...h, ...(h.cta && { cta: link(h.cta) }), ...(h.more && { more: link(h.more) }) }),
};

/** A field's value from a catalog row, in sites.json's shape (undefined when Contracts lacks it). */
function fromContracts(row, field) {
    if (field === 'domain') return row.domain;
    if (LOCAL.has(field) || (row.home === 'service' && SERVICE_LOCAL.has(field))) return undefined;
    const e = row.entry;
    const v = field in e ? e[field] : (e.relationships || {})[field];
    if (v === undefined) return undefined;
    return SHAPE[field] ? SHAPE[field](v) : v;
}

function sync(current) {
    const rows = new Map(catalog().map(r => [r.domain, r]));
    const kept = [];
    const sites = current.sites.map(site => {
        const row = rows.get(site.domain);
        if (!row) { kept.push(site.domain); return site; }
        rows.delete(site.domain);
        const out = {};
        for (const k of [...Object.keys(site), ...FIELDS.filter(f => !(f in site))]) {
            const v = fromContracts(row, k);
            if (v !== undefined) out[k] = v;
            else if (site[k] !== undefined) out[k] = site[k];
        }
        return out;
    });
    for (const row of rows.values()) {
        const out = {};
        for (const k of FIELDS) { const v = fromContracts(row, k); if (v !== undefined) out[k] = v; }
        sites.push(out);
    }
    return { json: { ...current, sites }, kept };
}

const before = fs.readFileSync(FILE, 'utf8');
const { json, kept } = sync(JSON.parse(before));
const after = JSON.stringify(json, null, 2) + '\n';
for (const d of kept) console.error(`sync-catalog: ${d} is not in the Contracts catalog; kept as it is`);
if (process.argv.includes('--check')) {
    if (after !== before) { console.error('sync-catalog: sites.json differs from the Contracts catalog; run node scripts/sync-catalog.js'); process.exit(1); }
    console.log(`sync-catalog: sites.json matches the Contracts catalog (${json.sites.length} sites)`);
} else {
    fs.writeFileSync(FILE, after);
    console.log(`sync-catalog: wrote ${json.sites.length} sites to sites.json`);
}
