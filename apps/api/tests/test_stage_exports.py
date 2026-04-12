import tablo.stages as stages
from tablo.stages.errors import StageError


def test_stages_package_only_exports_active_stages():
    assert stages.__all__ == [
        "GenerateValidateStage",
        "ExecuteStage",
    ]
    assert hasattr(stages, "GenerateValidateStage")
    assert hasattr(stages, "ExecuteStage")
    assert not hasattr(stages, "AnalyzeStage")
    assert not hasattr(stages, "GenerateStage")
    assert not hasattr(stages, "ValidateStage")


def test_stage_error_is_available_from_dedicated_module():
    assert issubclass(StageError, Exception)
