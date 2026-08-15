# Bounty Assessment: NVIDIA NemoClaw + OpenShell

**Researched:** 2026-08-15
**Bounty:** "Best Use of NVIDIA NemoClaw and OpenShell" (Do track), NVIDIA Spark Hack Series Seattle
**Prize:** $100 Brev credits per team member
**Verdict:** **CONDITIONAL GO — hard 90-minute timeboxed spike, with explicit kill criteria.** See [Recommendation](#recommendation).

Both tools are real, current, Apache-2.0, and have **first-class ARM64 / DGX Spark GB10 support**. This is not a naming coincidence or a rebrand. Documentation is good and the claims below are sourced from the actual repos, not inferred.

---

## 1. What these things actually are

### NVIDIA OpenShell — the sandbox + policy engine

`github.com/NVIDIA/OpenShell` · Apache 2.0 · repo created 2026-02-24 · 8.2k stars · **alpha, v0.0.106**

OpenShell is a **runtime that executes a process inside a locked-down sandbox governed by a declarative YAML policy**. It is not an agent framework. Think "firejail/gVisor for agents, with an OPA policy layer and a TUI."

Enforcement is in four layers:

| Layer | Mechanism |
|---|---|
| Filesystem | **Landlock LSM** — kernel-level read-only / read-write path allowlists |
| Process | seccomp syscall filtering, capability drops, `run_as_user` |
| Network | **Network namespace isolation + host-side CONNECT proxy + OPA** — default deny |
| Inference | Model API calls rerouted to a gateway-controlled backend |

The network layer is the one that matters to us, and it is stronger than I expected:

> "All traffic routes through the host-side veth IP (`10.200.0.1`) where the proxy listens. Even if a process ignores proxy environment variables, it can only reach the proxy."
> — [OpenShell security best practices](https://docs.nvidia.com/openshell/security/best-practices)

Network namespace isolation is **not a user-facing toggle** — it's always on in proxy mode. If no `network_policies` entry matches destination host + port + **calling binary**, the connection is denied and surfaced in the TUI (`openshell term`) for operator approval. Policies are hot-reloadable for the network/inference sections (`openshell policy set`); filesystem/process sections are locked at sandbox creation.

**This is exactly the external enforcement our thesis needs.** More on that in §5.

### NVIDIA NemoClaw — the opinionated stack on top

`github.com/NVIDIA/NemoClaw` · Apache 2.0 · repo created 2026-03-15 · 22.2k stars · TypeScript · **alpha, no tagged releases**

NemoClaw is a **reference stack / installer / CLI** that stands up OpenShell + an agent + inference + a baseline network policy in one command. It is *not* itself an agent framework either. It provides guided onboarding, managed inference routing, policy presets, snapshots, and lifecycle ops.

Announced at **GTC 2026 (March 16, 2026)** as part of the NVIDIA Agent Toolkit, in early preview. Roughly five months old, extremely active (daily OpenShell releases; NemoClaw pushed within hours of this writing).

**Critical constraint — NemoClaw supports exactly three agent runtimes:**

- **OpenClaw** (default)
- **Hermes**
- **LangChain Deep Agents Code**

It does **not** have a generic "wrap my arbitrary Python agent" mode. This is the single biggest fit problem for Sensei and is addressed in §6.

### How they relate

```
NemoClaw  (installer + CLI + managed inference + policy presets)
   └── OpenShell  (sandbox runtime: Landlock + seccomp + netns + OPA proxy)
         └── OpenClaw | Hermes | LangChain Deep Agents Code
```

You can use OpenShell standalone (`openshell sandbox create -- <any command>` accepts arbitrary commands). NemoClaw is the batteries-included path. The bounty requires **both**, so we must go through NemoClaw.

---

## 2. ARM64 / GB10 support — yes, verified, first-class

This was the biggest risk and it comes back clean.

**OpenShell** ([support matrix](https://docs.nvidia.com/openshell/reference/support-matrix)):

| Platform | Arch | Status |
|---|---|---|
| Linux (Debian/Ubuntu) | x86_64 | Supported |
| **Linux (Debian/Ubuntu)** | **aarch64 (arm64)** | **Supported** |
| macOS | Apple Silicon | Supported |
| Windows WSL2 | x86_64 | Experimental |

Release v0.0.106 ships `openshell_0.0.106-1_arm64.deb`, `openshell-gateway-aarch64-unknown-linux-gnu.tar.gz`, `openshell-sandbox-aarch64-unknown-linux-gnu.tar.gz`, and aarch64 wheels/RPMs/snaps. Gateway container images are published for `linux/arm64`. The CLI is a static musl binary (no glibc dependency).

**NemoClaw** goes further — it has *DGX Spark GB10 specific* serving presets checked into the repo:

```
managed-inference/presets/vllm.dgx-spark-gb10.single.nemotron-3.5-lightning-30b-a3b-nvfp4.yaml
managed-inference/presets/vllm.dgx-spark-gb10.single.muse-glimmer-30b-nvfp4-w4a4.yaml
managed-inference/presets/vllm.dgx-spark-gb10.dual.deepseek-v4-flash-0731.yaml
managed-inference/presets/llama-cpp.dgx-spark-gb10.single.nemotron-3-nano-30b-a3b.yaml
managed-inference/presets/local-model-profile.vllm.spark.v1.yaml
```

Those presets gate on literal readiness checks including `host.os.architecture == arm64`, `host.platform.dgx_spark == qualified`, and `host.gpu.driver_version >= 580.65.06`.

From `spark-install.md` in the NemoClaw repo:

> "DGX Spark needs no platform-specific pre-setup because Docker is pre-installed, so the standard OpenClaw quickstart works directly."

**Kernel requirements:** seccomp required (3.17+, universally present). Landlock *recommended*, not mandatory — NemoClaw's baseline policy uses `landlock: compatibility: best_effort` precisely because hard enforcement breaks things. DGX OS ships a recent enough kernel; Landlock should be available, but if it isn't, sandbox creation still succeeds in best-effort mode.

**Docker:** 28.0+ required. Pre-installed on DGX Spark.

---

## 3. Install and run on the GB10

### Prerequisites (from [NemoClaw prerequisites](https://docs.nvidia.com/nemoclaw/latest/get-started/prerequisites.html))

- DGX OS (Spark) with Docker — listed as a **tested platform**
- Node.js 22.19+, npm 10+
- Python 3 at a trusted system location
- `zstd`, `binutils`
- 4+ vCPU, 16 GB RAM, **40 GB free disk recommended**
- Sandbox image is ~2.4 GB compressed

### Install

```bash
# NemoClaw (installs OpenShell as a dependency). Follows the last-known-good tag.
curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash
```

Or OpenShell standalone:

```bash
curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh
# or
uv tool install -U openshell
```

The installer prompts `Run express install with these settings? [Y/n]`. Express installs OpenClaw with a preset for the detected platform. Answer **`n`** — we need to choose the inference provider manually (see §4).

### Minimal working example

```bash
# Non-interactive onboard against an already-running local vLLM
NEMOCLAW_AGENT=openclaw \
NEMOCLAW_SANDBOX_NAME=sensei \
NEMOCLAW_ACCEPT_THIRD_PARTY_SOFTWARE=1 \
nemoclaw onboard

nemoclaw list                       # list sandboxes
nemoclaw sensei status
nemoclaw sensei policy get          # dump the live policy
nemoclaw sensei policy explain      # human-readable egress explanation
nemoclaw sensei exec -- python3 -c "print('hello from inside the sandbox')"
nemoclaw sensei connect             # attach to the agent
openshell term                      # TUI: live gateway + denial feed
```

Useful flags:

- `--host-mount /abs/host/dir:/sandbox/dir` — expose a host directory **read-only** inside the sandbox (Linux/WSL2 only, requires the NemoClaw-managed Docker gateway, **no read-write mode**)
- `--from path/to/Dockerfile` — build the sandbox from our own Dockerfile (see caveat in §6)
- `--events=jsonl` — machine-readable onboarding event stream
- `--no-observability`

---

## 4. Cloud dependency — the honest answer

**Short version: it can run fully local at inference time, but it is not offline-clean out of the box, and installation absolutely requires internet.**

### The good

NemoClaw supports genuinely local inference providers with no cloud key:

| Provider | Status | Notes |
|---|---|---|
| Local vLLM (already running) | Tested with limitations | **Auto-detected on `localhost:8000`. No flag required. Model is whatever the server serves.** |
| Local llama.cpp (already running) | Experimental | loopback port 8081 |
| Ollama | Tested | port 11434 |
| Other OpenAI-compatible endpoint | Tested with limitations | Custom base URL; `COMPATIBLE_API_KEY` can be **any non-empty placeholder** if the endpoint needs no auth |

The `compatible-endpoint` route is explicitly documented to work with "vLLM, TensorRT-LLM, llama.cpp, LocalAI, and other compatible servers." You give it `http://localhost:8000/v1` and a model ID from `/v1/models`.

Inside the sandbox, the agent only ever talks to a gateway virtual host called **`inference.local`**. The gateway proxies that to whatever provider we configured. The sandbox never learns the real backend address.

### The bad — the stock baseline policy has real egress

`nemoclaw-blueprint/policies/openclaw-sandbox.yaml` ships allowing:

| Policy key | Host | Why |
|---|---|---|
| `nvidia` | `integrate.api.nvidia.com:443` | NVIDIA hosted inference |
| `managed_inference` | `inference.local:443` | gateway inference route |
| `clawhub` | `clawhub.ai:443` | plugin registry |
| `openclaw_api` | `openclaw.ai:443` | auth / plugin discovery |
| `openclaw_docs` | `docs.openclaw.ai:443` | docs, GET only |
| `npm_registry` | `registry.npmjs.org:443` | `openclaw plugins install` |
| `openclaw_gateway_dialback` | `10.200.0.2:18789/18790` | sub-agent WebSocket, sandbox-internal |

The file itself calls the clawhub/openclaw/npm group **"OpenClaw phone home."** GitHub and messaging platforms are *not* in the baseline (good — they were deliberately removed).

Each of these can be removed with `nemoclaw <name> policy exclude <key> --force`, which prints a feature-impact preview first. **Exception: `managed_inference` cannot currently be excluded** ("pending product direction"). That's fine for us — it points at `inference.local`, which we will have wired to our own vLLM, so it is not cloud egress.

So a zero-egress posture is reachable, but it is a **deliberate hardening step we have to perform and demonstrate**, not the default.

### The also-bad — OpenShell telemetry is on by default

> "OpenShell collects anonymous telemetry... Disable telemetry at runtime by setting `OPENSHELL_TELEMETRY_ENABLED=false` on the gateway deployment."

Content is claimed to be anonymous aggregate counts only (no hostnames, paths, prompts, model names). It can also be **compiled out entirely** — telemetry is a default-on Cargo feature, and `cargo build --release -p openshell-server --no-default-features` produces binaries with no telemetry endpoint or HTTP client at all. There's even a `tasks/scripts/verify-telemetry-compiled-out.sh` in the repo.

For a demo that ends with pulling the network cable, setting the env var is sufficient and honest. Mention it on the slide rather than letting a judge find it.

### Installation is not offline

The installer pulls from `nvidia.com`, GitHub, npm, and Docker registries; the sandbox image is ~2.4 GB compressed. **Install on hotel/venue wifi is a genuine schedule risk.** Runtime after install should be offline-capable, but I found **no air-gap / offline-install documentation for either project.** Treat "it runs with the cable out" as something we must empirically verify, not something documented.

---

## 5. Does OpenShell actually solve our "trust us" problem?

**Yes. This is the strongest finding in this document.**

Our current guarantee is a Python function in our own process that refuses non-LAN hosts. A skeptical judge is right to dismiss that — the same code that enforces it could bypass it.

OpenShell moves the boundary:

1. The agent runs in its **own network namespace** with no route to anything except the host-side proxy at `10.200.0.1`.
2. Every connection is evaluated by OPA against destination host + port + **the path of the calling binary**.
3. Unmatched connections are **denied and logged**, and surface live in `openshell term`.
4. The agent cannot turn this off — netns isolation is "not a user-facing knob."
5. Filesystem access is separately restricted at the kernel level by Landlock.

That is a categorically different claim: *"the process is physically unable to reach the network, and here is the denial log proving it tried and failed."* We can demo an adversarial moment — have the agent attempt `curl https://example.com`, show it blocked in the TUI, then pull the cable. That's a much better ending than pulling the cable alone.

### Two concrete gotchas that will bite us

**(a) Loopback is always blocked and cannot be overridden.**

> "Loopback (`127.0.0.0/8`), link-local (`169.254.0.0/16`), and unspecified (`0.0.0.0`) addresses are always blocked and cannot be overridden."

If our vLLM router binds `127.0.0.1:8000`, the sandbox **cannot reach it**, period. The supported pattern is the host-gateway hostname `host.openshell.internal` plus an explicit RFC1918 `allowed_ips` allowlist (OpenShell has an SSRF guard that rejects private resolved addresses unless allowlisted). NemoClaw already ships this as the `local-inference` preset:

```yaml
# nemoclaw-blueprint/policies/presets/local-inference.yaml (excerpt)
preset:
  name: local-inference
network_policies:
  local_inference:
    name: local_inference
    endpoints:
      - host: host.openshell.internal
        port: 8000                    # vLLM
        protocol: rest
        enforcement: enforce
        allowed_ips:
          - 10.0.0.0/8
          - 172.16.0.0/12
          - 192.168.0.0/16
        rules:
          - allow: { method: GET,  path: "/**" }
          - allow: { method: POST, path: "/**" }
    binaries:
      - { path: /usr/local/bin/openclaw }
      - { path: /usr/bin/python3 }
      - { path: /usr/bin/curl }
```

**Action item: our vLLM router must bind `0.0.0.0:8000`, not `127.0.0.1:8000`.** Check this before anything else — it's a one-line change and it's a hard blocker.

**(b) Policy is binary-scoped.** An endpoint is only reachable by the binaries listed under `binaries:`. If we run our pipeline with a venv Python at `/sandbox/venv/bin/python`, that path must be in the list — `/usr/bin/python3` won't cover it. Glob patterns (`*`, `**`) are supported.

---

## 6. Fit with Sensei — where it gets awkward

Sensei's curriculum agent is **custom Python in a FastAPI backend**. NemoClaw runs **OpenClaw, Hermes, or LangChain Deep Agents Code**. There is no supported "bring your own agent" path. Our options, best to worst:

### Option A — Stock OpenClaw sandbox, curriculum pipeline mounted and exec'd (recommended)

1. `nemoclaw onboard` with agent = OpenClaw, provider = `compatible-endpoint` (or auto-detected local vLLM) pointed at our existing router.
2. `--host-mount /home/projects/Sensei/backend/curriculum:/sandbox/curriculum` (read-only).
3. Harden the policy: exclude `nvidia`, `clawhub`, `openclaw_api`, `openclaw_docs`, `npm_registry`. Apply `local-inference` or leave everything on `inference.local`.
4. Run the pipeline via `nemoclaw sensei exec -- python3 /sandbox/curriculum/run.py <syllabus>`.
5. Demo: agent produces the knowledge graph; then attempt an outbound fetch and show the denial in `openshell term`; then pull the cable.

**Est. 2–4 hours if install is clean.**

**The wildcard:** Python dependencies. Host-mount is read-only and the sandbox has no egress to PyPI once hardened. Mitigations, in order of preference:
- **Rewrite the curriculum pipeline's HTTP calls against `urllib`/stdlib only.** If it only needs to POST to an OpenAI-compatible endpoint, it needs zero third-party packages. This is the cheapest de-risk and I'd do it first.
- Enable the `pypi` preset during setup, install deps, then `policy exclude pypi` before the demo. Defensible but adds a step.
- Pre-stage an aarch64 venv in the mounted directory (read-only venvs work if paths match). Fiddly.

### Option B — Rewrite the curriculum agent as LangChain Deep Agents Code

Most "legitimate" use of NemoClaw. Also the most work. **Do not attempt this with one day left.**

### Option C — `--from <Dockerfile>` with our own image

Documented, but the docs warn that for a custom OpenClaw image lacking the managed runtime (`/usr/local/bin/nemoclaw-start`, `/sandbox/.openclaw/openclaw.json`, `/tmp/gateway.log`), onboarding reports the image as unsupported rather than retrying. You'd have to replicate the managed runtime. **Not viable tonight.**

---

## Recommendation

### CONDITIONAL GO — timeboxed to 90 minutes, with hard kill criteria

The tools are real, the ARM64 story is clean, and the security angle genuinely upgrades our central claim from a promise to a demonstrable property. That last point is worth more than the $100 in Brev credits.

But NemoClaw does not support our agent shape, the install is a multi-gigabyte network-dependent operation on venue wifi, both projects are alpha at v0.0.x with daily releases, and we have one day and a scoped demo.

**Do this:**

**Timebox 1 (30 min) — prove the install.** One person, on the actual GB10, right now:
```bash
curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash     # answer 'n' to express
```
Meanwhile, someone else changes the vLLM router bind to `0.0.0.0:8000`.

**Timebox 2 (60 min) — prove the wiring.** Onboard a sandbox against our existing vLLM, harden the policy, get one `nemoclaw <name> exec -- python3 ...` round-trip that reaches the model through `inference.local`, and get one visible denial in `openshell term`.

**Kill criteria — abandon immediately and keep the existing demo if any of these hit:**
- Install doesn't complete in 30 minutes (image pulls, npm, Docker build)
- `nemoclaw onboard` won't accept our vLLM as a provider
- The curriculum pipeline needs third-party Python packages we can't get in without re-opening egress
- Anything requires an NVIDIA/NGC login we don't have

**Do not** rewrite the curriculum agent for Deep Agents. **Do not** attempt `--from Dockerfile`. **Do not** let the managed-vLLM path download a 30B Nemotron/Qwen model — that is tens of gigabytes and would blow the whole day. Use our existing pinned model via `compatible-endpoint` or auto-detected local vLLM only.

**The asymmetry that makes this worth 90 minutes:** even if we never submit for the bounty, getting OpenShell to enforce no-egress around our agent makes the main demo materially stronger. The downside is capped at 90 minutes. The upside applies to the primary submission regardless.

If the spike fails, say so on stage: *"we evaluated OpenShell for OS-level egress enforcement; here's the policy we'd apply"* — showing the YAML is still a better answer to "why should we trust your guard?" than having nothing.

---

## Uncertainties — read these before acting

Things I could **not** confirm and that you should not assume:

- **Offline runtime is undocumented.** No air-gap install guide exists for either project. I believe the gateway runs fine with no internet after install, but nothing in the docs states it. **Verify empirically before betting the demo ending on it.**
- **Time to install on a real DGX Spark is unmeasured.** The `build.nvidia.com/spark/nemoclaw/instructions` playbook page timed out on every fetch attempt. Prerequisites say 40 GB free disk and a 2.4 GB compressed image; actual wall-clock is unknown.
- **Whether `nemoclaw exec`-ing our own Python satisfies a judge's reading of "use NemoClaw."** Reasonable people could differ. Option A is a defensible interpretation, not a certain one.
- **Landlock availability on DGX OS specifically** — not verified. Falls back to `best_effort` if unavailable, so probably not a blocker, but it would weaken the filesystem half of the story.
- **GPU passthrough into the sandbox is experimental.** Irrelevant to us — our vLLM runs on the host — but don't wander into it.
- **NemoClaw has no tagged GitHub releases.** The installer follows a `lkg` (last-known-good) tag resolved server-side. You cannot easily pin a version.

---

## Sources

- [NVIDIA/OpenShell on GitHub](https://github.com/NVIDIA/OpenShell)
- [NVIDIA/NemoClaw on GitHub](https://github.com/NVIDIA/NemoClaw)
- [OpenShell support matrix](https://docs.nvidia.com/openshell/reference/support-matrix)
- [OpenShell security best practices](https://docs.nvidia.com/openshell/security/best-practices)
- [OpenShell developer guide / get started](https://docs.nvidia.com/openshell/latest/get-started)
- [NemoClaw prerequisites](https://docs.nvidia.com/nemoclaw/latest/get-started/prerequisites.html)
- [NemoClaw network policies reference](https://docs.nvidia.com/nemoclaw/latest/reference/network-policies.html)
- [Choose an inference provider](https://docs.nvidia.com/nemoclaw/latest/user-guide/openclaw/inference/learn-and-choose/choose-inference-provider)
- [Set up an OpenAI-compatible endpoint](https://docs.nvidia.com/nemoclaw/user-guide/hermes/inference/custom-endpoints/set-up-openai-compatible-endpoint)
- [Secure autonomous AI agents with OpenShell (NVIDIA blog)](https://blogs.nvidia.com/blog/secure-autonomous-ai-agents-openshell/)
- [NVIDIA announces NemoClaw (newsroom, Mar 2026)](https://nvidianews.nvidia.com/news/nvidia-announces-nemoclaw)
- [Secure long-running AI agents with OpenShell on DGX Spark](https://build.nvidia.com/spark/openshell)
- Repo files read directly: `nemoclaw-blueprint/policies/openclaw-sandbox.yaml`, `nemoclaw-blueprint/policies/presets/local-inference.yaml`, `managed-inference/presets/local-model-profile.vllm.spark.v1.yaml`, `spark-install.md`, `docs/reference/commands.mdx`, `docs/inference/choose-inference-provider.mdx`, OpenShell `README.md` + `telemetry/README.md`
