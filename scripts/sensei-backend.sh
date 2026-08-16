#!/usr/bin/env bash
# Switch which SenseiClaw serves the app, without touching nginx.
#
# nginx proxies /sensei/api -> 127.0.0.1:4050 and that is gated shared infra, so
# the switch works by moving which backend owns 4050 rather than by editing
# nginx. Both backends stay installed; only one holds the port.
#
#   pm2       SenseiClaw on the host, talking straight to the Spark  (default)
#   nemoclaw  SenseiClaw inside the OpenShell sandbox, reachable over the
#             gateway's gRPC forward, egress limited to inference.local
#
# Usage:  sensei-backend.sh [pm2|nemoclaw|status]
set -euo pipefail

export PATH=/root/.local/bin:$PATH
export NEMOCLAW_GATEWAY_PORT=8181       # 8080 is nginx on this box
SANDBOX=sensei
PORT=4050

fwd_stop() { pkill -f "openshell forward service .* $SANDBOX" 2>/dev/null || true; sleep 1; }

probe() { curl -s --max-time 10 "http://127.0.0.1:$PORT/tutor/health" 2>/dev/null || true; }

case "${1:-status}" in
  pm2)
    fwd_stop
    pm2 start senseiclaw >/dev/null 2>&1 || pm2 restart senseiclaw >/dev/null
    sleep 4
    echo "backend: pm2 (host)  ->  $(probe)"
    ;;

  nemoclaw)
    # Sandbox must already be serving on its own loopback:4050.
    if ! nemoclaw "$SANDBOX" exec --timeout 30 -- \
         curl -sf --max-time 10 http://127.0.0.1:4050/tutor/health >/dev/null 2>&1; then
      echo "sandbox is not serving; start it with scripts/sensei-sandbox-start.sh" >&2
      exit 1
    fi
    pm2 stop senseiclaw >/dev/null 2>&1 || true
    fwd_stop
    setsid nohup openshell forward service --target-port 4050 \
      --local "127.0.0.1:$PORT" "$SANDBOX" >/tmp/sensei-fwd.log 2>&1 </dev/null &
    sleep 5
    echo "backend: nemoclaw (sandboxed)  ->  $(probe)"
    ;;

  status)
    if pgrep -f "openshell forward service .* $SANDBOX" >/dev/null; then
      echo "active: nemoclaw (sandboxed via OpenShell gRPC forward)"
    else
      echo "active: pm2 (host)"
    fi
    echo "port $PORT: $(probe)"
    ;;

  *) echo "usage: $0 [pm2|nemoclaw|status]" >&2; exit 2 ;;
esac
