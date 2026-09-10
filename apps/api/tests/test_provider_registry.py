import pytest

from app.core.branding import get_branding
from app.engine.llm_providers import OpenAIProvider, ProviderRegistry, UnsupportedProvider
from app.engine.llm_providers.types import LLMProviderConfig, LLMRequest


@pytest.mark.parametrize('provider_type', ['openai', 'openai_compatible'])
def test_supported_provider_is_created_and_cached(provider_type):
    registry = ProviderRegistry()
    config = LLMProviderConfig(None, 'Example', provider_type,
                               'https://api.example.com/v1', 'test-key', {})
    adapter = registry.get_adapter(config)
    assert isinstance(adapter, OpenAIProvider)
    assert registry.get_adapter(config) is adapter


def test_unknown_provider_fails_explicitly():
    config = LLMProviderConfig(None, 'Example', 'unknown', None, None, {})
    adapter = ProviderRegistry().get_adapter(config)
    assert isinstance(adapter, UnsupportedProvider)
    with pytest.raises(NotImplementedError):
        adapter.complete(LLMRequest('example', []))


def test_default_branding():
    assert get_branding()['name'] == 'Selgetabel'
