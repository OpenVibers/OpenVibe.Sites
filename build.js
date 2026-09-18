#!/usr/bin/env node
'use strict';
/**
 * OpenVibe.Sites — static front pages for the network's domains that are not full apps yet.
 *
 *   node build.js            → dist/<domain>/{index.html,robots.txt,sitemap.xml,manifest.webmanifest}
 *   node build.js --check    → exit 1 when dist/ is stale (CI / deploy guard)
 *
 * One template, one catalog (sites.json). Every page is real content for people and crawlers:
 * what the site will be, what to use meanwhile, the whole network, sign-in — with the shared
 * navbar/footer/theme loader from openvibe.network so the domain already feels like the rest of
 * the network. No build step at request time: nginx serves the files.
 */
const fs = require('fs');
const path = require('path');
// Vendored from OpenVibe.Network/packages/openvibe-shared (copy, never edit): the network's legal documents.
const legal = require('./vendor/openvibe-shared/legal');
// Which clauses apply to each domain once it opens (mirrors OpenVibe.Network/server/chrome/sites.js).
const LEGAL_PROFILE = { chat: 'ugc', codes: 'ugc', blog: 'info', wiki: 'ugc', news: 'info', reviews: 'ugc', tips: 'streaming', vip: 'account', trade: 'ugc', host: 'hosting', deals: 'info', coupons: 'info', stream: 'streaming' };
// Sites whose own server has no page routes: their legal pages are built here and served by nginx.
const LEGAL_ONLY = [{ domain: 'openvibe.games', name: 'OpenVibe.Games', id: 'games', profile: 'games' }];
const legalSite = (site) => ({ id: site.tld, service: 'network', host: site.domain, name: site.name, profile: LEGAL_PROFILE[site.tld] || 'info' });

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8'));
const NET = catalog.network;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = new Date().toISOString().slice(0, 10);

function hexToRgb(hex) { const m = String(hex).replace('#', ''); const n = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }

function page(site) {
    const core = site.core || NET.core;
    const url = `https://${site.domain}/`;
    const title = `${site.name} — ${site.tagline}`;
    const ogImage = `${NET.networkUrl}/assets/logo-512.png`;
    const others = NET.liveSites.filter(s => s.url !== url.slice(0, -1));
    const siblings = catalog.sites.filter(s => s.domain !== site.domain);
    const ld = {
        '@context': 'https://schema.org',
        '@graph': [
            { '@type': 'WebSite', '@id': `${url}#site`, url, name: site.name, description: site.description, inLanguage: 'en',
              publisher: { '@type': 'Organization', '@id': `${NET.networkUrl}/#org`, name: 'OpenVibe', url: `${NET.networkUrl}/`, logo: ogImage, sameAs: [NET.github, NET.discord] },
              isPartOf: { '@type': 'WebSite', '@id': `${NET.networkUrl}/#site`, name: 'OpenVibe.Network', url: `${NET.networkUrl}/` } },
            { '@type': 'WebPage', '@id': `${url}#page`, url, name: title, description: site.description, isPartOf: { '@id': `${url}#site` }, datePublished: today, dateModified: today,
              breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'OpenVibe', item: `${NET.networkUrl}/` }, { '@type': 'ListItem', position: 2, name: site.name, item: url }] } },
        ],
    };
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(site.description)}">
<meta name="keywords" content="${esc(site.keywords || '')}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="${esc(site.accent)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="${NET.networkUrl}/assets/favicon.svg" type="image/svg+xml">
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
<script src="${NET.networkUrl}/shared/theme-loader.js"></script>
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
@media (max-width:600px){.hero{padding-top:56px}.ctas .btn{width:100%;justify-content:center}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<div class="orbs"><i></i><i></i><i></i></div>
<div id="navbar-mount"></div>
<main class="wrap">
  <header class="hero">
    <div class="mark"><i class="fa-solid ${esc(site.icon)}" aria-hidden="true"></i></div>
    <div class="badge"><span class="ov-mark" data-size="16" data-variant="${esc(site.tld)}"></span> Part of the OpenVibe network · <b>opening soon</b></div>
    <h1>${esc(core)}<span class="d">.</span><span class="tld">${esc(site.name.split('.').pop())}</span></h1>
    <div class="tag">${esc(site.tagline)}</div>
    <p class="lead">${esc(site.description)}</p>
    <div class="ctas">
      <a class="btn btn-primary" href="${NET.networkUrl}/login?return=${encodeURIComponent(url)}"><i class="fa-solid fa-right-to-bracket"></i> Sign in with OpenVibe</a>
      <a class="btn" href="${NET.networkUrl}/#network"><i class="fa-solid fa-circle-nodes"></i> The whole network</a>
      <a class="btn" href="${esc(NET.discord)}" rel="noopener"><i class="fa-brands fa-discord"></i> Follow the build</a>
    </div>
  </header>

  <section>
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

  <section class="net">
    <h2>The OpenVibe network</h2>
    <p class="lead2">One account for all of it. Sign in once and every site signs you in.</p>
    <div class="grid">
      ${others.map(s => `<a class="card" href="${esc(s.url)}"><div class="ic"><i class="fa-solid ${esc(s.icon)}" aria-hidden="true"></i></div><b>${esc(s.name)}</b><span>${esc(s.desc)}</span><span class="go">${esc(s.url.replace(/^https?:\/\//, ''))} →</span></a>`).join('\n      ')}
    </div>
    <h2 style="margin-top:28px;font-size:16px">More rooms opening</h2>
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
<div id="ov-footer"></div>
<script src="${NET.networkUrl}/shared/ov-mark.js" async></script>
<script src="${NET.networkUrl}/shared/navbar.js"></script>
<script src="${NET.networkUrl}/shared/footer.js"></script>
<script>
(function () {
  if (window.OpenVibeNavbar) { try { OpenVibeNavbar.init({ service: '${esc(site.tld)}', apiBase: '${NET.networkUrl}', links: [{ label: 'What it will be', href: '#what' }, { label: 'The network', href: '${NET.networkUrl}/#network', external: false }], history: { type: 'page', title: '${esc(site.name)}' } }); } catch (e) {} }
  if (window.OpenVibeFooter) { try { OpenVibeFooter.init({ service: '${esc(site.tld)}', variant: 'full', links: [{ heading: '${esc(site.name)}', items: [{ name: 'Sign in', url: '${NET.networkUrl}/login?return=${encodeURIComponent(url)}' }, { name: 'The network', url: '${NET.networkUrl}/#network' }, { name: 'Discord', url: '${esc(NET.discord)}' }] }] }); } catch (e) {} }
})();
</script>
</body>
</html>
`;
}

function robots(site) { return `User-agent: *\nAllow: /\nDisallow: /auth/\nSitemap: https://${site.domain}/sitemap.xml\n`; }
function sitemap(site) { return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://${site.domain}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`; }
function manifest(site) { return JSON.stringify({ name: site.name, short_name: site.name.split('.').pop(), start_url: '/', display: 'standalone', background_color: '#0a0f1c', theme_color: site.accent, icons: [{ src: `${NET.networkUrl}/assets/logo-192.png`, sizes: '192x192', type: 'image/png' }, { src: `${NET.networkUrl}/assets/logo-512.png`, sizes: '512x512', type: 'image/png' }] }, null, 2) + '\n'; }

/** nginx vhost: static root, wildcard cert, www → apex, long cache for the immutable bits. */
function vhost(site) {
    const d = site.domain;
    return `# ${d} — static front page (OpenVibe.Sites). Generated by build.js; edit sites.json, not this.
server {
    listen 80;
    listen [::]:80;
    server_name ${d} www.${d};
    return 301 https://${d}$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name www.${d};
    ssl_certificate     /etc/letsencrypt/live/${d}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${d}/privkey.pem;
    return 301 https://${d}$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${d};

    ssl_certificate     /etc/letsencrypt/live/${d}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${d}/privkey.pem;

    root /opt/openvibe.sites/dist/${d};
    index index.html;

    access_log /var/log/nginx/${d}.access.log;
    error_log  /var/log/nginx/${d}.error.log;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    gzip on;
    gzip_types text/html text/plain text/css application/json application/javascript application/xml image/svg+xml application/manifest+json;

    location = /robots.txt  { add_header Cache-Control "public, max-age=3600"; }
    location = /sitemap.xml { add_header Cache-Control "public, max-age=3600"; types { application/xml xml; } }
    location = /manifest.webmanifest { types { application/manifest+json webmanifest; } add_header Cache-Control "public, max-age=86400"; }

    location / {
        add_header Cache-Control "public, max-age=600";
        try_files $uri $uri.html $uri/ /index.html;
    }

    location ~ /\\.(?!well-known) { deny all; }
}
`;
}

function build() {
    const out = {};
    for (const site of catalog.sites) {
        out[`${site.domain}/index.html`] = page(site);
        out[`${site.domain}/robots.txt`] = robots(site);
        out[`${site.domain}/sitemap.xml`] = sitemap(site);
        out[`${site.domain}/manifest.webmanifest`] = manifest(site);
        for (const kind of ['terms', 'privacy', 'dmca']) out[`${site.domain}/${kind}.html`] = legal.page(kind, legalSite(site));
        out[`../deploy/nginx/${site.domain}.conf`] = vhost(site);
    }
    for (const g of LEGAL_ONLY) for (const kind of ['terms', 'privacy', 'dmca']) out[`${g.domain}/${kind}.html`] = legal.page(kind, { id: g.id, service: g.id, host: g.domain, name: g.name, profile: g.profile });
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
