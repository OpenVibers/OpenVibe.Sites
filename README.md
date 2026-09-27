# OpenVibe.Sites

Static front pages for the OpenVibe domains that are not public applications yet. As of
2026-09-24 (`sites.json`; production ran `18166b1` when this was written): `openvibe.news`,
`.reviews`, `.tips`, `.vip`, `.trade`, `.host`, `.deals`, `.coupons`, `openre.stream`, and `auth`,
`api`, `admin`, `themes` and `ai` under `openvibe.network`. Most of these already run on the host
behind loopback (News, Reviews, Tips, VIP, Trade, Host, Deals, Coupons, OpenRe.Stream, AI); the page stays until the service launches publicly on its domain, and says
so (see facts below). Two more are notices, not placeholders (`kind` in `sites.json`: noindex, no
sitemap, not listed as opening): `realtime.openvibe.network` says OpenVibe.Realtime is closed (ADR-005:
realtime delivery is part of OpenVibe.Events), and `status.openvibe.network` points at the status
Network publishes (`openvibe.network/status`), with a live summary read in the browser from the
CORS-open `/api/v1/registry/health`.
`openvibe.codes`, `openvibe.wiki`, `openvibe.blog`, `openvibe.chat` (2026-09-24), `events.openvibe.network` and
`billing.openvibe.network` have left for their own services. One catalog (`sites.json`), one template
(`build.js`), real pages: what the site will be, what to use on the network meanwhile, the whole
network, sign-in — with the shared navbar, footer and theme loader from openvibe.network, full
SEO (canonical, Open Graph, Twitter, JSON-LD, robots, sitemap, manifest).

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

Every domain also gets a `404.html`: its vhost answers any path that is not a file in
`dist/<domain>/` with status 404 and that page (`try_files … =404` + `error_page 404 /404.html`),
never the front page.

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

When a domain becomes a real app, delete it from `sites.json`, remove its vhost, and point the
domain's nginx block at the new service — nothing else references it.
