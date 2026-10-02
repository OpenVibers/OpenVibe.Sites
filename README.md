# OpenVibe.Sites

## Purpose

Frozen (plan T11 lane D, 2026-10-02): the product catalog lives in OpenVibe.Contracts (`products.catalog()`,
v0.84.0) and `sites.json` is its generated mirror (`node scripts/sync-catalog.js`). The placeholder pages in
`dist/<domain>/` and the vhosts in `deploy/nginx/` are no longer generated: they stay as committed until each
product serves its own domain ([docs/retirement.md](docs/retirement.md)).

Static front pages for the OpenVibe domains that are not public applications yet. As of
2026-09-24 (`sites.json`; production ran `18166b1` when this was written): `openvibe.news`,
`.reviews`, `.tips`, `.vip`, `.trade`, `.host`, `.deals`, `.coupons`, `openre.stream`, the planned products added
2026-09-28 whose repositories do not exist yet (`noRepo`: `openvibe.pics`, `.download`, `.space`, `.food`, `.quest`,
`.rent`, `.homes`, `.services`, `.run`, `.video`, `.website`, `.help`, `.bot`, `.watch`, `.actor`), `openvibe.events`
(OpenVibe.Events' future home; its API runs at events.openvibe.network), `ai.openvibe.services` (OpenVibe.AI's
public home), and `auth`, `api`, `admin` and `themes` under `openvibe.network`. Most of these already run on the host
behind loopback (News, Reviews, Tips, VIP, Trade, Host, Deals, Coupons, OpenRe.Stream, AI); the page stays until the service launches publicly on its domain, and says
so (see facts below). Three more are notices, not placeholders (`kind` in `sites.json`: noindex, no
sitemap, not listed as opening): `ai.openvibe.network` says OpenVibe.AI moved to `ai.openvibe.services` (it redirects once
every client has moved), `realtime.openvibe.network` says OpenVibe.Realtime is closed (ADR-005:
realtime delivery is part of OpenVibe.Events), and `status.openvibe.network` points at the status
Network publishes (`openvibe.network/status`), with a live summary read in the browser from the
CORS-open `/api/v1/registry/health`.
`openvibe.codes`, `openvibe.wiki`, `openvibe.blog`, `openvibe.chat` (2026-09-24), `events.openvibe.network` and
`billing.openvibe.network` have left for their own services. One catalog (`sites.json`), one template
(`build.js`), real pages: what the site will be, what to use on the network meanwhile, the whole
network, sign-in — with the OpenVibe Frame (navbar, footer, theme loader) from this repository's
pinned openvibe-shared, copied into `dist/_shared/` and served at `/shared/` on every placeholder, so a
page keeps its frame while Network is down; full SEO (canonical, Open Graph, Twitter, JSON-LD, robots,
sitemap, manifest).

## Owns

- `sites.json`, generated from the Contracts catalog (fields Contracts does not carry keep their frozen value)
- the frozen `dist/<domain>/` pages (checked in), with a `404.html` and a `release.json` per domain, and the
  legal pages and `dist/_shared/` that `build.js` still writes
- the frozen nginx vhosts `deploy/nginx/<domain>.conf` for those domains

## Does not own

- any product: a domain leaves the catalog when its own service launches on it
- the facts themselves (each repository's `STATUS.json`, Network's registry), the Frame (OpenVibe.Shared)
- certificates (certbot on the host) and DNS (Cloudflare)

## Depends on

- `openvibe-shared` v2.3.1 (the Frame files, legal pages), pinned by release tarball
- `openvibe-contracts` v0.84.0 (the product catalog `sites.json` mirrors), pinned by release tarball
- in the browser, the status page reads Network's CORS-open `/api/v1/registry/health`
- OpenVibe.Host (`ovhost deploy sites`, strategy `static-build`) and nginx on the host

## Capabilities

None: Sites implements no capability, holds no grant and calls no service with a token. The pages load
only their own files, and the status notice reads Network's public health endpoint in the browser.

## Tests and build

```
npm ci                              # the pinned openvibe-shared and openvibe-contracts (package.json)
node scripts/sync-catalog.js        # rewrite sites.json from the Contracts catalog
node scripts/sync-catalog.js --check  # fails when sites.json differs from it
node build.js                       # dist/<domain>/{terms,privacy,dmca}.html + dist/_shared/
node build.js --check               # fails when those are stale
npm test
```

`npm test` runs `test/build.test.js` (the legal pages and `dist/_shared/` are current; every frozen page,
404 page and vhost is still there and honest; a live service's domain is never also a placeholder),
`test/sync-catalog.test.js` (`sites.json` matches the Contracts catalog and every vhost's domain is in it)
and `test/deploy-wrapper.test.js` (the deploy wrapper and its fallback, against a fake ovhost and a temp
checkout).

Every domain also gets a `404.html`: its vhost answers any path that is not a file in
`dist/<domain>/` with status 404 and that page (`try_files … =404` + `error_page 404 /404.html`),
never the front page.

## Security

Reporting a vulnerability: [SECURITY.md](SECURITY.md). The pages are static: no server code, no
forms and no secrets (the Frame's navbar asks Network for the visitor's session, as on every site). Every vhost sets `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy` and HSTS (repeated in each location that adds headers), and answers
unknown paths with 404. Placeholders are `noindex` where they are notices and never claim a product is
live (`test/build.test.js` checks the frozen pages).

## Deploy

Deploy (host): the repo lives at `/opt/openvibe.sites`. `sudo deploy/scripts/deploy.sh` runs
`ovhost deploy sites --restart` (OpenVibe.Host, strategy `static-build`; `DRY_RUN=1` for the plan). ovhost
pulls first, as the checkout owner, so a stale checkout never installs old vhosts: it restores the tracked
`dist/` the last build rewrote, fast-forwards, runs `npm ci` and `node build.js`, installs and enables every
`deploy/nginx/*.conf` behind `nginx -t` (a failing test puts the previous vhost files back, never reloads
nginx, and restores the checkout and `dist/`), then reloads nginx. Each domain has a Let's Encrypt wildcard
certificate (`certbot --dns-cloudflare`, see the host's renewal configs). Then, for each placeholder, it
publishes `host.release.published` with the service and release id from that placeholder's `release.json`
and `https://<domain>` as the origin, once per release, so open tabs check `/release.json` within seconds
(WS-P task 9); this is best effort, stops at the first failure and never fails the deploy. A vhost that left
`deploy/nginx/` stays installed and is named in the output: remove it by hand once its domain is served
elsewhere. When ovhost is missing, too old or does not deploy Sites with that strategy, the wrapper pulls
and runs `deploy/scripts/deploy-legacy.sh`, the previous script, unchanged (`OVHOST_LEGACY=1` forces it).

Rollback: there is no ready URL, so nothing is automatic; `sudo ovhost rollback sites --to <sha>` rebuilds
that commit and installs its vhosts behind `nginx -t`. There is no env file, unit or port: nginx serves
`dist/` directly.

Which product takes over each domain: [docs/retirement.md](docs/retirement.md). A domain leaves `sites.json`
when it leaves the Contracts catalog; its vhost goes only once its product serves the domain.
