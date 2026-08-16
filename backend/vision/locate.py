"""Client for the LocateAnything grounding server.

Why a second model at all: the tutor model finds the wrong *line*, but drawing a box on
the student's photo needs pixels, and general VLMs are bad at that. Measured on the
sample kit, mean vertical error of the returned box:

    LocateAnything-3B     5-10 px      1.4-4.9 s
    GLM-4.6V              4 px         55 s
    Qwen3-VL 30B thinking 35 px        ~4 s
    Gemma 4 / Gemini      377-441 px   -- not loose, the wrong shape entirely

Handwritten lines sit ~74 px apart, so anything past that boxes somebody else's work.
Gemma and Gemini returned a tall narrow column instead of a text line; they were never
trained on this coordinate convention and no prompt fixes it.

This runs as its own always-on container on its own port, so pairing it with a separate
reasoning model costs nothing -- unlike the single-pinned router, where a second model id
means a 1-5 minute cold swap on the call that triggers it.
"""

from __future__ import annotations

import base64
import os
from dataclasses import dataclass

import httpx

from sensei.config import Settings, assert_no_egress

DEFAULT_LOCATE_URL = "http://gn100-260b.local:8001"

# The server was trained on a fixed set of prompt templates; free-form phrasing degrades
# accuracy. "ground_single" is the one for "find the one thing matching this description".
TASK_SINGLE = "ground_single"
TASK_TEXT = "ground_text"


@dataclass(frozen=True)
class Box:
    """Pixel box in the coordinates of the image as sent. No normalisation to undo."""

    x1: float
    y1: float
    x2: float
    y2: float

    def as_tuple(self) -> tuple[float, float, float, float]:
        return (self.x1, self.y1, self.x2, self.y2)


def locate_base_url() -> str:
    return os.environ.get("SENSEI_LOCATE_URL", DEFAULT_LOCATE_URL).rstrip("/")


class Locator:
    """Finds one written line on a page and returns where it sits, in pixels."""

    def __init__(self, settings: Settings, base_url: str | None = None) -> None:
        self.s = settings
        self.base_url = (base_url or locate_base_url()).rstrip("/")
        # Grounding is ~1-5s. Nothing like the router's cold swap, so don't inherit that
        # timeout -- a hang here should surface fast rather than sit for 15 minutes.
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(120))

    async def aclose(self) -> None:
        await self._client.aclose()

    async def healthy(self) -> bool:
        url = f"{self.base_url}/health"
        assert_no_egress(url, self.s)
        try:
            r = await self._client.get(url, timeout=10)
            return r.json().get("status") == "ok"
        except Exception:
            return False

    async def find_line(
        self,
        image_bytes: bytes,
        line: str,
        *,
        mime: str = "image/png",
        task: str = TASK_SINGLE,
    ) -> Box | None:
        """Box the handwritten `line` on this page, or None if it isn't found.

        `line` should be the transcription the tutor model produced, not a paraphrase --
        the match is visual, and it disambiguates correctly even when five lines on the
        page start with the same characters.
        """
        url = f"{self.base_url}/v1/locate"
        assert_no_egress(url, self.s)

        b64 = base64.b64encode(image_bytes).decode()
        r = await self._client.post(
            url,
            json={"image": f"data:{mime};base64,{b64}", "task": task, "query": line},
        )
        r.raise_for_status()
        boxes = r.json().get("boxes") or []
        if not boxes:
            return None
        b = boxes[0]
        return Box(b["x1"], b["y1"], b["x2"], b["y2"])
