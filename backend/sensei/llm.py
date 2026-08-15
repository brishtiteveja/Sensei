"""Thin client over the vllm router's OpenAI-compatible API.

Deliberately not the `openai` SDK: we need control over the cold-swap timeout and we
want the offline guard to sit on every outbound call. It is a small enough surface to
own outright.
"""

from __future__ import annotations

import base64
import json
from typing import AsyncIterator, Any

import httpx

from .config import Settings, assert_no_egress


class SpeaksNothingUseful(RuntimeError):
    """Raised when the model returns no usable content.

    Almost always means a reasoning model hit the token ceiling and returned
    ``content: null`` with ``finish_reason: "length"`` -- the answer never made it out
    past the thinking block. Distinct from a transport error, because the fix is
    different (raise max_tokens, don't retry).
    """


class LLM:
    def __init__(self, settings: Settings) -> None:
        self.s = settings
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(settings.timeout_s))

    async def aclose(self) -> None:
        await self._client.aclose()

    def _headers(self) -> dict[str, str]:
        h = {"Content-Type": "application/json"}
        if self.s.api_key:
            h["Authorization"] = f"Bearer {self.s.api_key}"
        return h

    async def resident_model(self) -> str | None:
        """Which model the router currently has loaded, or None if unreachable.

        Cheap and unauthenticated. Worth calling before anything expensive so we can
        tell "cold swap in progress" apart from "server is down" -- they look the same
        from the client otherwise.
        """
        url = self.s.health_url
        assert_no_egress(url, self.s)
        try:
            r = await self._client.get(url, timeout=30)
            loaded = r.json().get("loaded") or []
            return loaded[0] if loaded else None
        except Exception:
            return None

    async def available_models(self) -> list[str]:
        """Live catalog.

        Read at boot rather than hardcoded: the catalog has already drifted from the
        vendor docs, and discovering that at the event would be expensive.
        """
        url = f"{self.s.base_url}/models"
        assert_no_egress(url, self.s)
        r = await self._client.get(url, headers=self._headers(), timeout=60)
        r.raise_for_status()
        return sorted(m["id"] for m in r.json().get("data", []))

    async def stream(
        self,
        messages: list[dict[str, Any]],
        *,
        max_tokens: int = 800,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """Stream assistant text.

        Streaming is not just for UX here -- it keeps the connection producing bytes
        during a cold swap, which is what stops an otherwise-healthy request from
        looking like a hang.
        """
        url = f"{self.s.base_url}/chat/completions"
        assert_no_egress(url, self.s)

        payload = {
            "model": self.s.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
        }

        async with self._client.stream(
            "POST", url, headers=self._headers(), json=payload
        ) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:].strip()
                if data == "[DONE]":
                    return
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue
                for choice in chunk.get("choices", []):
                    piece = (choice.get("delta") or {}).get("content")
                    if piece:
                        yield piece

    async def complete(
        self,
        messages: list[dict[str, Any]],
        *,
        max_tokens: int = 800,
        temperature: float = 0.4,
    ) -> str:
        """Non-streaming completion, for agent steps where we want the whole answer."""
        url = f"{self.s.base_url}/chat/completions"
        assert_no_egress(url, self.s)

        r = await self._client.post(
            url,
            headers=self._headers(),
            json={
                "model": self.s.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
        )
        r.raise_for_status()
        choice = r.json()["choices"][0]
        content = choice["message"].get("content")

        if not content:
            raise SpeaksNothingUseful(
                f"empty content (finish_reason={choice.get('finish_reason')}). "
                "If this is a reasoning model, raise max_tokens -- the answer is being "
                "truncated behind the thinking block."
            )
        return strip_box_markers(content)


def strip_box_markers(text: str) -> str:
    """Remove GLM-style answer delimiters.

    Only GLM-4.6V emits these, and it isn't our pin -- but the pin is a config value
    and someone will point this at GLM during benchmarking. Cheap to tolerate.
    """
    return (
        text.replace("<|begin_of_box|>", "").replace("<|end_of_box|>", "").strip()
    )


def image_message(prompt: str, image_bytes: bytes, mime: str = "image/jpeg") -> dict:
    """Build a multimodal user message from raw image bytes."""
    b64 = base64.b64encode(image_bytes).decode()
    return {
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
        ],
    }
