# OpenVibe.Sites

OpenVibe.Sites serves static notices for two addresses during the domain handoff. It no longer builds product placeholders. `notices.json` is the build input; `frozen.json` records the 27 product domains whose existing `dist/<domain>/index.html` and nginx vhosts remain in place until their owners complete the DNS and nginx cutover. OpenVibe.Bot serves its own front page, robots.txt, release.json and status.json (OpenVibe.Bot#34, 2026-10-07), so Sites keeps only its legal pages, 404 page, sitemap and manifest there. OpenVibe.Events serves openvibe.events with its own vhost since 2026-10-07 (Events#16), so Sites keeps nothing for that domain. OpenVibe.Space serves openvibe.space with its own vhost since 2026-10-07 (Space#1, the forum moved off OpenVibe.Community), so Sites keeps nothing there either. OpenVibe.AI serves ai.openvibe.services and answers 301 from ai.openvibe.network with its own vhosts since 2026-10-07 (AI#23), so the moved notice and the AI placeholder are gone.

## Remaining notices

| Address | Purpose | Vhost owner |
| --- | --- | --- |
| `realtime.openvibe.network` | Closed service notice | Sites |
| `status.openvibe.network` | Pointer to Network status | Sites |

Both are `noindex`. The existing page presentation is held in `notice-pages/`; the notice build writes only these domains and shared browser assets. The status notice still reads Network's public health endpoint in the browser.

## Frozen product pages

`frozen.json` lists all 25 product domains. Their committed front pages remain available as static files with their original indexing, status, and sitemaps. The build does not regenerate them. `node build.js --check` verifies that each frozen domain still has an index page and a Sites vhost, while checking that notice outputs are current. The repository facts snapshot is historical data, not a build input.

## Product catalog

The product catalog lives in OpenVibe.Contracts (`products.catalog()`, v0.84.0). `sites.json` is its generated mirror (`node scripts/sync-catalog.js`; `--check` fails when it differs); fields Contracts does not carry keep their frozen value, and a domain missing from the catalog is kept and reported, never dropped. `sites.json` is not a build input. Which product takes over each domain: [docs/retirement.md](docs/retirement.md).

The owner cutover will transfer DNS and nginx ownership one domain at a time after each product can serve its address. That work is outside this repository change. Until then, the existing product pages and vhosts continue to serve their addresses. A missing file path is a real 404 through `try_files ... =404` and `error_page 404 /404.html`.

## Build and verification

```sh
node build.js
node build.js --check
node scripts/sync-catalog.js --check
ov test test/build.test.js
ov test test/sync-catalog.test.js
ov test test/deploy-wrapper.test.js
```

The pinned `openvibe-contracts` release supplies the catalog `sites.json` mirrors; the pinned `openvibe-shared` release supplies the Frame browser files under `dist/_shared/`. The deploy wrapper remains the existing OpenVibe.Host static build path. Sites has no server process, port, token, or environment file. The owner manages certificates and DNS.

Report security issues through [SECURITY.md](SECURITY.md).

<!-- versions:start -->
- openvibe-contracts: v0.115.0
- openvibe-shared: v2.13.2
<!-- versions:end -->
