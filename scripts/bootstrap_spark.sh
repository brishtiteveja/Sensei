#!/usr/bin/env bash
# Bring a FRESH GB10 up to demo-ready.
#
# The event hands us a clean Acer Veriton GN100, not our dev box. Everything here
# exists so that discovering a missing dependency or an unwarmed model happens now,
# not at hour two.
#
#   ./scripts/bootstrap_spark.sh
#
# Env:
#   SENSEI_BASE_URL  router base, default http://localhost:8010/v1
#   SENSEI_API_KEY   bearer token if the router requires one
#   SENSEI_MODEL     model pin, default qwen3-vl-30b-a3b-gguf

set -euo pipefail

BASE_URL="${SENSEI_BASE_URL:-http://localhost:8010/v1}"
MODEL="${SENSEI_MODEL:-qwen3-vl-30b-a3b-gguf}"
HEALTH="${BASE_URL%/v1}/health"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[33m!! %s\033[0m\n' "$1"; }

say "1/4  Python deps (uv)"
if ! command -v uv >/dev/null 2>&1; then
    warn "uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi
(cd "$(dirname "$0")/../backend" && uv sync)

say "2/4  Router reachable?"
if ! curl -sf --max-time 15 "$HEALTH" >/dev/null; then
    warn "router not answering at $HEALTH"
    warn "start the vllm router before continuing."
    exit 1
fi
curl -s --max-time 15 "$HEALTH"
echo

say "3/4  Is the pin in the catalog?"
# Read the live catalog. It has drifted from the vendor docs before; a stale
# hardcoded id shows up as a 404 at exactly the wrong moment.
CATALOG=$(curl -s --max-time 60 "$BASE_URL/models" \
    ${SENSEI_API_KEY:+-H "Authorization: Bearer $SENSEI_API_KEY"})
if ! grep -q "\"$MODEL\"" <<<"$CATALOG"; then
    warn "pinned model '$MODEL' is NOT in the catalog. Available:"
    grep -o '"id":"[^"]*"' <<<"$CATALOG" | cut -d'"' -f4 | sed 's/^/    /'
    exit 1
fi
echo "    '$MODEL' present"

say "4/4  Pre-warm (cold swap is 1-5 min; pay it now, not on stage)"
# Streaming so we see load progress rather than a silent block, and a long timeout so
# the warm-up itself is not what times out.
curl -sN --max-time 900 "$BASE_URL/chat/completions" \
    -H 'Content-Type: application/json' \
    ${SENSEI_API_KEY:+-H "Authorization: Bearer $SENSEI_API_KEY"} \
    -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":1,\"stream\":true}" \
    >/dev/null
echo "    warm"

RESIDENT=$(curl -s --max-time 15 "$HEALTH" | grep -o '"loaded":\[[^]]*\]' || true)
say "Ready. resident: ${RESIDENT:-unknown}"
echo "Start the API:  cd backend && uv run uvicorn sensei.server:app --host 0.0.0.0 --port 8080"
