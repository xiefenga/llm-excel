from tablo import EventType, ProcessConfig
from tablo.stages import ExecuteStage, GenerateValidateStage


class FakeLLMClient:
    def generate_operations_stream(self, *args, **kwargs):
        yield "", '{"operations": []}'

    def generate_operations(self, *args, **kwargs):
        return '{"operations": []}'


def test_tablo_stages_are_exported():
    assert GenerateValidateStage is not None
    assert ExecuteStage is not None
    assert EventType.STAGE_START.value == "start"
    assert ProcessConfig().max_validation_retries == 2
