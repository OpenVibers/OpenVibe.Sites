# OpenVibe.Sites

## Purpose

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

- the catalog `sites.json`, the template `build.js` and the generated `dist/<domain>/` pages
  (checked in), with a `404.html` and a `release.json` per domain
- the nginx vhosts `deploy/nginx/<domain>.conf` for those domains
- `facts.json`, the committed snapshot of each repository's `STATUS.json` and Network's registry exposure

## Does not own

- any product: a domain leaves the catalog when its own service launches on it
- the facts themselves (each repository's `STATUS.json`, Network's registry), the Frame (OpenVibe.Shared)
- certificates (certbot on the host) and DNS (Cloudflare)

## Depends on

- `openvibe-shared` v2.5.0 (the Frame files, SEO helpers), pinned by release tarball
- the sibling checkouts' `STATUS.json` and Network's `/api/v1/registry/services` (only when refreshing
  `facts.json`); in the browser, the status page reads Network's CORS-open `/api/v1/registry/health`
- OpenVibe.Host (`ovhost deploy sites`, strategy `static-build`) and nginx on the host

## Capabilities

None: Sites implements no capability, holds no grant and calls no service with a token. The pages load
only their own files, and the status notice reads Network's public health endpoint in the browser.

## Tests and build

```
npm ci                   # openvibe-shared: the pinned OpenVibe.Shared release (package.json)
node scripts/facts.js    # refresh facts.json (each repo's STATUS.json + Network's registry exposure)
node build.js            # dist/<domain>/… + deploy/nginx/<domain>.conf
node build.js --check    # fails when dist/ is stale
npm test                 # dist current; labels match facts.json; facts.json matches the sibling STATUS.json files
```

What a page says about its product comes from `facts.json`, never from a hand-kept list: each
repository's committed `STATUS.json` (read from the sibling `~/OpenVibers/<repo>` checkouts at HEAD)
and Network's registry exposure (`/api/v1/registry/services`). A product whose service runs is
labelled "in development" with what its public launch waits for (`launch` in `sites.json`); a
subdomain of a live service says it is not routed yet; only a repository with no code says
"charter only". The build reads the committed snapshot, so it is reproducible; `npm test` fails
locally when a sibling's `STATUS.json` stage or code flag no longer matches it.

`npm test` runs `test/build.test.js` (dist is current; every label matches `facts.json`; no shared file
comes from openvibe.network and each `/shared` URL carries its file's hash; a live service's domain is
never also a placeholder; 404 pages) and `test/deploy-wrapper.test.js` (the deploy wrapper and its
fallback, against a fake ovhost and a temp checkout).

Every domain also gets a `404.html`: its vhost answers any path that is not a file in
`dist/<domain>/` with status 404 and that page (`try_files … =404` + `error_page 404 /404.html`),
never the front page.

## Security

Reporting a vulnerability: [SECURITY.md](SECURITY.md). The pages are static: no server code, no
forms and no secrets (the Frame's navbar asks Network for the visitor's session, as on every site). Every vhost sets `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy` and HSTS (repeated in each location that adds headers), and answers
unknown paths with 404. Placeholders are `noindex` where they are notices and never claim a product is
live (`test/build.test.js` holds labels to `facts.json`).

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
elsewhere. openvibe.bot is the exception to removing it by hand: sites.json gives its vhost to OpenVibe.Bot
(`vhostOwner`), whose first deploy installs its own openvibe.bot.conf over the one left here; until then the
Sites vhost keeps serving the page. When ovhost is missing, too old or does not deploy Sites with that
strategy, the wrapper pulls and runs `deploy/scripts/deploy-legacy.sh`, the previous script, unchanged
(`OVHOST_LEGACY=1` forces it).

Rollback: there is no ready URL, so nothing is automatic; `sudo ovhost rollback sites --to <sha>` rebuilds
that commit and installs its vhosts behind `nginx -t`. There is no env file, unit or port: nginx serves
`dist/` directly.

When a domain becomes a real app, delete it from `sites.json`, remove its vhost, and point the
domain's nginx block at the new service — nothing else references it.
