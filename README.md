# OpenVibe.Sites

Static front pages for the OpenVibe domains that are not full applications yet
(`openvibe.chat`, `.codes`, `.blog`, `.wiki`, `.news`, `.reviews`, `.tips`, `.vip`, `.trade`,
`.host`, `.deals`, `.coupons`, `openre.stream`). One catalog (`sites.json`), one template
(`build.js`), real pages: what the site will be, what to use on the network meanwhile, the whole
network, sign-in — with the shared navbar, footer and theme loader from openvibe.network, full
SEO (canonical, Open Graph, Twitter, JSON-LD, robots, sitemap, manifest).

```
npm ci                   # openvibe-shared: the pinned OpenVibe.Shared release (package.json)
node build.js            # dist/<domain>/… + deploy/nginx/<domain>.conf
node build.js --check    # fails when dist/ is stale
```

Deploy (host): the repo lives at `/opt/openvibe.sites`; `deploy/scripts/deploy.sh` runs `npm ci`, rebuilds, installs
the vhosts into `/etc/nginx/sites-available`, enables them and reloads nginx. Each domain has a
Let's Encrypt wildcard certificate (`certbot --dns-cloudflare`, see the host's renewal configs).

When a domain becomes a real app, delete it from `sites.json`, remove its vhost, and point the
domain's nginx block at the new service — nothing else references it.
