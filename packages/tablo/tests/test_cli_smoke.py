import json
import subprocess
import sys
from pathlib import Path

import pandas as pd


OPERATIONS_JSON = json.dumps(
    {
        "operations": [
            {
                "type": "drop_columns",
                "file_id": "orders",
                "table": "Sheet1",
                "columns": ["Date"],
                "description": "删除 Date 列",
            }
        ]
    },
    ensure_ascii=False,
)


def test_cli_run_executes_minimal_local_case(tmp_path: Path):
    input_file = tmp_path / "orders.xlsx"
    pd.DataFrame(
        [
            {"Name": "A", "Date": "2024-01-01", "Amount": 1},
            {"Name": "B", "Date": "2024-01-02", "Amount": 2},
        ]
    ).to_excel(input_file, index=False)

    env = dict(__import__("os").environ)
    env["PYTHONPATH"] = "packages/tablo/src"
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "tablo.cli",
            "run",
            str(input_file),
            "删除 Date 列",
            "--operations-json",
            OPERATIONS_JSON,
        ],
        cwd=Path(__file__).resolve().parents[3],
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert payload["errors"] is None
    assert payload["modified_file_ids"] == ["orders"]
