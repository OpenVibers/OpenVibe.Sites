#!/usr/bin/env node
'use strict';
/**
 * OpenVibe.Sites — static front pages for the network's domains that are not full apps yet.
 *
 *   node build.js            → dist/<domain>/{index.html,robots.txt,sitemap.xml,manifest.webmanifest,status.json,release.json}
 *   node build.js --check    → exit 1 when dist/ is stale (CI / deploy guard)
 *
 * One template, one catalog (sites.json), one snapshot of facts (facts.json, refreshed by
 * scripts/facts.js from each repository's STATUS.json and the Network registry). Every page is real
 * content for people and crawlers: what the site will be, where its product stands today (from
 * facts.json, never a hand-kept list), what to use meanwhile, the whole network, sign-in — with the
 * shared navbar/footer/theme loader from openvibe.network so the domain already feels like the rest
 * of the network. No build step at request time: nginx serves the files.
 */
const fs = require('fs');
const path = require('path');
// The network's legal documents, from the pinned OpenVibe.Shared release (package.json).
const legal = require('openvibe-shared/legal');
// D42 (roadmap WS-P task 4): the pages run this repository's pinned copy of the shared browser files, served by
// every Sites vhost at /shared/ from one copy in dist/_shared/, content-addressed (?v=), never openvibe.network's.
const sharedFiles = require('openvibe-shared/files');
const SHARED = (name) => require('openvibe-shared/serve').url(name);
// Which clauses apply to each domain once it opens (mirrors OpenVibe.Network/server/frame/sites.js).
const LEGAL_PROFILE = { chat: 'ugc', codes: 'ugc', blog: 'info', wiki: 'ugc', news: 'info', reviews: 'ugc', tips: 'streaming', vip: 'account', trade: 'ugc', host: 'hosting', deals: 'info', coupons: 'info', stream: 'streaming' };
// Sites whose own server has no page routes: their legal pages are built here and served by nginx.
const LEGAL_ONLY = [{ domain: 'openvibe.games', name: 'OpenVibe.Games', id: 'games', profile: 'games' }];
const legalSite = (site) => ({ id: site.tld, service: 'network', host: site.domain, name: site.name, profile: site.legalProfile || LEGAL_PROFILE[site.tld] || 'info' });

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8'));
// What is true about each repository a page names: its committed STATUS.json and Network's registry
// exposure, snapshotted by scripts/facts.js. The build reads only this file, so it is reproducible.
const facts = JSON.parse(fs.readFileSync(path.join(ROOT, 'facts.json'), 'utf8'));
const NET = catalog.network;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The facts row for a site's repository (null when the page names none). A missing row fails the build. */
function repoFacts(site) {
    if (!site.plannedRepo) return null;
    const f = facts.repos[site.plannedRepo];
    if (!f) throw new Error(`${site.domain}: facts.json has no row for ${site.plannedRepo}; run node scripts/facts.js`);
    return f;
}
/**
 * Where the product behind a page stands, from facts only:
 *   closed   the repository's STATUS.json says closed (a decision record, nothing to launch)
 *   surface  the repository's service is public elsewhere; this domain is not routed to it yet
 *   running  the service is built and runs on the host (loopback only); the domain is not public yet
 *   code     code exists, nothing deployed
 *   planned  charter only, no code
 *   pointer  (kind: status) the address points at something a live service publishes elsewhere
 */
function standing(site) {
    if (site.kind === 'status') return 'pointer';
    // A notice about a closed product says so even when its repository is archived and named nowhere.
    if (site.kind === 'closed') return 'closed';
    const f = repoFacts(site);
    if (!f) return 'planned';
    const st = f.status || {}; const rg = f.registry || {};
    if (st.stage === 'closed' || rg.state === 'closed') return 'closed';
    if (rg.state === 'live' && rg.public_site === 'service') return 'surface';
    if (rg.state === 'internal' || (st.code && st.deployed)) return 'running';
    if (st.code) return 'code';
    return 'planned';
}
const STANDING = {
    running: { label: 'in development', repoStage: 'service-running' },
    code: { label: 'in development', repoStage: 'code-not-deployed' },
    surface: { label: 'not routed yet', repoStage: 'surface-of-a-live-service' },
    planned: { label: 'planned', repoStage: 'charter-only' },
    closed: { label: 'closed', repoStage: 'closed' },
    pointer: { label: 'status', repoStage: 'pointer' },
};
// The stable marker other repositories' checks grep for (Host docs/launch.md, Network's requirement
// ledger): every placeholder says it, a notice never does.
const MARKER = 'this page is a placeholder, nothing here is live yet';
const repoLink = (repo) => `<a href="https://github.com/OpenVibers/${esc(repo)}" rel="noopener"><code>OpenVibers/${esc(repo)}</code></a>`;
/** The hero's status sentence: what is true about the product, and what its public launch waits for. */
function statusText(site) {
    const k = standing(site);
    const f = repoFacts(site);
    // A product planned before its repository exists names itself, never another repository.
    const repo = site.plannedRepo ? repoLink(site.plannedRepo) : site.noRepo ? `<strong>${esc(site.name)}</strong>` : '<code>OpenVibe.Network</code>';
    const waits = site.launch ? ` The public launch is waiting for ${esc(site.launch)}.` : '';
    // A product that moved to another address (site.kind: moved): the first link is where it went.
    if (site.kind === 'moved') return `${repo} moved to <a href="${esc(site.links[0][1])}">${esc(site.links[0][1].replace(/^https?:\/\/|\/$/g, ''))}</a>; this address serves only this notice.`;
    if (k === 'running') return `${repo} is built and its service runs on the network's host, but it is not public yet: ${MARKER}.${waits}`;
    if (k === 'code') return `${repo} has code, but nothing is deployed yet: ${MARKER}.${waits}`;
    if (k === 'surface') {
        const o = f.registry.origin;
        return `${repo} is live at <a href="${esc(o)}/">${esc(o.replace(/^https?:\/\//, ''))}</a>; this address is not routed to it yet: ${MARKER}.`;
    }
    if (k === 'pointer') return `${repo} publishes the status of every OpenVibe service at <a href="${esc(site.links[0][1])}">${esc(site.links[0][1].replace(/^https?:\/\//, ''))}</a>; this address points there.`;
    if (k === 'closed') return `${repo} is closed and stays as a decision record; no product launches at this address.`;
    if (site.noRepo) return `${repo} is planned; its repository and code do not exist yet: ${MARKER}.${waits}`;
    return `${repo}: charter only, no code yet: ${MARKER}.${waits}`;
}
const today = new Date().toISOString().slice(0, 10);
// A page is first published once; rebuilding it later changes dateModified, never datePublished.
const FIRST_PUBLISHED = '2026-09-17';

function hexToRgb(hex) { const m = String(hex).replace('#', ''); const n = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }

/** A site's headline feature, shown right under the hero: { title, text, points: [..], cta: [label, href], more: [label, href] }. */
function highlight(h) {
    return `  <section class="highlight" aria-labelledby="highlight-h">
    <div class="hl-card">
      <h2 id="highlight-h"><i class="fa-solid fa-bolt" aria-hidden="true"></i> ${esc(h.title)}</h2>
      <p>${esc(h.text)}</p>
      ${(h.points || []).length ? `<ul>${h.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="ctas">${h.cta ? `<a class="btn btn-primary" href="${esc(h.cta[1])}"><i class="fa-solid fa-tower-broadcast"></i> ${esc(h.cta[0])}</a>` : ''}${h.more ? ` <a class="btn" href="${esc(h.more[1])}">${esc(h.more[0])}</a>` : ''}</div>
    </div>
  </section>`;
}

// A product with a worked-out vision (site.vision, owner 2026-09-29: Bot and Actor) gets a front door instead of the plain
// "what it will be" grid: a split hero with a labelled design preview, how it works, the choices, what it does, how it
// connects to the network, and its questions. It stays honest: the build status (with MARKER) says nothing is live yet.
function visionViz(v) {
    const z = v.viz || {};
    if (z.kind === 'panel') {
        return `<figure class="viz" aria-label="${esc(z.label)}">
      <div class="viz-top"><span class="dot"></span><b>${esc(z.name)}</b><span class="muted">online</span><span class="lat"><i class="fa-solid fa-signal" aria-hidden="true"></i> ${esc(z.latency)}</span></div>
      <div class="viz-video" aria-hidden="true"><div class="scan"></div><span class="onair"><i class="fa-solid fa-circle" aria-hidden="true"></i> ${esc(z.onair)}</span><span class="cam"><i class="fa-solid fa-video" aria-hidden="true"></i> Front camera</span></div>
      <div class="viz-ctrl" aria-hidden="true">
        <div class="dpad"><span class="u"><i class="fa-solid fa-caret-up"></i></span><span class="l"><i class="fa-solid fa-caret-left"></i></span><span class="c"></span><span class="r"><i class="fa-solid fa-caret-right"></i></span><span class="d"><i class="fa-solid fa-caret-down"></i></span></div>
        <div class="viz-side">
          <div class="keys">${(z.keys || []).map((k) => `<span><i class="fa-solid ${esc(k[0])}"></i> ${esc(k[1])}</span>`).join('')}</div>
          <div class="meter"><span>Battery</span><i style="--v:${Number(z.battery) || 0}%"></i><b>${Number(z.battery) || 0}%</b></div>
          <div class="estop">STOP</div>
        </div>
      </div>
      <figcaption>${esc(z.caption)}</figcaption>
    </figure>`;
    }
    if (z.kind === 'agent') {
        return `<figure class="viz" aria-label="${esc(z.label)}">
      <div class="viz-top"><span class="av"><i class="fa-solid ${esc(z.icon)}" aria-hidden="true"></i></span><b>${esc(z.name)}</b><span class="muted">${esc(z.role)}</span><span class="lat"><i class="fa-solid fa-cloud" aria-hidden="true"></i> ${esc(z.state)}</span></div>
      <ol class="feed">${(z.steps || []).map((t) => `<li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>${esc(t)}</span></li>`).join('')}
        <li class="ask"><i class="fa-solid fa-hand" aria-hidden="true"></i><span>${esc(z.ask)}</span><span class="pills" aria-hidden="true"><span class="ok">Approve</span><span>Not yet</span></span></li></ol>
      <figcaption>${esc(z.caption)}</figcaption>
    </figure>`;
    }
    if (z.kind === 'router') {
        return `<figure class="viz" aria-label="${esc(z.label)}">
      <div class="viz-top"><span class="av"><i class="fa-solid fa-route" aria-hidden="true"></i></span><b>New task</b><span class="lat"><i class="fa-solid fa-wallet" aria-hidden="true"></i> ${esc(z.budget)}</span></div>
      <p class="task">${esc(z.task)}</p>
      <div class="modes" aria-hidden="true">${(z.modes || []).map((m) => `<span${m === z.mode ? ' class="on"' : ''}>${esc(m)}</span>`).join('')}</div>
      <ol class="cands" aria-hidden="true">${(z.candidates || []).map((c) => `<li${c.pick ? ' class="pick"' : ''}><i class="fa-solid ${esc(c.icon)}"></i><b>${esc(c.name)}</b><span>${esc(c.cost)}</span><span>${esc(c.time)}</span><span>${esc(c.success)}</span>${c.pick ? '<em>picked</em>' : ''}</li>`).join('')}</ol>
      <p class="why"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> ${esc(z.why)}</p>
      <figcaption>${esc(z.caption)}</figcaption>
    </figure>`;
    }
    return '';
}
function vision(site) {
    const v = site.vision;
    const cards = (list) => list.map(([ic, h, d, href]) => href
        ? `<a class="card" href="${esc(href)}"><div class="ic"><i class="fa-solid ${esc(ic)}" aria-hidden="true"></i></div><b>${esc(h)}</b><span>${esc(d)}</span><span class="go">${esc(href.replace(/^https?:\/\//, '').replace(/\/$/, ''))} →</span></a>`
        : `<div class="card"><div class="ic"><i class="fa-solid ${esc(ic)}" aria-hidden="true"></i></div><b>${esc(h)}</b><span>${esc(d)}</span></div>`).join('\n      ');
    return `  <section id="what">
    <h2>${esc(v.stepsTitle)}</h2>
    <p class="lead2">${esc(v.stepsLead)}</p>
    <ol class="steps">
      ${v.steps.map(([h, d], i) => `<li><span class="n">${i + 1}</span><b>${esc(h)}</b><span>${esc(d)}</span></li>`).join('\n      ')}
    </ol>
  </section>
${v.choices ? `
  <section>
    <h2>${esc(v.choices.title)}</h2>
    <p class="lead2">${esc(v.choices.lead)}</p>
    <div class="choice">
      ${v.choices.items.map((c) => `<div class="card big"><div class="ic"><i class="fa-solid ${esc(c.icon)}" aria-hidden="true"></i></div><b>${esc(c.title)}</b><span>${esc(c.text)}</span>${c.chips ? `<div class="chips">${c.chips.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>`).join('\n      ')}
    </div>
  </section>` : ''}

  <section>
    <h2>${esc(v.featuresTitle)}</h2>
    <p class="lead2">${esc(v.featuresLead)}</p>
    <div class="grid three">
      ${cards(v.features)}
    </div>
  </section>
${(v.more || []).map((m) => `
  <section${m.id ? ` id="${esc(m.id)}"` : ''}>
    <h2>${esc(m.title)}</h2>
    <p class="lead2">${esc(m.lead)}</p>
    <div class="grid three">
      ${cards(m.cards)}
    </div>
  </section>`).join('')}
${v.templates ? `
  <section>
    <h2>${esc(v.templates.title)}</h2>
    <p class="lead2">${esc(v.templates.lead)}</p>
    <div class="chips big">${v.templates.items.map(([ic, t]) => `<span><i class="fa-solid ${esc(ic)}" aria-hidden="true"></i>${esc(t)}</span>`).join('')}</div>
  </section>` : ''}

  <section class="meanwhile">
    <h2>${esc(v.connectTitle)}</h2>
    <p class="lead2">${esc(v.connectLead)}</p>
    <div class="grid">
      ${cards(v.connect)}
    </div>
  </section>
${site.faq && site.faq.length ? `
  <section id="questions" class="faq">
    <h2>Questions</h2>
    ${site.faq.map(([q, ans]) => `<details><summary>${esc(q)}</summary><p>${esc(ans)}</p></details>`).join('\n    ')}
  </section>` : ''}

  <section class="build">
    <div class="card">
      <b><i class="fa-solid fa-person-digging" aria-hidden="true"></i> Build status</b>
      <span>${esc(v.building)} Its own service is not running yet: ${MARKER}.${site.launch ? ` It opens with ${esc(site.launch)}.` : ''} · as of ${esc(facts.generated)} · <a href="/status.json">status.json</a></span>
    </div>
  </section>
`;
}

function page(site) {
    const core = site.core || NET.core;
    const url = `https://${site.domain}/`;
    const title = `${site.name} — ${site.tagline}`;
    const ogImage = `${NET.networkUrl}/assets/logo-512.png`;
    const others = NET.liveSites.filter(s => s.url !== url.slice(0, -1));
    // A notice (site.kind: closed or moved) is not a placeholder for a product: it says where the work went, is not
    // indexed and is not listed among the domains still to open.
    const notice = !!site.kind;
    const siblings = catalog.sites.filter(s => s.domain !== site.domain && !s.kind);
    const primary = notice && site.links && site.links[0];
    const ld = {
        '@context': 'https://schema.org',
        '@graph': [
            { '@type': 'WebSite', '@id': `${url}#site`, url, name: site.name, description: site.description, inLanguage: 'en',
              publisher: { '@type': 'Organization', '@id': `${NET.networkUrl}/#org`, name: 'OpenVibe', url: `${NET.networkUrl}/`, logo: ogImage, sameAs: [NET.github, NET.discord] },
              isPartOf: { '@type': 'WebSite', '@id': `${NET.networkUrl}/#site`, name: 'OpenVibe.Network', url: `${NET.networkUrl}/` } },
            { '@type': 'WebPage', '@id': `${url}#page`, url, name: title, description: site.description, isPartOf: { '@id': `${url}#site` }, datePublished: site.published || FIRST_PUBLISHED, dateModified: today,
              breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'OpenVibe', item: `${NET.networkUrl}/` }, { '@type': 'ListItem', position: 2, name: site.name, item: url }] } },
        ],
    };
    // A questions section people can read is also a FAQPage for search engines and AI crawlers.
    if (site.faq && site.faq.length) ld['@graph'].push({ '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: site.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(site.description)}">
<meta name="keywords" content="${esc(site.keywords || '')}">
<meta name="robots" content="${notice ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<meta name="theme-color" content="${esc(site.accent)}">
<link rel="canonical" href="${url}">
${require('openvibe-shared/app-icon').headTags({ site: 'network' }).split('\n')[0]}
${require('openvibe-shared/app-icon').CRITICAL}
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="text/html" hreflang="en" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(site.description)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:alt" content="OpenVibe">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(site.description)}">
<meta name="twitter:image" content="${ogImage}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script>(function(){try{var raw=localStorage.getItem('ov_theme');if(!raw)return;var t=JSON.parse(raw),v=t&&t.variables;if(!v)return;var el=document.documentElement;for(var k in v)if(k.charAt(0)==='-')el.style.setProperty(k,v[k]);if(t.id)el.setAttribute('data-theme',t.id);}catch(_){}})();</script>
<script src="${SHARED('theme-loader.js')}" defer></script>
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"></noscript>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg-primary:#0a0f1c;--bg-secondary:#101828;--bg-card:#131c2e;--bg-hover:#1c2a44;--border:#1f2d47;--text-primary:#e6edf7;--text-secondary:#96a7c2;--text-muted:#7386a3;--accent:#3b82f6;--accent-light:#60a5fa;--accent-rgb:59,130,246;--on-accent:#fff;--site:${esc(site.accent)};--site-rgb:${hexToRgb(site.accent)}}
html{scroll-behavior:smooth}
body{background:var(--bg-primary);color:var(--text-primary);font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;flex-direction:column;overflow-x:hidden}
main{flex:1;position:relative}
.orbs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.orbs i{position:absolute;border-radius:50%;filter:blur(90px);opacity:.16;animation:drift 26s ease-in-out infinite alternate}
.orbs i:nth-child(1){width:420px;height:420px;background:var(--site);top:-140px;left:-120px}
.orbs i:nth-child(2){width:360px;height:360px;background:var(--accent);top:40%;right:-140px;animation-delay:-9s}
.orbs i:nth-child(3){width:300px;height:300px;background:var(--site);bottom:-120px;left:38%;animation-delay:-17s}
@keyframes drift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-26px,36px) scale(1.07)}100%{transform:translate(34px,-28px) scale(.95)}}
.wrap{position:relative;z-index:1;max-width:1040px;margin:0 auto;padding:0 20px}
.hero{padding:84px 0 44px;text-align:center}
.hero .mark{display:inline-grid;place-items:center;width:84px;height:84px;border-radius:24px;background:rgba(var(--site-rgb),.12);border:1px solid rgba(var(--site-rgb),.35);color:var(--site);font-size:34px;margin-bottom:22px;box-shadow:0 20px 60px rgba(var(--site-rgb),.18);animation:rise .6s cubic-bezier(.2,.8,.2,1) both}
.hero .badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;border:1px solid var(--border);background:var(--bg-secondary);font-size:12px;font-weight:600;color:var(--text-secondary);letter-spacing:.3px;margin-bottom:22px;animation:rise .6s .05s cubic-bezier(.2,.8,.2,1) both}
.hero .badge b{color:var(--site)}
.hero h1{font-size:clamp(34px,6vw,58px);font-weight:800;letter-spacing:-1.4px;line-height:1.08;animation:rise .6s .1s cubic-bezier(.2,.8,.2,1) both}
.hero h1 .d{color:var(--site)}
.hero h1 .tld{color:var(--text-secondary)}
.hero .tag{font-size:clamp(18px,2.6vw,24px);font-weight:600;color:var(--text-primary);margin:18px 0 10px;animation:rise .6s .16s cubic-bezier(.2,.8,.2,1) both}
.hero p.lead{color:var(--text-secondary);font-size:16px;line-height:1.65;max-width:680px;margin:0 auto;animation:rise .6s .22s cubic-bezier(.2,.8,.2,1) both}
.ctas{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:30px;animation:rise .6s .3s cubic-bezier(.2,.8,.2,1) both}
.hero .status{margin:22px auto 0;max-width:720px;font-size:12.5px;line-height:1.7;color:var(--text-muted);border:1px dashed var(--border);border-radius:12px;padding:10px 14px;background:rgba(0,0,0,.15)}
.hero .status b{color:var(--site)}
.hero .status code{font-size:12px;color:var(--text-secondary);background:var(--bg-secondary);padding:1px 6px;border-radius:6px}
.hero .status a{color:var(--text-secondary)}
.btn{display:inline-flex;align-items:center;gap:9px;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid var(--border);color:var(--text-primary);background:var(--bg-secondary);transition:transform .15s,border-color .15s,box-shadow .15s}
.btn:hover{transform:translateY(-1px);border-color:var(--site);box-shadow:0 10px 30px rgba(var(--site-rgb),.15)}
.btn-primary{background:var(--site);border-color:var(--site);color:#0b0d10}
.btn-primary:hover{filter:brightness(1.08)}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
section{padding:36px 0}
h2{font-size:22px;font-weight:700;letter-spacing:-.3px;margin-bottom:6px}
.lead2{color:var(--text-secondary);font-size:14px;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
.card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px;transition:transform .2s,border-color .2s,box-shadow .2s;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:8px}
a.card:hover{transform:translateY(-3px);border-color:rgba(var(--site-rgb),.6);box-shadow:0 16px 40px rgba(0,0,0,.35)}
.card .ic{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:rgba(var(--site-rgb),.12);color:var(--site);font-size:17px}
.card b{font-size:15px}
.card span{font-size:13px;color:var(--text-secondary);line-height:1.55}
.card .go{margin-top:auto;font-size:12.5px;font-weight:600;color:var(--site)}
.highlight .hl-card{border:1px solid rgba(var(--accent-rgb),.45);background:rgba(var(--accent-rgb),.10);border-radius:18px;padding:22px 22px 18px}
.highlight h2{margin:0 0 8px}.highlight h2 i{color:var(--accent-light)}.highlight p{margin:0 0 10px}
.highlight ul{margin:0 0 14px;padding-left:20px}.highlight li{margin:4px 0}
.faq details{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;margin:8px 0}
.faq summary{cursor:pointer;font-weight:600}.faq details p{margin:8px 0 0;opacity:.85}
.meanwhile .card .ic{background:rgba(var(--accent-rgb),.12);color:var(--accent-light)}
.net .card .ic{background:var(--bg-hover);color:var(--text-primary)}
.rooms{display:flex;flex-wrap:wrap;gap:8px}
.rooms a{font-size:12.5px;padding:7px 12px;border-radius:999px;border:1px solid var(--border);color:var(--text-secondary);text-decoration:none;transition:all .15s;background:var(--bg-secondary)}
.rooms a:hover{color:var(--text-primary);border-color:var(--site)}
.rooms a i{margin-right:6px;opacity:.8}
.strip{border:1px solid var(--border);border-radius:18px;background:var(--bg-secondary);padding:30px 26px;text-align:center;margin:10px 0 50px}
.strip h3{font-size:19px;font-weight:700;margin:12px 0 8px}
.strip p{font-size:14px;color:var(--text-secondary);max-width:600px;margin:0 auto 18px;line-height:1.6}
.strip .ov-mark{width:44px;height:44px}
.hero.split{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:40px;align-items:center;text-align:left;padding-top:64px}
.hero.split .ctas{justify-content:flex-start}.hero.split p.lead{margin:0}
.viz{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:14px;box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 1px rgba(var(--site-rgb),.08);animation:rise .7s .25s cubic-bezier(.2,.8,.2,1) both;text-align:left}
.viz figcaption{margin-top:10px;font-size:11.5px;color:var(--text-muted);text-align:center}
.viz-top{display:flex;align-items:center;gap:8px;font-size:13px;padding:2px 4px 12px}
.viz-top b{font-weight:700}.viz-top .muted{color:var(--text-muted)}
.viz-top .lat{margin-left:auto;font-size:12px;color:var(--site);background:rgba(var(--site-rgb),.1);border:1px solid rgba(var(--site-rgb),.3);padding:3px 9px;border-radius:999px}
.viz-top .dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.18)}
.viz-top .av{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:rgba(var(--site-rgb),.15);color:var(--site);font-size:13px}
.viz-video{position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:radial-gradient(120% 90% at 30% 20%,rgba(var(--site-rgb),.28),transparent 60%),linear-gradient(160deg,#1a2338,#0b1020 70%);border:1px solid var(--border)}
.viz-video::after{content:'';position:absolute;left:10%;right:10%;bottom:0;height:42%;background:linear-gradient(transparent,rgba(0,0,0,.35)),repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 38px);transform:perspective(220px) rotateX(58deg);transform-origin:bottom}
.viz-video .scan{position:absolute;inset:0;background:linear-gradient(transparent 0,rgba(255,255,255,.04) 50%,transparent 100%);background-size:100% 6px;opacity:.5}
.viz-video .onair{position:absolute;top:10px;left:10px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:rgba(239,68,68,.9);color:#fff}.viz-video .onair i{font-size:7px;vertical-align:2px;margin-right:3px}
.viz-video .cam{position:absolute;bottom:10px;right:10px;font-size:11px;color:#dbe4f5;background:rgba(0,0,0,.45);padding:3px 8px;border-radius:6px}
.viz-ctrl{display:flex;gap:14px;align-items:center;margin-top:12px}
.dpad{display:grid;grid-template-columns:repeat(3,34px);grid-template-rows:repeat(3,34px);gap:4px;flex:none}
.dpad span{display:grid;place-items:center;border-radius:9px;background:var(--bg-hover);color:var(--text-primary);font-size:15px;border:1px solid var(--border)}
.dpad .u{grid-area:1/2}.dpad .l{grid-area:2/1}.dpad .c{grid-area:2/2;background:rgba(var(--site-rgb),.15);border-color:rgba(var(--site-rgb),.35)}.dpad .r{grid-area:2/3}.dpad .d{grid-area:3/2}
.dpad .u{background:rgba(var(--site-rgb),.22);border-color:rgba(var(--site-rgb),.5)}
.viz-side{flex:1;min-width:0;display:grid;gap:8px}
.viz-side .keys{display:flex;flex-wrap:wrap;gap:6px}
.viz-side .keys span{font-size:11.5px;padding:5px 9px;border-radius:8px;background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-secondary)}
.viz-side .meter{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-muted)}
.viz-side .meter i{flex:1;height:6px;border-radius:9px;background:linear-gradient(90deg,#22c55e var(--v),var(--bg-hover) var(--v))}
.viz-side .meter b{color:var(--text-secondary);font-weight:600}
.viz-side .estop{justify-self:end;font-size:12px;font-weight:800;letter-spacing:.08em;color:#fff;background:#dc2626;border-radius:10px;padding:7px 16px;box-shadow:0 0 0 3px rgba(220,38,38,.25)}
.feed{list-style:none;display:grid;gap:8px;padding:2px}
.feed li{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;line-height:1.45;padding:10px 12px;border-radius:12px;background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-secondary)}
.feed li i{color:#22c55e;margin-top:3px}
.feed li.ask{flex-wrap:wrap;border-color:rgba(var(--site-rgb),.45);background:rgba(var(--site-rgb),.08);color:var(--text-primary)}.feed li.ask i{color:var(--site)}.feed li.ask>span:first-of-type{flex:1;min-width:160px}
.feed .pills{display:flex;gap:6px;margin-left:auto}.feed .pills span{font-size:12px;font-weight:600;padding:4px 11px;border-radius:999px;border:1px solid var(--border);color:var(--text-secondary)}.feed .pills .ok{background:var(--site);border-color:var(--site);color:#0b0d10}
.steps{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;counter-reset:s}
.steps li{position:relative;background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px 20px 20px;display:flex;flex-direction:column;gap:8px}
.steps .n{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;color:#0b0d10;background:var(--site)}
.steps b{font-size:15px}.steps span:last-child{font-size:13px;color:var(--text-secondary);line-height:1.55}
.grid.three{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.viz .task{font-size:14px;line-height:1.5;padding:10px 12px;border-radius:12px;background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary)}
.viz .modes{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
.viz .modes span{font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:999px;border:1px solid var(--border);color:var(--text-secondary)}
.viz .modes .on{background:var(--site);border-color:var(--site);color:#0b0d10}
.cands{list-style:none;display:grid;gap:6px}
.cands li{display:grid;grid-template-columns:18px minmax(0,1fr) 54px 50px 44px;align-items:center;gap:8px;font-size:12.5px;padding:8px 10px;border-radius:10px;background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-secondary);position:relative}
.cands li i{color:var(--text-muted)}.cands li b{font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cands li span{text-align:right;font-variant-numeric:tabular-nums}
.cands li.pick{border-color:rgba(var(--site-rgb),.55);background:rgba(var(--site-rgb),.09)}.cands li.pick i{color:var(--site)}
.cands li em{position:absolute;top:-8px;right:10px;font-style:normal;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:1px 7px;border-radius:999px;background:var(--site);color:#0b0d10}
.viz .why{margin-top:10px;font-size:12.5px;line-height:1.5;color:var(--text-secondary)}.viz .why i{color:var(--site);margin-right:4px}
.choice{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.card.big{padding:24px}.card.big b{font-size:17px}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:6px}
.chips span{font-size:12.5px;padding:6px 11px;border-radius:999px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-secondary)}
.chips.big span{font-size:13.5px;padding:9px 14px;color:var(--text-primary)}.chips.big span i{color:var(--site);margin-right:8px}
.build .card{border-style:dashed;background:rgba(0,0,0,.15)}.build .card b i{color:var(--site);margin-right:6px}.build .card span a{color:var(--text-secondary)}.build .card code{font-size:12px}
@media (max-width:860px){.hero.split{grid-template-columns:1fr;text-align:center;gap:28px}.hero.split .ctas{justify-content:center}.hero.split p.lead{margin:0 auto}}
@media (max-width:600px){.hero{padding-top:56px}.ctas .btn{width:100%;justify-content:center}.viz-ctrl{flex-direction:column;align-items:stretch}.dpad{align-self:center}.cands li{grid-template-columns:14px minmax(0,1fr) 30px 40px 30px;gap:6px;font-size:12px;padding:8px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
${site.statusApi ? STATUS_CSS : ''}</style>
</head>
<body>
<div class="orbs"><i></i><i></i><i></i></div>
<div id="navbar-mount"></div>
<main class="wrap">
  <header class="hero${site.vision ? ' split' : ''}">${site.vision ? '<div class="hero-main">' : ''}
    <div class="mark"><i class="fa-solid ${esc(site.icon)}" aria-hidden="true"></i></div>
    <div class="badge"><span class="ov-mark" data-size="16" data-variant="${esc(site.tld)}"></span> Part of the OpenVibe network · <b>${esc(site.vision ? site.vision.badge : STANDING[standing(site)].label)}</b></div>
    <h1>${site.hostParts ? `<span class="d">${esc(site.hostParts[0])}</span><span class="tld">.${esc(site.hostParts[1])}</span>` : `${esc(core)}<span class="d">.</span><span class="tld">${esc(site.name.split('.').pop())}</span>`}</h1>
    <div class="tag">${esc(site.tagline)}</div>
    <p class="lead">${esc(site.description)}</p>
    <div class="ctas">
      ${primary ? `<a class="btn btn-primary" href="${esc(primary[1])}"><i class="fa-solid fa-arrow-right"></i> ${esc(primary[0])}</a>` : `<a class="btn btn-primary" href="${NET.networkUrl}/login?return=${encodeURIComponent(url)}"><i class="fa-solid fa-right-to-bracket"></i> Sign in with OpenVibe</a>`}
      ${site.vision && site.vision.cta ? `<a class="btn" href="${esc(site.vision.cta[1])}"><i class="fa-solid ${esc(site.vision.cta[2])}"></i> ${esc(site.vision.cta[0])}</a>` : `<a class="btn" href="${NET.networkUrl}/#network"><i class="fa-solid fa-circle-nodes"></i> The whole network</a>`}
      <a class="btn" href="${esc(NET.discord)}" rel="noopener"><i class="fa-brands fa-discord"></i> Follow the build</a>
    </div>
    ${site.vision ? `</div>
    ${visionViz(site.vision)}` : `<p class="status"><i class="fa-solid fa-clock" aria-hidden="true"></i> Status: <b>${esc(STANDING[standing(site)].label)}</b> · ${statusText(site)} · as of ${esc(facts.generated)} · <a href="/status.json">status.json</a></p>`}
  </header>

${site.highlight ? highlight(site.highlight) : ''}
${notice ? `  <section id="what" class="meanwhile">
    <h2>Where to go</h2>
    <p class="lead2">${esc(site.linksLead || 'What this address used to stand for lives here now.')}</p>
    <div class="grid">
      ${site.links.map(([h, href, d]) => `<a class="card" href="${esc(href)}"><div class="ic"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></div><b>${esc(h)}</b><span>${esc(d)}</span><span class="go">${esc(href.replace(/^https?:\/\//, '').replace(/\/$/, ''))} →</span></a>`).join('\n      ')}
    </div>
  </section>
${site.statusApi ? liveStatus(site) : ''}` : site.vision ? vision(site) : `  <section id="what">
    <h2>What ${esc(site.name)} will be</h2>
    <p class="lead2">Same account, same themes, same navbar as every other OpenVibe site — built in the open, run by its community.</p>
    <div class="grid">
      ${site.pillars.map(([h, d]) => `<div class="card"><div class="ic"><i class="fa-solid ${esc(site.icon)}" aria-hidden="true"></i></div><b>${esc(h)}</b><span>${esc(d)}</span></div>`).join('\n      ')}
    </div>
  </section>

  <section class="meanwhile">
    <h2>Meanwhile, on the network</h2>
    <p class="lead2">Most of this already exists somewhere on OpenVibe — start there today.</p>
    <div class="grid">
      ${(site.meanwhile || []).map(([h, href, d]) => `<a class="card" href="${esc(href)}"><div class="ic"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></div><b>${esc(h)}</b><span>${esc(d)}</span><span class="go">${esc(href.replace(/^https?:\/\//, '').replace(/\/$/, ''))} →</span></a>`).join('\n      ')}
    </div>
  </section>
${site.faq && site.faq.length ? `
  <section id="questions" class="faq">
    <h2>Questions</h2>
    ${site.faq.map(([q, ans]) => `<details><summary>${esc(q)}</summary><p>${esc(ans)}</p></details>`).join('\n    ')}
  </section>` : ''}
`}
  <section class="net">
    <h2>The OpenVibe network</h2>
    <p class="lead2">One account for all of it. Sign in once and every site signs you in.</p>
    <div class="grid">
      ${others.map(s => `<a class="card" href="${esc(s.url)}"><div class="ic"><i class="fa-solid ${esc(s.icon)}" aria-hidden="true"></i></div><b>${esc(s.name)}</b><span>${esc(s.desc)}</span><span class="go">${esc(s.url.replace(/^https?:\/\//, ''))} →</span></a>`).join('\n      ')}
    </div>
    <h2 style="margin-top:28px;font-size:16px">Other OpenVibe domains, not open yet</h2>
    <div class="rooms" style="margin-top:8px">
      ${siblings.map(s => `<a href="https://${esc(s.domain)}/"><i class="fa-solid ${esc(s.icon)}" aria-hidden="true"></i>${esc(s.name)}</a>`).join('\n      ')}
    </div>
  </section>

  <div class="strip">
    <span class="ov-mark" data-size="44" data-variant="${esc(site.tld)}"></span>
    <h3>Open source. Community run.</h3>
    <p>Every OpenVibe site is built in the open by the people using it — free speech within the rules, no gatekeeping, one identity that follows you everywhere.</p>
    <a class="btn" href="${esc(NET.github)}" rel="noopener"><i class="fa-brands fa-github"></i> OpenVibers on GitHub</a>
  </div>
</main>
${require('openvibe-shared/frame').footer({ service: site.tld, variant: 'full' })}
<script src="${SHARED('ov-mark.js')}" async></script>
<script src="${SHARED('navbar.js')}"></script>
<script src="${SHARED('footer.js')}"></script>
<script>
(function () {
  if (window.OpenVibeNavbar) { try { OpenVibeNavbar.init({ service: '${esc(site.tld)}', apiBase: '${NET.networkUrl}', links: [{ label: '${notice ? 'Where to go' : site.vision ? 'How it works' : 'What it will be'}', href: '#what' }, { label: 'The network', href: '${NET.networkUrl}/#network', external: false }], history: { type: 'page', title: '${esc(site.name)}' } }); } catch (e) {} }
  if (window.OpenVibeFooter) { try { OpenVibeFooter.init({ service: '${esc(site.tld)}', variant: 'full', links: [{ heading: '${esc(site.name)}', items: [{ name: 'Sign in', url: '${NET.networkUrl}/login?return=${encodeURIComponent(url)}' }, { name: 'The network', url: '${NET.networkUrl}/#network' }, { name: 'Discord', url: '${esc(NET.discord)}' }] }] }); } catch (e) {} }
})();
</script>
</body>
</html>
`;
}

// A notice page is noindex and has no sitemap; a placeholder lists its one page.
function robots(site) { return `User-agent: *\nAllow: /\nDisallow: /auth/\n${site.kind ? '' : `Sitemap: https://${site.domain}/sitemap.xml\n`}`; }
function sitemap(site) { return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://${site.domain}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`; }
function manifest(site) { return JSON.stringify(require('openvibe-shared/app-icon').manifest({ site: 'network', name: site.name, shortName: site.name.split('.').pop(), description: site.tagline, iconBase: `${NET.networkUrl}/assets` }), null, 2) + '\n'; }

/** 404.html: what nginx answers (with status 404) for any path that is not a file in dist/<domain>/. */
function notFound(site) {
    const home = `https://${site.domain}/`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not found · ${esc(site.name)}</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="${esc(site.accent)}">
${require('openvibe-shared/app-icon').headTags({ site: 'network' }).split('\n')[0]}
${require('openvibe-shared/app-icon').CRITICAL}
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg-primary:#0a0f1c;--bg-secondary:#101828;--border:#1f2d47;--text-primary:#e6edf7;--text-secondary:#96a7c2;--site:${esc(site.accent)}}
body{background:var(--bg-primary);color:var(--text-primary);font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px 16px}
main{max-width:560px;text-align:center}
.code{font-size:14px;font-weight:700;letter-spacing:.2em;color:var(--site)}
h1{font-size:clamp(28px,5vw,40px);font-weight:800;letter-spacing:-.8px;margin:10px 0 12px}
p{color:var(--text-secondary);font-size:15px;line-height:1.65}
.links{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:24px}
a{display:inline-block;padding:11px 18px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid var(--border);color:var(--text-primary);background:var(--bg-secondary)}
a:first-child{background:var(--site);border-color:var(--site);color:#0b0d10}
</style>
</head>
<body>
<main>
  <p class="code">404</p>
  <h1>This page does not exist</h1>
  <p>${esc(site.domain)} has only its front page and legal pages for now. The address you followed is not one of them.</p>
  <div class="links">
    <a href="${home}">${esc(site.name)}</a>
    <a href="${NET.networkUrl}/">OpenVibe.Network</a>
  </div>
</main>
</body>
</html>
`;
}

/** nginx vhost: static root, wildcard cert, www → apex, long cache for the immutable bits, real 404s. */
const SECURITY_HEADERS = [
    'add_header X-Content-Type-Options nosniff always;',
    'add_header X-Frame-Options SAMEORIGIN always;',
    'add_header Referrer-Policy strict-origin-when-cross-origin always;',
    'add_header Strict-Transport-Security "max-age=31536000" always;',
];
function vhost(site) {
    const d = site.domain;
    const sec = SECURITY_HEADERS.join('\n        ');
    // Subdomains of a zone (e.g. events.openvibe.network) use the zone's wildcard cert and have no www.
    const cert = site.zone || d;
    const www = site.zone ? '' : `
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name www.${d};
    ssl_certificate     /etc/letsencrypt/live/${cert}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${cert}/privkey.pem;
    return 301 https://${d}$request_uri;
}
`;
    return `# ${d} — static front page (OpenVibe.Sites). Generated by build.js; edit sites.json, not this.
server {
    listen 80;
    listen [::]:80;
    server_name ${d}${site.zone ? '' : ` www.${d}`};
    return 301 https://${d}$request_uri;
}
${www}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${d};
    include snippets/security-txt.conf;   # /.well-known/security.txt (host file; SECURITY.md in every repo)

    ssl_certificate     /etc/letsencrypt/live/${cert}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${cert}/privkey.pem;

    root /opt/openvibe.sites/dist/${d};
    index index.html;

    access_log /var/log/nginx/${d}.access.log;
    error_log  /var/log/nginx/${d}.error.log;

    ${SECURITY_HEADERS.join('\n    ')}

    gzip on;
    gzip_types text/html text/plain text/css application/json application/javascript application/xml image/svg+xml application/manifest+json;

    # An add_header inside a location replaces the server's list (nginx does not merge them), so every
    # location that sets its own header repeats the security headers.
    location = /robots.txt {
        add_header Cache-Control "public, max-age=3600";
        ${sec}
    }
    location = /sitemap.xml {
        types { application/xml xml; }
        add_header Cache-Control "public, max-age=3600";
        ${sec}
    }
    location = /manifest.webmanifest {
        types { application/manifest+json webmanifest; }
        add_header Cache-Control "public, max-age=86400";
        ${sec}
    }
    location = /status.json {
        add_header Cache-Control "public, max-age=600";
        add_header Access-Control-Allow-Origin "*";
        ${sec}
    }
    location = /release.json {
        add_header Cache-Control "no-cache";
        add_header Access-Control-Allow-Origin "*";
        ${sec}
    }
    # This repository's pinned shared browser files (navbar, footer, theme loader…), one copy for every Sites
    # vhost. Pages ask for them content-addressed (?v=); the few loaded without it (navbar's companions) get
    # the same hour.
    location ^~ /shared/ {
        alias /opt/openvibe.sites/dist/_shared/;
        add_header Cache-Control "public, max-age=3600";
        add_header Access-Control-Allow-Origin "*";
        ${sec}
    }

    # Only the files in dist/ exist; anything else is a real 404 with a page, never the front page.
    error_page 404 /404.html;
    location = /404.html { internal; }

    location / {
        add_header Cache-Control "public, max-age=600";
        ${sec}
        try_files $uri $uri.html $uri/ =404;
    }

    location ~ /\\.(?!well-known) { deny all; }
}
`;
}

const STATUS_CSS = `.live .sum{font-size:14px;color:var(--text-secondary);margin-bottom:14px;line-height:1.6}
.live .sum b{color:var(--text-primary)}
.live .tbl{overflow-x:auto;border:1px solid var(--border);border-radius:14px;background:var(--bg-card)}
.live table{width:100%;border-collapse:collapse;font-size:13px}
.live th,.live td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--border);vertical-align:top}
.live th{color:var(--text-muted);font-weight:600;font-size:12px}
.live tr:last-child td{border-bottom:0}
.live td.st-up{color:#4ade80}.live td.st-degraded{color:#facc15}.live td.st-down{color:#f87171}.live td.st-not-running,.live td.st-unknown{color:var(--text-muted)}
`;
/**
 * "Right now" on the status pointer: the summary and rows of Network's health poll, read in the browser
 * when the page opens from /api/v1/registry/health (public discovery: CORS-open to any origin, unlike
 * /api/v1/status, which keeps Network's first-party allow-list). Labels follow Network's status page: a
 * service that is up but not public reads "up (loopback only)", never a bare "up". Built with DOM nodes
 * (no innerHTML); without JavaScript, or when the API does not answer, the page says so and links the
 * status page.
 */
function liveStatus(site) {
    return `
  <section class="live" aria-live="polite">
    <h2>Right now</h2>
    <p class="lead2">Read from <a href="${esc(site.statusApi)}" style="color:inherit">${esc(site.statusApi.replace(/^https?:\/\//, ''))}</a> when this page opened.</p>
    <p class="sum" id="live-sum">Open the <a href="${esc(site.links[0][1])}" style="color:inherit">status page</a> for the current state of every service.</p>
    <div class="tbl" id="live-tbl" hidden><table><thead><tr><th>Service</th><th>Status</th><th>Where it runs</th></tr></thead><tbody id="live-rows"></tbody></table></div>
  </section>
<script>
(function () {
  var sum = document.getElementById('live-sum'), tbl = document.getElementById('live-tbl'), rows = document.getElementById('live-rows');
  if (!sum || !window.fetch) return;
  var WHERE = { live: 'public', internal: 'loopback only, no public site yet', library: 'library (nothing to run)', repository: 'repository (nothing running)', placeholder: 'planned (nothing running)' };
  function el(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = String(text); if (cls) n.className = cls; return n; }
  fetch('${esc(site.statusApi)}', { headers: { accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    var s = d.summary || {}, order = ['up', 'degraded', 'down', 'not-running', 'unknown'], parts = [];
    sum.textContent = '';
    order.forEach(function (k) { if (s[k] == null) return; var b = el('b', s[k]); var w = document.createDocumentFragment(); w.appendChild(b); w.appendChild(document.createTextNode(' ' + k.replace('-', ' '))); parts.push(w); });
    parts.forEach(function (p, i) { if (i) sum.appendChild(document.createTextNode(' · ')); sum.appendChild(p); });
    var at = d.checked_at;
    if (at) sum.appendChild(document.createTextNode(' · checked ' + new Date(at).toUTCString().replace(/ GMT$/, ' UTC')));
    (d.services || []).forEach(function (x) {
      var tr = document.createElement('tr');
      var st = String(x.status || 'unknown');
      tr.appendChild(el('td', x.id));
      tr.appendChild(el('td', (st === 'up' && x.state !== 'live' ? 'up (loopback only)' : st.replace('-', ' ')) + (x.stale ? ' (stale)' : ''), 'st-' + st));
      tr.appendChild(el('td', WHERE[x.state] || x.state || 'unknown'));
      rows.appendChild(tr);
    });
    if (rows.children.length) tbl.hidden = false;
  }).catch(function () { sum.textContent = 'The status API did not answer just now. Try the status page itself: ${esc(site.links[0][1])}'; });
})();
</script>
`;
}

/**
 * /release.json: what the shared release watcher (openvibe-shared release-watch, loaded by the navbar
 * on every page) asks each site for. A placeholder's release is the hash of its page with the dates
 * neutralised, so it changes exactly when the page does.
 */
function releaseJson(site, html) {
    const release = require('crypto').createHash('sha256').update(String(html).replace(/\d{4}-\d{2}-\d{2}/g, 'DATE')).digest('hex').slice(0, 12);
    return JSON.stringify({
        service: site.tld, release, released_at: `${today}T00:00:00.000Z`, booted_at: null, contracts_version: null,
        packages: { 'openvibe-shared': require('openvibe-shared/package.json').version },
        min_client_release: null, mixed_version_window_hours: 24, kind: 'placeholder',
    }, null, 2) + '\n';
}

/** /status.json: the same facts as the page, for scripts (CORS-open). */
function statusJson(site) {
    const f = repoFacts(site);
    const k = standing(site);
    const st = (f && f.status) || null; const rg = (f && f.registry) || null;
    return JSON.stringify({
        domain: site.domain, name: site.name, stage: site.kind || 'placeholder', live: false,
        plannedRepo: site.plannedRepo ? `OpenVibers/${site.plannedRepo}` : null,
        repoUrl: site.plannedRepo ? `https://github.com/OpenVibers/${site.plannedRepo}` : null,
        repoExists: !!site.plannedRepo,
        repoStage: STANDING[k].repoStage,
        service: f ? { stage: st && st.stage, code: st ? st.code : null, deployed: st ? st.deployed : null, statusCommit: st && st.commit, exposure: rg && rg.state, publicOrigin: rg && rg.origin } : null,
        launchWaitsFor: site.launch || null,
        factsAsOf: facts.generated,
        network: NET.networkUrl, updated: today,
        note: 'Static page served by OpenVibers/OpenVibe.Sites; service facts come from each repository\'s STATUS.json and the Network registry (facts.json). Removed from sites.json in the same release that the real service takes over this domain.',
    }, null, 2) + '\n';
}

function build() {
    const out = {};
    for (const site of catalog.sites) {
        out[`${site.domain}/index.html`] = page(site);
        out[`${site.domain}/release.json`] = releaseJson(site, out[`${site.domain}/index.html`]);
        out[`${site.domain}/404.html`] = notFound(site);
        out[`${site.domain}/robots.txt`] = robots(site);
        if (!site.kind) out[`${site.domain}/sitemap.xml`] = sitemap(site);
        out[`${site.domain}/manifest.webmanifest`] = manifest(site);
        out[`${site.domain}/status.json`] = statusJson(site);
        for (const kind of ['terms', 'privacy', 'dmca']) out[`${site.domain}/${kind}.html`] = legal.page(kind, legalSite(site));
        out[`../deploy/nginx/${site.domain}.conf`] = vhost(site);
    }
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
console.log(`built ${catalog.sites.length} sites → dist/`);
