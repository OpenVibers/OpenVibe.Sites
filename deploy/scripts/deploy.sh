#!/bin/bash
# OpenVibe.Sites — pull, rebuild, install vhosts, reload nginx. Run on the host:
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
