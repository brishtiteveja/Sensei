"""Runtime configuration.

Two things in here are load-bearing for the Spark-track claim and should not be
loosened casually:

* ``MODEL`` is a single pin. The vllm router keeps one model resident; asking for a
  different id triggers a 1-5 minute cold swap served on the same HTTP call. One pin,
  whole app.
* ``OFFLINE`` asserts that nothing reaches off-box at runtime. The demo ends with the
  network cable pulled, so this needs to be true in fact, not just in spirit.
"""

from __future__ import annotations

import ipaddress
import os
from dataclasses import dataclass
from urllib.parse import urlparse

# The pin. Chosen because it is the only model that clears both bars we need:
# vision (reads a photo of handwritten work) and multilingual Socratic tutoring,
# at a speed that feels live (72 tok/s). Both were validated on hardware -- see
# docs/PLAN.md.
DEFAULT_MODEL = "qwen3-vl-30b-a3b-gguf"

# A cold swap is served on the same call it triggered, so anything less than this
# turns a slow-but-fine request into a spurious failure.
DEFAULT_TIMEOUT_S = 900


@dataclass(frozen=True)
class Settings:
    base_url: str
    api_key: str
    model: str
    timeout_s: int
    offline: bool

    @property
    def health_url(self) -> str:
        """Router health endpoint. Needs no auth and reports the resident model."""
        return self.base_url.removesuffix("/v1") + "/health"


def load_settings() -> Settings:
    base_url = os.environ.get(
        "SENSEI_BASE_URL", "http://localhost:8010/v1"
    ).rstrip("/")

    return Settings(
        base_url=base_url,
        api_key=os.environ.get("SENSEI_API_KEY", ""),
        model=os.environ.get("SENSEI_MODEL", DEFAULT_MODEL),
        timeout_s=int(os.environ.get("SENSEI_TIMEOUT", DEFAULT_TIMEOUT_S)),
        # Default ON. The offline guarantee is the pitch; you opt out of it
        # deliberately (e.g. dev against the Tailscale box), never by forgetting.
        offline=os.environ.get("SENSEI_OFFLINE", "1") != "0",
    )


def _is_local_host(host: str) -> bool:
    """True if `host` is loopback, private-range, or a .local/tailnet name.

    Used to enforce the offline guarantee. Anything that resolves outside this set
    is treated as egress and refused.
    """
    if not host:
        return False
    if host in ("localhost", "127.0.0.1", "::1"):
        return True
    if host.endswith((".local", ".internal", ".ts.net")):
        return True
    try:
        return ipaddress.ip_address(host).is_private
    except ValueError:
        return False


def assert_no_egress(url: str, settings: Settings) -> None:
    """Refuse a request that would leave the box while offline mode is on.

    Deliberately raised as a hard error rather than a warning: silently falling back
    to the cloud is exactly the failure this is meant to make impossible, and it would
    not be visible until the cable is out on stage.
    """
    if not settings.offline:
        return
    host = urlparse(url).hostname or ""
    if not _is_local_host(host):
        raise RuntimeError(
            f"SENSEI_OFFLINE=1 refuses off-box request to {host!r}. "
            "Sensei runs entirely on the GB10; set SENSEI_OFFLINE=0 only for dev "
            "against a remote Spark."
        )
