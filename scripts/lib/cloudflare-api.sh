# Sourced, not run: calls to Cloudflare's API for what wrangler has no command for (the stored
# logs, zones, DNS, Access, the AI Gateway, the account's plan). They use wrangler's own login.

_web="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../apps/web" && pwd)"

# cloudflare_account: the id of the account to act on. CLOUDFLARE_ACCOUNT_ID if it is set,
# otherwise the one account wrangler's login can see.
cloudflare_account() {
  if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    printf '%s\n' "$CLOUDFLARE_ACCOUNT_ID"
    return
  fi
  (cd "$_web" && pnpm exec wrangler whoami --json </dev/null 2>/dev/null) |
    jq -er 'if (.accounts | length) == 1 then .accounts[0].id else empty end' || {
    echo "cloudflare-api: wrangler is not logged in, or sees several accounts (set CLOUDFLARE_ACCOUNT_ID)" >&2
    return 1
  }
}

# cloudflare_api METHOD PATH [JSON]: one call, the answer's JSON on stdout. PATH starts after
# `/client/v4`. Fails when Cloudflare answers with an error. The token goes from wrangler to
# curl on stdin, so it is never printed and never appears in a process list.
cloudflare_api() {
  local method="$1" path="$2" body="${3:-}" token="${CLOUDFLARE_API_TOKEN:-}"
  # An API token in the environment is used as it is: it can be given permissions that
  # wrangler's login has no scope for (the stored logs are one).
  [[ -n "$token" ]] || token=$(cd "$_web" && pnpm exec wrangler auth token </dev/null 2>/dev/null | tail -n 1)
  [[ -n "$token" ]] || { echo "cloudflare-api: wrangler gave no token. Run: pnpm exec wrangler login" >&2 && return 1; }
  printf 'header = "Authorization: Bearer %s"\n' "$token" |
    curl -sS --fail-with-body -K - -X "$method" -H "Content-Type: application/json" \
      ${body:+--data "$body"} "https://api.cloudflare.com/client/v4$path"
}
