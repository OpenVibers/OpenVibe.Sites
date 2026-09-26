#!/bin/bash
# OpenVibe.Sites — pull, rebuild, install vhosts, reload nginx, announce each placeholder's release. Run on the host:
#   sudo -u ubuntu git -C /opt/openvibe.sites pull --ff-only && /opt/openvibe.sites/deploy/scripts/deploy.sh
set -euo pipefail
REPO="${REPO:-/opt/openvibe.sites}"
cd "$REPO"
# openvibe-shared is the pinned OpenVibe.Shared release (package.json); needs outbound HTTPS to codeload.github.com.
npm ci --omit=dev --no-audit --no-fund
node build.js
changed=0
for conf in deploy/nginx/*.conf; do
    name=$(basename "$conf")
    if ! cmp -s "$conf" "/etc/nginx/sites-available/$name"; then sudo install -m 644 "$conf" "/etc/nginx/sites-available/$name"; changed=1; fi
    [ -L "/etc/nginx/sites-enabled/$name" ] || { sudo ln -s "/etc/nginx/sites-available/$name" "/etc/nginx/sites-enabled/$name"; changed=1; }
done
if [ "$changed" = 1 ]; then sudo nginx -t && sudo systemctl reload nginx && echo "[sites] nginx reloaded"; else echo "[sites] vhosts unchanged"; fi
echo "[sites] $(ls dist | wc -l) sites in place"
# Release notifications (roadmap WS-P task 9): one `ovhost announce <service> --release <id> --origin
# https://<domain>` per placeholder, from its dist/<domain>/release.json. OpenVibe.Host publishes
# host.deploy.activated and open tabs check /release.json now instead of at their next poll; ovhost sends a
# release once, so an unchanged placeholder sends nothing. Best effort: skipped without an ovhost whose
# --help has `announce <service>`, 20 s at most each, stops at the first failure (the rest would fail the
# same way), and never fails the deploy (OpenVibe.Host docs/release-notifications.md).
OVHOST_BIN=$(command -v "${OVHOST:-ovhost}" 2>/dev/null || true)
if [ -n "$OVHOST_BIN" ]; then
    case "$("$OVHOST_BIN" --help 2>/dev/null || true)" in
        *"announce <service>"*)
            SUDO=""; [ "$(id -u)" -eq 0 ] || SUDO="sudo -n"
            node -e 'const fs = require("fs"); for (const d of fs.readdirSync("dist").sort()) { try { const m = JSON.parse(fs.readFileSync(`dist/${d}/release.json`, "utf8")); if (/^[a-z][a-z0-9-]{1,39}$/.test(m.service) && /^[0-9a-f]{7,40}$/.test(m.release) && /^[a-z0-9.-]+$/.test(d)) console.log(`${m.service} ${m.release} ${d}`); } catch { /* no release.json */ } }' |
            while read -r svc rel domain; do
                timeout 20 $SUDO "$OVHOST_BIN" announce "$svc" --release "$rel" --origin "https://$domain" </dev/null 2>&1 | sed 's/^/[sites] /' \
                    || { echo "[sites] release notification not sent for $domain; the rest are skipped (the deploy stands)"; break; }
            done ;;
        *) echo "[sites] release notification skipped: this ovhost has no announce" ;;
    esac
fi
