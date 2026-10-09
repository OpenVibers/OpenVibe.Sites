# OpenVibe.Sites

OpenVibe.Sites is being deleted (plan T11). Since 2026-10-09 it serves only what is listed below; every other OpenVibe
domain is served by its own product, and OpenVibe.Network serves its subdomains and the parked domains (Network#107).

## What is left

| Address | What Sites serves | Until |
| --- | --- | --- |
| `openvibe.tips` | its frozen front page, legal pages and vhost | OpenVibe.Tips launches with Billing (plan T5) |
| `openvibe.vip` | its frozen front page, legal pages and vhost | OpenVibe.VIP launches with Billing (plan T5) |
| `openvibe.bot` | legal pages, 404, sitemap and manifest (OpenVibe.Bot's vhost serves them from here) | Bot serves its own legal pages |
| `openvibe.games` | legal pages (OpenVibe.Games' vhost serves them from here) | Games serves its own legal pages |

When the last of these moves, the repository and its host checkout are deleted. `frozen.json` lists the two frozen
domains and `node build.js --check` verifies each still has its page and vhost. `notices.json` is empty: the
realtime and status notices became Network redirects.

### Where the retired domains went (2026-10-09)

- **Their own products** (after an independent pre-launch security review): openvibe.news, openvibe.reviews,
  openvibe.trade, openvibe.coupons and openre.stream.
- **OpenVibe.Network:**
  - status., themes., admin., auth. and api.openvibe.network permanently redirect to the openvibe.network page that
    does their job (`network-subdomains.conf`).
  - openvibe.homes, openvibe.run, openvibe.website, openvibe.zone and realtime.openvibe.network have no product yet.
    They redirect to the network's front door (`parked-domains.conf`).

## Product catalog

The product catalog lives in OpenVibe.Contracts (`products.catalog()`, v0.84.0). `sites.json` is its generated mirror (`node scripts/sync-catalog.js`; `--check` fails when it differs); fields Contracts does not carry keep their frozen value, and a domain missing from the catalog is kept and reported, never dropped. `sites.json` is not a build input. Which product takes over each domain: [docs/retirement.md](docs/retirement.md).

A vhost removed from `deploy/nginx/` stays installed on the host until it is removed by hand. On 2026-10-09 the
retired ones were swapped out behind `nginx -t` (backups under `/root/vhost-swap-*` and `/root/nginx-*.bak-*`).

## Build and verification

```sh
node build.js
node build.js --check
node scripts/sync-catalog.js --check
ov test test/build.test.js
ov test test/sync-catalog.test.js
ov test test/deploy-wrapper.test.js
```

The pinned `openvibe-contracts` release supplies the catalog `sites.json` mirrors; the pinned `openvibe-shared` release supplies the Frame browser files under `dist/_shared/`. The deploy wrapper remains the existing OpenVibe.Host static build path. Sites has no server process, port, token, or environment file.

Report security issues through [SECURITY.md](SECURITY.md).

<!-- versions:start -->
- openvibe-contracts: v0.122.1
- openvibe-shared: v2.17.0
<!-- versions:end -->
