# OpenVibe.Sites

OpenVibe.Sites is being deleted (plan T11). Since 2026-10-09 it serves only what is listed below; every other OpenVibe
domain is served by its own product, and OpenVibe.Network serves its subdomains and the parked domains (Network#107).

## Purpose

OpenVibe.Sites is the static-site host for the OpenVibe domains that no product serves yet. Today it keeps only
`openvibe.tips` and `openvibe.vip`, serving each domain's frozen front page, its legal pages (`terms.html`,
`privacy.html`, `dmca.html`), a real 404 page, `robots.txt`, `sitemap.xml`, `manifest.webmanifest` and `status.json`
from `dist/<domain>/`. It also carries `sites.json`, the generated mirror of the OpenVibe.Contracts product catalog,
and the pinned network browser files in `dist/_shared/`. Its visitors are the people who open the two domains; the
repository itself is on the way out, and when Tips and VIP launch with Billing (plan T5) it and its host checkout are
deleted.

## What is left

| Address | What Sites serves | Until |
| --- | --- | --- |
| `openvibe.tips` | its frozen front page, legal pages and vhost | OpenVibe.Tips launches with Billing (plan T5) |
| `openvibe.vip` | its frozen front page, legal pages and vhost | OpenVibe.VIP launches with Billing (plan T5) |

When Tips and VIP launch (plan T5), the repository and its host checkout are deleted. Bot (Bot#51, 2026-10-10) and Games serve their own legal pages. `frozen.json` lists the two frozen
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

## Owns

- The frozen files for `openvibe.tips` and `openvibe.vip`: `dist/<domain>/` (front page, legal pages, 404, robots, sitemap, manifest, status and release) and their `deploy/nginx/<domain>.conf` vhosts, listed in `frozen.json`.
- The generated copy of the network's shared browser files in `dist/_shared/` (the `BROWSER` list from the pinned openvibe-shared).
- `sites.json`, the generated mirror of the OpenVibe.Contracts product catalog, and the script that writes it (`scripts/sync-catalog.js`).
- `build.js` and the deploy wrapper `deploy/scripts/deploy.sh`.

## Does not own

- The product catalog itself: OpenVibe.Contracts (`products.catalog()`), which `sites.json` mirrors and must match.
- Every domain Sites no longer serves: the retired ones belong to their products (openvibe.news, openvibe.reviews, openvibe.trade, openvibe.coupons, openre.stream and others) or to OpenVibe.Network (its subdomains, the parked domains).
- Identity, accounts and sign-in: OpenVibe.Network. The shared browser files read a bearer token and call OpenVibe.Network, but Sites holds no account data.
- The legal page wording: openvibe-shared (`legal.page`) supplies it; Sites only renders it per domain.
- The Tips and VIP product itself, once it launches: OpenVibe.Tips and OpenVibe.VIP.

## Depends on

- `openvibe-contracts` v0.127.0 — `scripts/sync-catalog.js` reads `openvibe-contracts/lib/products` (`catalog()`) to generate `sites.json`.
- `openvibe-shared` v2.20.4 — `build.js` uses `legal` for the terms, privacy and dmca pages, `files` for the `BROWSER` list copied to `dist/_shared/`, and `app-icon` for the manifest and head tags; `test/run.js` uses `test-runner`.
- OpenVibe.Host — the deploy wrapper calls `ovhost deploy sites --restart`, or `ovhost plan sites --restart` with `DRY_RUN=1`.
- OpenVibe.Network at `https://openvibe.network` — the frozen pages and shared browser files load its assets and API in the browser; `NET.networkUrl` in `build.js` is that base.

## Capabilities

- Sites checks and requires no OpenVibe capability, and holds no grant on another service: it serves static files and calls no service API.
- The deploy wrapper requires `ovhost` to be installed and exits with an error if it is missing.

## Acceptance

- `npm test` runs every `test/*.test.js` in its own process (`node test/run.js`, the openvibe-shared test-runner). `npm test -- build` selects files whose name contains a word, and `npm test -- --strict` makes a skipped test fail the run. The `ov test ...` lines above are the same tests.
- `node build.js --check` verifies the generated files are current; `test/build.test.js` runs it.
- `test/build.test.js` proves the generated files are current, that `frozen.json` is exactly openvibe.tips and openvibe.vip, that every retired domain has left `dist/` and `deploy/nginx/`, that each frozen page says it is a placeholder with no pricing or unbacked-hosting copy, and (for any notice) the noindex, destination links, files and true-404 vhost.
- `test/sync-catalog.test.js` proves `scripts/sync-catalog.js --check` passes (sites.json matches the Contracts catalog), that every vhost in `deploy/nginx/` has a `sites.json` entry with a home in the catalog, and that `dropNoRepo` stops a row carrying both `plannedRepo` and `noRepo`.
- `test/deploy-wrapper.test.js` drives `deploy/scripts/deploy.sh` against a fake ovhost: it runs `ovhost deploy sites --restart`, `DRY_RUN=1` runs `ovhost plan sites --restart` instead, ovhost's exit code is the wrapper's, and a missing ovhost produces an error.

## Security

- Sites has no server process, token or environment file; it writes static files at build time, so there is no request input, auth surface or rate limiting to configure.
- The build is offline; deployment runs `npm ci` to fetch the two pinned packages over HTTPS from codeload.github.com.
- Generated HTML is built from committed page snapshots and openvibe-shared templates, not user input; the generated 404 page escapes the values it interpolates (`esc` in `build.js`).
- Every vhost sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin` and HSTS (`max-age=31536000`), denies dotfiles except `/.well-known` (where the host serves `security.txt`), and returns a real 404 (`try_files $uri $uri.html $uri/ =404`) instead of the front page.
- `robots.txt` disallows `/auth/`; CI runs the shared secret scan (gitleaks) and dependency audit workflows.

## Deploy

- Production is the checkout `/opt/openvibe.sites`. It is deployed by running `deploy/scripts/deploy.sh` on the host, a thin wrapper around `sudo ovhost deploy sites --restart` (OpenVibe.Host, strategy static-build, since the 2026-09-27 cutover).
- ovhost pulls first (restoring the tracked `dist/` a previous build rewrote and fast-forwarding the checkout), then runs `npm ci` and `node build.js`, installs every `deploy/nginx/*.conf` into `/etc/nginx/sites-available/` and enables it behind `nginx -t` (a failure puts the previous vhosts back and does not reload nginx), and sends one `ovhost announce` release per `dist/<domain>/release.json`.
- `DRY_RUN=1` runs `ovhost plan sites --restart` instead. If ovhost is missing, the wrapper exits with an error.
- There is no systemd unit, no port and no environment file. nginx serves each domain from `root /opt/openvibe.sites/dist/<domain>` through `deploy/nginx/<domain>.conf`. A vhost removed from `deploy/nginx/` stays installed on the host until it is removed by hand.

Report security issues through [SECURITY.md](SECURITY.md).

<!-- versions:start -->
- openvibe-contracts: v0.127.0
- openvibe-shared: v2.20.4
<!-- versions:end -->
