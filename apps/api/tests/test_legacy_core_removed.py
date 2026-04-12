from pathlib import Path


LEGACY_CORE_FILES = [
    "app/engine/models.py",
    "app/engine/pivot_models.py",
    "app/engine/functions.py",
    "app/engine/parser.py",
    "app/engine/executor.py",
    "app/engine/excel_generator.py",
    "app/engine/output_generator.py",
    "app/processor/types.py",
    "app/processor/excel_processor.py",
    "app/processor/stages/base.py",
    "app/processor/stages/errors.py",
    "app/processor/stages/generate_validate.py",
    "app/processor/stages/execute.py",
]


def test_legacy_compatibility_layer_files_are_removed():
    root = Path(__file__).resolve().parents[1]
    missing = [path for path in LEGACY_CORE_FILES if not (root / path).exists()]
    assert missing == LEGACY_CORE_FILES
