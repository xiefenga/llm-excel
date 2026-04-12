"""Minimal CLI for tablo package."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from tablo import ExcelProcessor, ProcessConfig
from tablo.io import ExcelParser


class StaticLLMClient:
    def __init__(self, operations_json: str):
        self.operations_json = operations_json

    def generate_operations(self, query, analysis, schemas, previous_errors=None, previous_json=None):
        return self.operations_json

    def generate_operations_stream(self, query, analysis, schemas, previous_errors=None, previous_json=None):
        yield "", self.operations_json


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="tablo")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run tablo processing against local Excel file(s)")
    run_parser.add_argument("input", nargs="+", help="Input Excel file path(s)")
    run_parser.add_argument("query", help="Natural language request for the processing run")
    run_parser.add_argument("--operations-json", required=True, help="Static operations JSON for the minimal CLI smoke path")
    run_parser.add_argument("-o", "--output", help="Optional output xlsx path for modified tables")
    run_parser.add_argument("--stream", action="store_true", help="Use stream_llm mode")
    return parser


def run_command(args: argparse.Namespace) -> int:
    file_paths = {Path(path).stem: path for path in args.input}
    tables = ExcelParser.parse_multiple_files(file_paths)
    processor = ExcelProcessor(StaticLLMClient(args.operations_json))
    result = processor.process_sync(tables, args.query, ProcessConfig(stream_llm=args.stream))

    if args.output and result.modified_tables is not None:
        result.modified_tables.export_to_excel(args.output)

    payload: dict[str, Any] = result.to_dict()
    payload["modified_file_ids"] = result.get_modified_file_ids()
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if not result.has_errors() else 1


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "run":
        return run_command(args)
    parser.error(f"Unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
