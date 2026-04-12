from pathlib import Path


def test_tablo_io_stays_free_of_api_config_and_minio():
    content = (Path(__file__).resolve().parents[1] / "src/tablo/io.py").read_text()
    assert "app.core.config" not in content
    assert "Minio(" not in content
    assert "load_tables_from_minio_paths" not in content
