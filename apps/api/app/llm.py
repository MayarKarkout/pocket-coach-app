import logging
import os
from abc import ABC, abstractmethod

from fastapi import HTTPException
from google import genai
from google.genai import types
from google.genai.errors import ClientError, ServerError
from google.genai.types import FinishReason
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class LLMProvider(ABC):
    @abstractmethod
    async def complete(
        self,
        system: str,
        messages: list[ChatMessage],
        model: str,
    ) -> str: ...


class GeminiProvider(LLMProvider):
    def __init__(self) -> None:
        self._client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    async def complete(
        self,
        system: str,
        messages: list[ChatMessage],
        model: str,
    ) -> str:
        # Gemini uses "model" role instead of "assistant"
        contents = [
            types.Content(
                role="model" if m.role == "assistant" else "user",
                parts=[types.Part(text=m.content)],
            )
            for m in messages
        ]
        try:
            response = await self._client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=system),
            )
        except ClientError as e:
            if e.status_code == 429:
                raise HTTPException(status_code=503, detail="Gemini free tier quota reached. Try again tomorrow.")
            raise HTTPException(status_code=502, detail=f"Gemini error: {e}")
        except ServerError as e:
            if e.status_code == 503:
                raise HTTPException(status_code=503, detail="Gemini is overloaded right now. Try again in a few minutes.")
            raise HTTPException(status_code=502, detail=f"Gemini error: {e}")

        candidate = response.candidates[0] if response.candidates else None
        if candidate and candidate.finish_reason == FinishReason.MAX_TOKENS:
            logger.warning("LLM response truncated by model limit (model=%s)", model)
        return response.text


_provider: LLMProvider | None = None


def get_llm() -> LLMProvider:
    global _provider
    if _provider is None:
        _provider = GeminiProvider()
    return _provider
