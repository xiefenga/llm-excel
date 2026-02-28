"""Provider Registry"""

from typing import Dict, Optional, Tuple
from uuid import UUID

from app.engine.llm_providers.adapters.openai import OpenAIProvider
from app.engine.llm_providers.adapters.unsupported import UnsupportedProvider
from app.engine.llm_providers.types import LLMProviderConfig


class ProviderRegistry:
    """Provider Registry，按 type 创建适配器并缓存"""

    def __init__(self):
        self._factories = {
            "openai": self._build_openai,
            "openai_compatible": self._build_openai,
            "anthropic": self._build_unsupported,
            "google": self._build_unsupported,
            "gemini": self._build_unsupported,
            "azure_openai": self._build_unsupported,
            "deepseek": self._build_unsupported,
            "qwen": self._build_unsupported,
            "zhipu": self._build_unsupported,
            "ollama": self._build_unsupported,
        }
        self._cache: Dict[Tuple[Optional[UUID], str], object] = {}

    def get_adapter(self, provider: LLMProviderConfig):
        cache_key = (provider.id, provider.type)
        if cache_key in self._cache:
            return self._cache[cache_key]

        factory = self._factories.get(provider.type, self._build_unsupported)
        adapter = factory(provider)
        self._cache[cache_key] = adapter
        return adapter

    def _build_openai(self, provider: LLMProviderConfig):
        if not provider.api_key:
            raise ValueError(f"Provider '{provider.name}' 缺少 api_key")
        return OpenAIProvider(api_key=provider.api_key, base_url=provider.base_url)

    def _build_unsupported(self, provider: LLMProviderConfig):
        return UnsupportedProvider(provider.type)
