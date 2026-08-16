# Running Sensei's inference through NemoClaw + OpenShell

How NemoClaw was pointed at our DGX Spark vLLM, what bit us, and what is
actually proven. Written 16 Aug 2026.

---

## 1. Why bother

The bounty asks for NemoClaw/OpenShell in a real role. NemoClaw is not a process
supervisor — it runs exactly three agent runtimes (`openclaw`, `hermes`,
`langchain-deepagents-code`) inside a Landlock + seccomp + netns sandbox with an
OPA egress proxy. **SenseiClaw is a FastAPI service, so it is not a thing
NemoClaw can run.** Swapping pm2 for NemoClaw is not a like-for-like move and
was never the option.

What NemoClaw *can* do for us honestly: own the **inference route**. It puts a
policy-enforced egress proxy in front of the Spark, so the sandboxed agent
reaches exactly one endpoint (`inference.local`) and nothing else. That is a
real security claim we can demo, and it is the claim that matches the product
story — student work never leaves the box.

---

## 2. The working command

Both the DGX endpoint and the model are pinned deliberately. See §3.

```bash
export DGX_API_KEY=$(jq -r .api_key /home/projects/8kEdu/data/.cloud_endpoint.json)

NEMOCLAW_GATEWAY_PORT=8181 \
NEMOCLAW_TRUSTED_PRIVATE_INFERENCE_HOSTS=spark-e257.tail803c7f.ts.net \
NEMOCLAW_PROVIDER=custom \
NEMOCLAW_ENDPOINT_URL=https://spark-e257.tail803c7f.ts.net:8443/v1 \
NEMOCLAW_MODEL=qwen3-vl-30b-a3b-gguf \
COMPATIBLE_API_KEY="$DGX_API_KEY" \
NEMOCLAW_ACCEPT_THIRD_PARTY_SOFTWARE=1 \
nemoclaw onboard --non-interactive --agent openclaw --name sensei \
  -y --yes-i-accept-third-party-software
```

Result at step 4/8:

```
✓ Created provider compatible-endpoint
✓ Inference smoke passed: compatible-endpoint / qwen3-vl-30b-a3b-gguf
✓ Inference route set: compatible-endpoint / qwen3-vl-30b-a3b-gguf
  Route: inference.local   Timeout: 180s
```

The smoke test is not a ping — it exercises the API, tool calling, and
streaming against the real endpoint before it will register the route.

---

## 3. The four things that bite

**Port 8080 is nginx.** The OpenShell gateway wants 8080; on this box nginx has
it, and nginx *is* `dev.perspectivity.co` — it serves the Sensei demo. The
onboard failure message helpfully suggests `sudo kill <pid>`. **Do not.** That
kills the demo. Use `NEMOCLAW_GATEWAY_PORT=8181`.

**Do not install OpenShell yourself.** `uv tool install openshell` gets 0.0.106;
this NemoClaw release pins a maximum of 0.0.85 and will silently reinstall the
pinned version over yours. Just let `nemoclaw onboard` install it.

**The Tailscale host must be declared trusted.** `spark-e257.tail803c7f.ts.net`
resolves into CGNAT (100.64.0.0/10). NemoClaw blocks private and reserved
ranges by default, so without
`NEMOCLAW_TRUSTED_PRIVATE_INFERENCE_HOSTS=spark-e257.tail803c7f.ts.net` the
probe is refused before it is ever sent. Exact hostnames only — no wildcards,
no suffix matching.

**Pin the model that is already resident.** The Spark keeps one model in memory.
Onboarding *validates* the model you name, so naming anything other than the hot
one triggers a 1–5 min cold swap and leaves the box on the wrong model — which
is exactly the failure the main handoff §5 warns about, self-inflicted. Check
first, then pass that id:

```bash
curl -s https://spark-e257.tail803c7f.ts.net:8443/health   # {"loaded":["..."]}
```

**`--resume` does not help a preflight failure.** No session exists until
preflight passes, so a port clash means re-running fresh, not resuming.

---

## 4. Hardening the egress policy

The baseline policy ships with real egress allowances. Strip the ones we do not
need so the sandbox can reach inference and little else:

```bash
nemoclaw sensei policy exclude nvidia clawhub openclaw_api openclaw_docs npm_registry --force
```

`managed_inference` cannot be excluded. Telemetry is on by default — turn it off
with `OPENSHELL_TELEMETRY_ENABLED=false`.

Loopback (`127.0.0.0/8`) is *always* blocked from inside the sandbox and cannot
be allowed. Anything the sandbox must reach has to bind `0.0.0.0`.

---

## 5. What this does and does not claim

Proven: NemoClaw stands up an OpenShell-sandboxed agent whose only inference
path is our local Spark, validated end to end.

**Not** claimed: that SenseiClaw itself runs under NemoClaw. It does not, and it
cannot — see §1. SenseiClaw stays on pm2 (`senseiclaw`, port 4050). Anyone
demoing this should say so plainly rather than imply the whole backend is
sandboxed.

---

## 6. Student progress and the knowledge graph

Hermes is a NemoClaw runtime and is described as "self-improving agent with
learning loop", which sounds like the answer to per-student progress tracking.
It is not. Hermes memory is **single-user and agent-scoped** — `MEMORY.md` /
`USER.md` plus one external provider — and its `memory-graph` / `learning` /
`journey` commands render a Star Map of *the agent's own skills*, not a
learner's. It has no notion of many students.

We already have the right thing, unwired:

| file | what it does |
|---|---|
| `backend/sensei/learner.py` | per-student SQLite memory (mastery, attempts, language, exam) |
| `backend/sensei/graph.py` | concepts as nodes, prerequisites as edges; cycle-safe traversal, root-cause diagnosis, mastery-gated topological walk |

That second one *is* the progress knowledge graph, and the topological walk
gated by mastery is the Duolingo-style path. Backed by `graph.json` and
`sensei.db`. The work is wiring them into SenseiClaw so progress lives
server-side instead of in browser localStorage — not adopting Hermes.
