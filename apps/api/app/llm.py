import os
from abc import ABC, abstractmethod

from google import genai
from google.genai import types
from pydantic import BaseModel


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
        max_tokens: int = 1024,
    ) -> str: ...


class GeminiProvider(LLMProvider):
    def __init__(self) -> None:
        self._client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    async def complete(
        self,
        system: str,
        messages: list[ChatMessage],
        model: str,
        max_tokens: int = 1024,
    ) -> str:
        # Gemini uses "model" role instead of "assistant"
        contents = [
            types.Content(
                role="model" if m.role == "assistant" else "user",
                parts=[types.Part(text=m.content)],
            )
            for m in messages
        ]
        response = await self._client.aio.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=max_tokens,
            ),
        )
        return response.text


_provider: LLMProvider | None = None


def get_llm() -> LLMProvider:
    global _provider
    if _provider is None:
        _provider = GeminiProvider()
    return _provider
