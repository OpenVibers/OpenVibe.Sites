# OpenVibe.Sites

Static front pages for the OpenVibe domains that are not public applications yet. As of
2026-09-23 (`sites.json`, deployed at `d3b71af`): `openvibe.chat`, `.news`, `.reviews`, `.tips`,
`.vip`, `.trade`, `.host`, `.deals`, `.coupons`, `openre.stream`, and `auth`, `api`, `admin`,
`themes`, `realtime` and `ai` under `openvibe.network`. Several of these already run on the host
behind loopback (News, Reviews, Tips, VIP, Trade, Host, Deals, Coupons, OpenRe.Stream, AI, and Chat
on openvibe.live's paths); the page stays until the service launches publicly on its domain.
`openvibe.codes`, `openvibe.wiki`, `openvibe.blog`, `events.openvibe.network` and
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

Deploy (host): the repo lives at `/opt/openvibe.sites`; `deploy/scripts/deploy.sh` runs `npm ci`, rebuilds, installs
the vhosts into `/etc/nginx/sites-available`, enables them and reloads nginx. Each domain has a
Let's Encrypt wildcard certificate (`certbot --dns-cloudflare`, see the host's renewal configs).

When a domain becomes a real app, delete it from `sites.json`, remove its vhost, and point the
domain's nginx block at the new service — nothing else references it.
