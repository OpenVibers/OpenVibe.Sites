# OpenVibe.Sites

OpenVibe.Sites serves static notices for three addresses during the domain handoff. It no longer builds product placeholders. `notices.json` is the build input; `frozen.json` records the 32 product domains whose existing `dist/<domain>/index.html` and nginx vhosts remain in place until their owners complete the DNS and nginx cutover. OpenVibe.Bot owns its own vhost.

## Remaining notices

| Address | Purpose | Vhost owner |
| --- | --- | --- |
| `ai.openvibe.network` | Moved address for OpenVibe.AI | Sites |
| `realtime.openvibe.network` | Closed service notice | Sites |
| `status.openvibe.network` | Pointer to Network status | Sites |

All three are `noindex`. The existing page presentation is held in `notice-pages/`; the notice build writes only these domains and shared browser assets. The status notice still reads Network's public health endpoint in the browser.

## Frozen product pages

`frozen.json` lists all 32 product domains, including OpenVibe.Actor and OpenVibe.Bot. Their committed front pages remain available as static files with their original indexing, status, and sitemaps. The build does not regenerate them. `node build.js --check` verifies that each frozen domain still has an index page and a Sites vhost where Sites owns one, while checking that notice outputs are current. The old catalog and repository facts snapshots are historical data, not build inputs.

The owner cutover will transfer DNS and nginx ownership one domain at a time after each product can serve its address. That work is outside this repository change. Until then, the existing product pages and vhosts continue to serve their addresses. A missing file path is a real 404 through `try_files ... =404` and `error_page 404 /404.html`.

## Build and verification

```sh
node build.js
node build.js --check
ov test test/build.test.js
ov test test/deploy-wrapper.test.js
```

The pinned `openvibe-shared` release supplies the Frame browser files under `dist/_shared/`. The deploy wrapper remains the existing OpenVibe.Host static build path. Sites has no server process, port, token, or environment file. The owner manages certificates and DNS.

Report security issues through [SECURITY.md](SECURITY.md).
