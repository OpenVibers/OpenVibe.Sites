# OpenVibe.Sites (retired)

OpenVibe.Sites is retired as of 2026-10-14 (plan T11, "Sites is deleted"). It served static placeholder pages for
OpenVibe domains that had no product yet. Every one of those domains is now served by its own product, or parked.
Nothing on the host serves this repository any more, and it is archived read-only.

## Where its domains went

- **Their own products:**
  - openvibe.news, openvibe.reviews, openvibe.trade, openvibe.coupons and openre.stream (2026-10-09);
  - Bot (Bot#51) and Games serve their own legal pages (2026-10-10).
- **Parked** (a 302 to the network's front door, OpenVibe.Network `deploy/nginx/parked-domains.conf`):
  - openvibe.zone and realtime.openvibe.network;
  - openvibe.tips and openvibe.vip (2026-10-14, Network#176), until OpenVibe.Tips and OpenVibe.VIP launch with the
    Billing cutover (plan T5);
  - openvibe.website (to OpenVibe.Space) and openvibe.homes (to OpenVibe.Rent).
- **Network subdomains** (status., themes., admin., auth. and api.openvibe.network) redirect to the openvibe.network
  page that does their job (`network-subdomains.conf`).
- **The product catalog** lives in OpenVibe.Contracts (`products.catalog()`). This repository only mirrored it in
  `sites.json`.

## Retirement record (2026-10-14)

- Sites' `openvibe.tips.conf` and `openvibe.vip.conf` vhosts were disabled behind `nginx -t`. Copies are in
  `/root/sites-vhosts-retired-20261014T033629Z/` on the host.
- `sites` was removed from the OpenVibe.Host inventory (`/etc/openvibe/host.json`, backup
  `host.json.bak-20261014T033731Z-sites-retired`), so no deploy reinstalls its vhosts.
- The host checkout `/opt/openvibe.sites` was removed. Its archive is `/var/backups/openvibe.sites-20261014T033754Z.tar.gz`.
- The history stays here: the build (`build.js`), the frozen pages and the vhosts as they last were.

