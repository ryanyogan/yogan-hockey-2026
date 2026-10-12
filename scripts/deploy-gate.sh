#!/usr/bin/env bash
# Decides whether a deploy job may run, and says why when it may not.
#
#   scripts/deploy-gate.sh production|preview
#
# A deploy needs the two GitHub secrets account setup (#32) creates. Missing either, the deploy
# is skipped with a notice on the run, not failed: a pull request from a fork never has the
# secrets, and neither did this repository before account setup ran. The KV and D1 a target
# uses are in apps/web/wrangler.jsonc, which wrangler checks for itself.
#
# Writes `enabled` (true or false) to $GITHUB_OUTPUT. Run by hand it prints it instead.
set -euo pipefail

target="${1:?usage: deploy-gate.sh production|preview}"
case "$target" in
  production | preview) ;;
  *) echo "deploy-gate: unknown target \"$target\"" >&2 && exit 2 ;;
esac

output="${GITHUB_OUTPUT:-/dev/stdout}"

skip() {
  echo "::$1 title=${target^} deploy skipped::$2"
  echo "enabled=false" >>"$output"
  exit 0
}

# Previews are switched off until two things found in #33 are settled (docs/spec.md, Unverified
# row 7). Nobody has seen whether a preview gets Agents of its own: `wrangler preview` sends the
# Agent bindings under `previews` in wrangler.jsonc, which name no other Worker, but if a preview
# shares production's Agents its page drives them, and through them production's KV and D1. And
# a preview answers on a public workers.dev address. Take this block out once a preview is known
# to get Agents of its own.
if [[ "$target" == "preview" ]]; then
  skip notice "Previews are off until a preview is known not to reach production's Agents. See Unverified row 7 in docs/spec.md."
fi

missing=()
[[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] || missing+=("CLOUDFLARE_API_TOKEN")
[[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]] || missing+=("CLOUDFLARE_ACCOUNT_ID")
if ((${#missing[@]})); then
  skip notice "GitHub secret not set: ${missing[*]}. scripts/account-setup.sh (#32) sets it; a pull request from a fork never has it."
fi

echo "::notice title=${target^} deploy enabled::Applying the D1 migrations, then deploying."
echo "enabled=true" >>"$output"
