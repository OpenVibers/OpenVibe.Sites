#!/usr/bin/env node
'use strict';
/**
 * Refresh facts.json: what is true about each repository a Sites page names, so the placeholder
 * copy comes from facts and never from a hand-kept list (roadmap §32.7 launch rule, §32.10).
 *
 *   node scripts/facts.js              → STATUS.json of every repo + Network's registry exposure
 *   node scripts/facts.js --offline    → STATUS.json only; keeps the registry rows already in facts.json
 *
 * Two sources, both recorded with where they came from:
 *   - each repository's committed STATUS.json (`git show HEAD:STATUS.json` in the sibling OpenVibers
 *     checkout, so nobody's uncommitted edit leaks in), with the commit it was read at;
 *   - Network's registry exposure (GET /api/v1/registry/services): whether each service's public
 *     domain serves it (live), it runs on the host's loopback only (internal), or nothing runs.
 *
 * build.js reads only the committed facts.json, so a build is reproducible (CI has no sibling
 * checkouts and no network). Review the diff, rebuild (node build.js), commit both.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REPOS_DIR = process.env.OPENVIBERS_DIR || path.join(ROOT, '..');
const REGISTRY = process.env.REGISTRY_URL || 'https://openvibe.network/api/v1/registry/services';
const OUT = path.join(ROOT, 'facts.json');
const offline = process.argv.includes('--offline');

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8'));
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { repos: {} };

// A STATUS.json says "deployed" as a boolean, as prose ("loopback only, not launched") or only in
// its "deployment" sentence ("Deployed internally, not launched: …"; "none of its own: …").
function deployedOf(s) {
    const says = (v) => !/^(no|not|none)\b/i.test(v.trim());
    if (typeof s.deployed === 'boolean') return s.deployed;
    if (typeof s.deployed === 'string') return says(s.deployed);
    if (typeof s.deployment === 'string') return says(s.deployment);
    return null;
}

function statusOf(repo) {
    const dir = path.join(REPOS_DIR, repo);
    if (!fs.existsSync(path.join(dir, '.git'))) return { missing: `no checkout at ${dir}` };
    let raw;
    try { raw = execFileSync('git', ['-C', dir, 'show', 'HEAD:STATUS.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
    const s = JSON.parse(raw);
    const commit = execFileSync('git', ['-C', dir, 'rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim();
    return { stage: s.stage || null, code: s.code === true, deployed: deployedOf(s), updated: s.updated || null, commit };
}

async function registryRows() {
    const res = await fetch(REGISTRY, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`${REGISTRY} answered ${res.status}`);
    const body = await res.json();
    const byRepo = {};
    for (const m of body.services) {
        const repo = String(m.repository || '').replace(/^OpenVibers\//, '');
        if (!repo) continue;
        const e = m.exposure || {};
        const origin = e.state === 'live' && e.public_site === 'service' ? m.publicOrigin || null : null;
        byRepo[repo] = { id: m.id, manifest_status: m.status, state: e.state || 'unknown', public_site: e.public_site == null ? null : e.public_site, origin, planned_origin: origin ? null : m.publicOrigin || null };
    }
    return { contracts_version: body.contracts_version || null, byRepo };
}

(async () => {
    const repos = [...new Set(catalog.sites.map(s => s.plannedRepo).filter(Boolean))].sort();
    const reg = offline ? null : await registryRows();
    const out = {
        note: 'Facts the Sites placeholder copy is built from. Refresh with `node scripts/facts.js`, review the diff, run `node build.js`, commit both. Never edit by hand.',
        generated: new Date().toISOString().slice(0, 10),
        sources: {
            status: 'STATUS.json at HEAD of each OpenVibers checkout (commit recorded per repo)',
            registry: offline ? (previous.sources && previous.sources.registry) || null : `${REGISTRY} (openvibe-contracts ${reg.contracts_version})`,
        },
        repos: {},
    };
    for (const repo of repos) {
        const status = statusOf(repo);
        if (status && status.missing) {
            // No checkout here: keep what the last refresh saw rather than inventing anything.
            if (!previous.repos[repo]) throw new Error(`${repo}: ${status.missing} and no earlier fact to keep`);
            console.warn(`[facts] ${repo}: ${status.missing}; kept the previous STATUS row`);
            out.repos[repo] = { ...previous.repos[repo] };
        } else {
            out.repos[repo] = { status };
        }
        const registry = offline ? (previous.repos[repo] || {}).registry || null : reg.byRepo[repo] || null;
        out.repos[repo].registry = registry;
    }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
    for (const [repo, f] of Object.entries(out.repos)) {
        const s = f.status || {}; const r = f.registry || {};
        console.log(`${repo.padEnd(18)} stage=${s.stage} code=${s.code} deployed=${s.deployed} registry=${r.state || '-'}${r.public_site ? `/${r.public_site}` : ''} @${s.commit || '-'}`);
    }
})().catch((e) => { console.error(`[facts] ${e.message}`); process.exit(1); });
