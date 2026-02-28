"""LLM Provider 抽象接口"""

from abc import ABC, abstractmethod
from typing import Generator

from app.engine.llm_providers.types import LLMRequest, LLMResponse, LLMStreamChunk


class LLMProvider(ABC):
    """LLM Provider 抽象接口"""

    @abstractmethod
    def complete(self, request: LLMRequest) -> LLMResponse:
        """非流式调用"""
        raise NotImplementedError

    @abstractmethod
    def stream(self, request: LLMRequest) -> Generator[LLMStreamChunk, None, None]:
        """流式调用"""
        raise NotImplementedError
