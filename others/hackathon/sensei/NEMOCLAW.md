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

**`NEMOCLAW_GATEWAY_PORT` must be set on *every* invocation, not just onboard.**
Otherwise follow-up commands look for a gateway on 8080, find nginx, and report
`Sandbox 'sensei' does not exist` — which is alarming and untrue. Export it:

```bash
export NEMOCLAW_GATEWAY_PORT=8181
```

---

## 4. Hardening the egress policy

Non-interactive onboarding silently applies the **balanced** tier, which is far
more open than we want: presets `npm`, `pypi`, `huggingface`, `brew`, and
`openclaw-pricing`. `brew` alone opens `github.com`, `ghcr.io`, and
`raw.githubusercontent.com`. Strip all five, then strip the baseline entries
underneath them:

```bash
export NEMOCLAW_GATEWAY_PORT=8181
for p in npm pypi huggingface brew openclaw-pricing; do
  nemoclaw sensei policy remove "$p" -y
done
for k in clawhub npm_registry nvidia openclaw_api openclaw_docs; do
  nemoclaw sensei policy exclude "$k" --force -y
done
```

Use `--dry-run` first; it prints exactly which endpoints a removal closes.

That leaves precisely two baseline policies:

| policy | why it stays |
|---|---|
| `managed_inference` | the `inference.local` route — cannot be excluded anyway |
| `openclaw_gateway_dialback` | the gateway needs it to talk to the sandbox |

Telemetry is on by default — `OPENSHELL_TELEMETRY_ENABLED=false`.

Loopback (`127.0.0.0/8`) is *always* blocked from inside the sandbox and cannot
be allowed. Anything the sandbox must reach has to bind `0.0.0.0`.

---

## 5. Verified, 16 Aug 2026

Run from inside the sandbox with `nemoclaw sensei exec`:

```
https://inference.local/v1/models     HTTP 200
https://github.com                    exit 56  (connection reset)
https://registry.npmjs.org            exit 56
https://pypi.org                      exit 56
https://huggingface.co                exit 56
https://clawhub.ai                    exit 56
https://raw.githubusercontent.com     exit 56
```

And the 200 is genuinely our box, not a stub — the catalog comes back
`"owned_by":"dgx-spark"` listing the real Spark models.

**This is the demo.** One command shows a sandboxed agent that can reach the
local tutor model and, provably, nothing else on the internet.

---

## 6. Can we move SenseiClaw off pm2 and onto NemoClaw?

**No.** Tested on 16 Aug, and worth writing down so it is not re-litigated.

Two independent blockers:

1. **NemoClaw runs three agent runtimes** — `openclaw`, `hermes`,
   `langchain-deepagents-code`. SenseiClaw is a FastAPI HTTP service. It is not
   an agent runtime, so there is no `nemoclaw` command that runs it. This is not
   a configuration gap; it is a category difference.

2. **The route is not reachable from the host.** The obvious fallback — leave
   SenseiClaw on pm2 but send its inference through the policy proxy — does not
   work either. The gateway on `:8181` is OpenShell's *control* plane;
   `http://127.0.0.1:8181/v1/models` returns **404**. `inference.local` is a
   sandbox-internal name resolved inside the container's network namespace, and
   there is no host-side OpenAI-compatible listener to point `SENSEI_BASE_URL` at.

So SenseiClaw stays on pm2 (`senseiclaw`, port 4050), and NemoClaw owns a
separate, genuinely sandboxed agent. Both are true statements and they do not
overlap.

**Say it accurately when demoing.** The honest claim is *"here is a sandboxed
agent that can reach our local model and nothing else"* — which we can prove
live in one command. The dishonest version is *"our backend runs sandboxed under
NemoClaw"*, which is false and which a judge who knows the tool will catch.

To actually get SenseiClaw inside the sandbox you would have to reimplement the
tutor as an OpenClaw agent rather than a FastAPI service. That is a rewrite, not
a migration, and it is not a hackathon-weekend job.

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
