from pathlib import Path


PROCESSOR_STREAM = Path(__file__).resolve().parents[1] / "app/services/processor_stream.py"


def test_processor_stream_imports_tablo_contracts():
    content = PROCESSOR_STREAM.read_text()
    assert "from tablo.models import FileCollection, column_index_to_letter" in content
    assert "from tablo import ExcelProcessor, ProcessConfig, EventType" in content
