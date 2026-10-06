#!/usr/bin/env bash
# Fails unless the deployed site answers anyone on its own hostname, and nowhere else.
#
#   scripts/check-public.sh
#
# The site has been public since 2026-10-06, when Cloudflare Access was removed (spec section 11).
# This asks for two pages and an Agent's socket with no cookie and expects the site itself: 200
# with the site's own HTML for a page, 101 for the socket. A redirect to a login means something
# stands in front of the site again. Then it asks the two workers.dev addresses the Worker would
# have if `workersDev` or `previewUrls` were ever switched on, and expects nothing there:
# hockey.yogan.dev is the only address. It needs no login.
set -euo pipefail

host="hockey.yogan.dev"
workers_dev="yogan-hockey.ryanyogan.workers.dev"
failed=0
body=$(mktemp)
trap 'rm -f "$body"' EXIT

page() {
  local path="$1"
  local answer
  answer=$(curl -s -o "$body" --max-time 20 -w '%{http_code} %{redirect_url}' "https://$host$path" || true)
  if [[ "$answer" == "200 " ]] && grep -q "Yogan Hockey" "$body"; then
    echo "ok      $path is the site, to anyone (200)"
  else
    echo "FAILED  $path answered ${answer:0:120}"
    failed=1
  fi
}

# A socket that opens stays open, so curl is cut off after a few seconds: only the status counts.
socket() {
  local path="$1"
  local code
  code=$(curl -s -o /dev/null --http1.1 --max-time 8 -w '%{http_code}' \
    -H "Connection: Upgrade" -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "https://$host$path" || true)
  if [[ "$code" == "101" ]]; then
    echo "ok      $path opens a socket, to anyone (101)"
  else
    echo "FAILED  $path answered $code to a WebSocket upgrade"
    failed=1
  fi
}

absent() {
  local url="$1"
  local code
  code=$(curl -s -o /dev/null --max-time 20 -w '%{http_code}' "$url" || true)
  if [[ "$code" == "404" || "$code" == "000" ]]; then
    echo "ok      $url serves nothing ($code)"
  else
    echo "PUBLIC? $url answered $code"
    failed=1
  fi
}

page /
page /nhl
socket /agents/scoreboard-agent/nhl
absent "https://$workers_dev/"
absent "https://main-$workers_dev/"

if ((failed)); then
  echo "::error title=Public site check failed::$host did not answer as the public site, or a workers.dev address of its Worker answered. See scripts/check-public.sh."
  exit 1
fi
