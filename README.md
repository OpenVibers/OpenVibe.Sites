# OpenVibe.Sites

OpenVibe.Sites serves static notices for five addresses during the domain handoff. It no longer builds product placeholders. `notices.json` is the build input; `frozen.json` records the 30 product domains whose existing `dist/<domain>/index.html` and `deploy/nginx/<domain>.conf` remain in place until their owners complete the DNS and nginx cutover.

## Remaining notices

| Address | Purpose | Vhost owner |
| --- | --- | --- |
| `ai.openvibe.network` | Moved address for OpenVibe.AI | Sites |
| `realtime.openvibe.network` | Closed service notice | Sites |
| `status.openvibe.network` | Pointer to Network status | Sites |
| `openvibe.actor` | Router notice pending owner handoff | Sites |
| `openvibe.bot` | Panel notice pending owner handoff | OpenVibe.Bot |

All five are `noindex`. The existing page presentation is held in `notice-pages/`; the notice build writes only these domains and shared browser assets. Actor and Bot retain their existing page copy until their owners replace it with notice copy. The status notice still reads Network's public health endpoint in the browser. Bot owns its vhost, so this repository does not generate `openvibe.bot.conf`.

## Frozen product pages

`frozen.json` lists all 30 product domains. Their committed front pages and nginx vhosts remain available as static files. The build does not regenerate them. `node build.js --check` verifies that each frozen domain still has an index page and vhost while checking that notice outputs are current. The old catalog and repository facts snapshots are historical data, not build inputs.

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
