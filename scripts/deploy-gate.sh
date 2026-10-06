#!/usr/bin/env bash
# Decides whether a deploy job may run, and says why when it may not.
#
#   scripts/deploy-gate.sh production|preview
#
# A deploy needs the two GitHub secrets account setup (#32) creates and the ids of the target's
# KV namespace and D1 database in apps/web/cloudflare.resources.json. Missing any of them, the
# deploy is skipped with a notice on the run, not failed: a pull request from a fork never has
# the secrets, and neither did this repository before account setup ran.
#
# Writes `enabled` (true or false) and, when enabled, `d1` (the database id the migrations are
# applied to) to $GITHUB_OUTPUT. Run by hand it prints them instead.
set -euo pipefail

target="${1:?usage: deploy-gate.sh production|preview}"
case "$target" in
  production | preview) ;;
  *) echo "deploy-gate: unknown target \"$target\"" >&2 && exit 2 ;;
esac

resources="$(dirname "$0")/../apps/web/cloudflare.resources.json"
output="${GITHUB_OUTPUT:-/dev/stdout}"

skip() {
  echo "::$1 title=${target^} deploy skipped::$2"
  echo "enabled=false" >>"$output"
  exit 0
}

missing=()
[[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] || missing+=("CLOUDFLARE_API_TOKEN")
[[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]] || missing+=("CLOUDFLARE_ACCOUNT_ID")
if ((${#missing[@]})); then
  skip notice "GitHub secret not set: ${missing[*]}. scripts/account-setup.sh (#32) sets it; a pull request from a fork never has it."
fi

kv=$(jq -r --arg target "$target" '.[$target].kv // empty' "$resources")
d1=$(jq -r --arg target "$target" '.[$target].d1 // empty' "$resources")
if [[ -z "$kv" || -z "$d1" ]]; then
  # A warning, not a notice: the secrets are there, so somebody expects this deploy to happen.
  skip warning "The secrets are set, but apps/web/cloudflare.resources.json has no $target KV and D1 ids. Copy them from the account setup comment on #32."
fi

echo "::notice title=${target^} deploy enabled::Applying migrations to D1 $d1, then deploying."
{
  echo "enabled=true"
  echo "d1=$d1"
} >>"$output"
