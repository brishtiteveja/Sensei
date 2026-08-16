#!/usr/bin/env bash
# Start SenseiClaw *inside* the NemoClaw/OpenShell sandbox.
#
# It binds the sandbox's own loopback; nothing is published to the host until
# `openshell forward service` bridges it over gRPC (see sensei-backend.sh).
# Its only network egress is inference.local -- the policy-enforced route to
# the DGX Spark.
set -euo pipefail

export PATH=/root/.local/bin:$PATH
export NEMOCLAW_GATEWAY_PORT=8181
SANDBOX=sensei
ROOT=/sandbox/senseiclaw

nemoclaw "$SANDBOX" exec --timeout 200 -- sh -c "
  pkill -f 'uvicorn clawpy.server:app' 2>/dev/null; sleep 2
  cd $ROOT/sc-stage/src || exit 1
  set -a; . $ROOT/sensei.env; set +a
  setsid nohup $ROOT/.venv/bin/uvicorn clawpy.server:app \
    --host 127.0.0.1 --port 4050 > /tmp/sc.log 2>&1 </dev/null &
  sleep 16
  curl -s --max-time 20 http://127.0.0.1:4050/tutor/health; echo
  tail -3 /tmp/sc.log
"
