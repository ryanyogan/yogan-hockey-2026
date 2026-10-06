#!/usr/bin/env bash
# Fails unless Cloudflare Access stands in front of the deployed site.
#
#   scripts/check-access.sh
#
# Asks for a page, an Agent's socket and a static file without signing in, and expects Access's
# login redirect for each. Then asks the two workers.dev addresses the Worker would have if
# `workersDev` or `previewUrls` were ever switched on, and expects nothing there. Until launch
# (spec section 11) anything else means the unfinished site is public. It needs no login.
set -euo pipefail

host="hockey.yogan.dev"
team="ryanyogan.cloudflareaccess.com"
workers_dev="yogan-hockey.ryanyogan.workers.dev"
failed=0

behind_access() {
  local path="$1"
  shift
  local answer
  answer=$(curl -s -o /dev/null --max-time 20 -w '%{http_code} %{redirect_url}' "$@" "https://$host$path")
  if [[ "$answer" == "302 https://$team/cdn-cgi/access/login/$host"* ]]; then
    echo "ok      $path is behind Access"
  else
    echo "PUBLIC? $path answered ${answer:0:120}"
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

behind_access /
behind_access /nhl
behind_access /_next/static/css/none.css
behind_access /agents/scoreboard-agent/nhl \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ=="
absent "https://$workers_dev/"
absent "https://main-$workers_dev/"

if ((failed)); then
  echo "::error title=Access check failed::$host, or a workers.dev address of its Worker, answered without Access. See scripts/check-access.sh."
  exit 1
fi
