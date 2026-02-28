"""未实现的 Provider"""

from typing import Generator

from app.engine.llm_providers.base import LLMProvider
from app.engine.llm_providers.types import LLMRequest, LLMResponse, LLMStreamChunk


class UnsupportedProvider(LLMProvider):
    """未实现的 Provider，调用时直接抛错"""

    def __init__(self, provider_type: str):
        self.provider_type = provider_type

    def complete(self, request: LLMRequest) -> LLMResponse:
        raise NotImplementedError(f"Provider type '{self.provider_type}' 尚未实现")

    def stream(self, request: LLMRequest) -> Generator[LLMStreamChunk, None, None]:
        raise NotImplementedError(f"Provider type '{self.provider_type}' 尚未实现")
