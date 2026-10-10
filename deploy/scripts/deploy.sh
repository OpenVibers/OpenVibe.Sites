#!/bin/bash
# OpenVibe.Sites — deploy through OpenVibe.Host. Run on the host:
#
#   sudo /opt/openvibe.sites/deploy/scripts/deploy.sh      ovhost deploy sites --restart
#   DRY_RUN=1 /opt/openvibe.sites/deploy/scripts/deploy.sh  ovhost plan sites --restart
#
# --restart rebuilds and reinstalls even when the checkout is already at origin/main.
set -euo pipefail

SERVICE=sites
OVHOST="${OVHOST:-/usr/local/bin/ovhost}"
if [ "${OVHOST_SUDO-auto}" = auto ]; then if [ "$(id -u)" -eq 0 ]; then SUDO=(); else SUDO=(sudo); fi; elif [ -n "${OVHOST_SUDO}" ]; then SUDO=("$OVHOST_SUDO"); else SUDO=(); fi
[ "$#" -eq 0 ] || { echo "Usage: $0   (DRY_RUN=1 for the plan)"; exit 1; }

if ! command -v "$OVHOST" >/dev/null 2>&1; then
    echo "[sites] ovhost not found ($OVHOST); install ovhost to deploy sites" >&2
    exit 1
fi

if [ "${DRY_RUN:-0}" = 1 ]; then exec "${SUDO[@]}" "$OVHOST" plan "$SERVICE" --restart; fi
echo "[sites] ovhost deploy $SERVICE --restart"
exec "${SUDO[@]}" "$OVHOST" deploy "$SERVICE" --restart
