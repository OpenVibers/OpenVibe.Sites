# Retiring OpenVibe.Sites

Sites is frozen (plan T11 lane D, audit item 12, 2026-10-02). The product catalog now lives in
OpenVibe.Contracts (`products.catalog()`, v0.84.0), and `sites.json` is a generated mirror of it
(`node scripts/sync-catalog.js`). The placeholder pages in `dist/<domain>/` and the vhosts in `deploy/nginx/`
are no longer generated. They stay as committed, and production keeps serving every domain from them until
the product named below serves that domain itself. Only then is the domain's host file removed here, in
the release in which the product's own vhost is installed.

"Own host config" means a `deploy/nginx/<domain>.conf` with that `server_name` on the product repository's
`origin/main`, as of the local refs read on 2026-10-02. "Park: DNS only" means no repository will serve the
domain yet. When the Sites vhost goes, the record stays in DNS (Cloudflare) and nothing on the host answers it.

The Sites repository had 33 host files on 2026-10-02 (the plan said 36), one per `sites.json` entry. Since then OpenVibe.Bot
supplies the `openvibe.bot` vhost and, since 2026-10-07, serves its own front page (Sites keeps only its legal pages there), and `openvibe.work` and `openvibe.zone` were
added; they have no Contracts manifest yet, so `sync-catalog.js` keeps them as they are. That makes 34 host files for 35
`sites.json` entries.

| Host file | Sites serves today | Goes to | Own host config on origin/main |
|---|---|---|---|
| `admin.openvibe.network.conf` | placeholder | OpenVibe.Network | no (`openvibe.network.conf` names only `openvibe.network`, `my.openvibe.network`) |
| `ai.openvibe.network.conf` | moved notice | OpenVibe.AI | yes: `deploy/nginx/ai.openvibe.network.conf` (a reference vhost for the old address; Contracts says AI moved to `ai.openvibe.services`) |
| `ai.openvibe.services.conf` | placeholder | OpenVibe.AI | no |
| `api.openvibe.network.conf` | placeholder | OpenVibe.Network | no |
| `auth.openvibe.network.conf` | placeholder | OpenVibe.Network | no |
| `openre.stream.conf` | placeholder | OpenRe.Stream | yes: `deploy/nginx/openre.stream.conf` |
| `openvibe.actor.conf` | placeholder (no repo) | park: DNS only (OpenVibe.Node exists but has no deploy config and does not run) | no |
| (`openvibe.bot`, no Sites host file) | legal pages, 404, sitemap and manifest (its front page, robots.txt, release.json and status.json are Bot's since 2026-10-07, OpenVibe.Bot#34) | OpenVibe.Bot, which already supplies the vhost | yes (Contracts still says `noRepo`) |
| `openvibe.coupons.conf` | placeholder | OpenVibe.Coupons | yes: `deploy/nginx/openvibe.coupons.conf` |
| `openvibe.deals.conf` | placeholder | OpenVibe.Deals | yes: `deploy/nginx/openvibe.deals.conf` |
| `openvibe.download.conf` | placeholder (no repo) | park: DNS only (Contracts names OpenVibe.MediaHub, which does not exist yet) | no |
| (`openvibe.events`, no Sites host file) | nothing (removed 2026-10-07) | OpenVibe.Events, which serves its product home with `deploy/nginx/openvibe.events.conf` (Events#16); the API stays on events.openvibe.network until the T7 origin move | yes |
| `openvibe.food.conf` | placeholder (no repo) | park: DNS only | no |
| `openvibe.help.conf` | placeholder (no repo) | park: DNS only | no |
| `openvibe.homes.conf` | placeholder (no repo) | park: DNS only | no |
| `openvibe.host.conf` | placeholder | OpenVibe.Host | yes: `deploy/nginx/openvibe.host.conf` (STATUS.json: loopback only, not launched) |
| `openvibe.news.conf` | placeholder | OpenVibe.News | yes: `deploy/nginx/openvibe.news.conf` |
| `openvibe.pics.conf` | placeholder (no repo) | park: DNS only (Contracts names OpenVibe.MediaHub, which does not exist yet) | no |
| `openvibe.quest.conf` | placeholder (no repo) | park: DNS only | no |
| `openvibe.rent.conf` | placeholder (no repo) | park: DNS only | no |
| `openvibe.reviews.conf` | placeholder | OpenVibe.Reviews | yes: `deploy/nginx/openvibe.reviews.conf` |
| `openvibe.run.conf` | placeholder (no repo) | park: DNS only | no |
| `openvibe.services.conf` | placeholder (no repo) | park: DNS only | no |
| `openvibe.space.conf` | placeholder (no repo) | park: DNS only (Contracts' `space` manifest names OpenVibe.Space, which does not exist yet) | no |
| `openvibe.tips.conf` | placeholder | OpenVibe.Tips | yes: `deploy/nginx/openvibe.tips.conf` |
| `openvibe.trade.conf` | placeholder | OpenVibe.Trade | yes: `deploy/nginx/openvibe.trade.conf` |
| `openvibe.video.conf` | placeholder (no repo) | park: DNS only (Contracts names OpenVibe.MediaHub, which does not exist yet) | no |
| `openvibe.vip.conf` | placeholder | OpenVibe.VIP | yes: `deploy/nginx/openvibe.vip.conf` |
| `openvibe.watch.conf` | placeholder (no repo) | park: DNS only | no |
| `openvibe.website.conf` | placeholder (no repo) | park: DNS only | no |
| `openvibe.work.conf` | placeholder (no repo) | park: DNS only (not in the Contracts catalog yet) | no |
| `openvibe.zone.conf` | placeholder (no repo) | park: DNS only (not in the Contracts catalog yet) | no |
| `realtime.openvibe.network.conf` | closed notice | park: DNS only (Realtime is closed; delivery is part of OpenVibe.Events at `events.openvibe.network`) | no |
| `status.openvibe.network.conf` | status notice | OpenVibe.Network: its status page `openvibe.network/status` (a redirect from this host) | no |
| `themes.openvibe.network.conf` | placeholder | OpenVibe.Network | no |

Totals: 18 go to a product repository; 11 of those have their own host config (10 on `origin/main` as of 2026-10-02, and OpenVibe.Bot's). The other 17 are parked: DNS only.

The Sites vhost for a domain is removed only when all of these are true:

1. The product's own vhost is installed on the host behind `nginx -t`.
2. The product's Contracts manifest shows it serving the domain (`exposure.state: live`).
3. In one Sites change, the domain's entry, its `dist/<domain>/` and its vhost are removed. `sync-catalog.js` keeps any domain
   that is no longer in the catalog, so a domain never loses its page by accident.

A Sites vhost that leaves `deploy/nginx/` stays installed on the host until someone removes it by hand (see the README's Deploy section).
