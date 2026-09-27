#!/bin/bash
# OpenVibe.Sites — deploy: a thin wrapper around `ovhost deploy sites` (OpenVibe.Host, strategy
# static-build; roadmap WS-N task 11; OpenVibe.Host docs/deploy-strategies.md). Run on the host:
#
#   sudo /opt/openvibe.sites/deploy/scripts/deploy.sh      ovhost deploy sites --restart
#   DRY_RUN=1 /opt/openvibe.sites/deploy/scripts/deploy.sh  ovhost plan sites
#
# ovhost pulls FIRST (as the checkout owner), so a stale checkout never installs old vhosts: the tracked
# dist/ a previous build rewrote is restored from git, the checkout fast-forwards, then npm ci, node build.js,
# every deploy/nginx/*.conf installed and enabled behind `nginx -t` (a failing test puts the previous vhost
# files back and nginx is NOT reloaded; the checkout and dist/ go back too), then one release notification
# per dist/<domain>/release.json. --restart makes it rebuild and reinstall even when the checkout is already
# at origin/main (the old script did that every run, and people pulled before running it).
#
# Fallback: deploy-legacy.sh (the previous script, unchanged) when ovhost is missing or too old (no
# `capabilities`, deploy-api < 1) or the host inventory does not deploy sites with strategy static-build;
# OVHOST_LEGACY=1 forces it. The fallback keeps the old rule "pull before deploying": it restores dist/, pulls
# as the checkout owner, then runs the freshly pulled deploy-legacy.sh.
set -euo pipefail

SERVICE=sites
STRATEGY=static-build
REPO="${REPO:-/opt/openvibe.sites}"
OVHOST="${OVHOST:-/usr/local/bin/ovhost}"
if [ "${OVHOST_SUDO-auto}" = auto ]; then if [ "$(id -u)" -eq 0 ]; then SUDO=(); else SUDO=(sudo); fi; elif [ -n "${OVHOST_SUDO}" ]; then SUDO=("$OVHOST_SUDO"); else SUDO=(); fi
[ "$#" -eq 0 ] || { echo "Usage: $0   (DRY_RUN=1 for the plan)"; exit 1; }

legacy() {
    echo "[sites] $1 — running deploy-legacy.sh (the previous deploy script) instead"
    [ "${DRY_RUN:-0}" = 1 ] && { echo "[sites] ✗ deploy-legacy.sh has no DRY_RUN; nothing was done" >&2; exit 1; }
    local owner
    owner=$(stat -c %U "$REPO")
    as_owner() { if [ "$(id -un)" = "$owner" ]; then "$@"; else sudo -u "$owner" "$@"; fi; }
    as_owner git -C "$REPO" checkout -- dist/
    as_owner git -C "$REPO" pull --ff-only
    exec bash "${DEPLOY_LEGACY:-$REPO/deploy/scripts/deploy-legacy.sh}"
}

REASON=""
probe() {
    if [ "${OVHOST_LEGACY:-0}" = 1 ]; then REASON="OVHOST_LEGACY=1"; return 1; fi
    if ! command -v "$OVHOST" >/dev/null 2>&1; then REASON="ovhost not found ($OVHOST)"; return 1; fi
    local caps api
    if ! caps=$("${SUDO[@]}" "$OVHOST" capabilities "$SERVICE" 2>/dev/null); then REASON="this ovhost has no 'capabilities' (too old) or no inventory entry for $SERVICE"; return 1; fi
    api=$(printf '%s\n' "$caps" | sed -n 's/^deploy-api=//p')
    case "$api" in ''|*[!0-9]*) REASON="this ovhost reports no deploy-api (too old)"; return 1 ;; esac
    if [ "$api" -lt 1 ]; then REASON="this ovhost's deploy-api is $api, 1 is needed"; return 1; fi
    if ! printf '%s\n' "$caps" | grep -qx "strategy=$STRATEGY"; then REASON="the host inventory does not deploy $SERVICE with strategy $STRATEGY ($(printf '%s\n' "$caps" | sed -n 's/^strategy=//p'))"; return 1; fi
    if ! printf '%s\n' "$caps" | grep -qx "managed=yes"; then REASON="ovhost does not manage $SERVICE"; return 1; fi
    return 0
}

probe || legacy "$REASON"

if [ "${DRY_RUN:-0}" = 1 ]; then exec "${SUDO[@]}" "$OVHOST" plan "$SERVICE" --restart; fi
echo "[sites] ovhost deploy $SERVICE --restart"
exec "${SUDO[@]}" "$OVHOST" deploy "$SERVICE" --restart
