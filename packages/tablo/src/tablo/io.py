"""Local Excel I/O for tablo core."""

from pathlib import Path
from typing import Dict, List, Union

import pandas as pd

from tablo.models import Table, ExcelFile, FileCollection


class ExcelParser:
    """Pure local-file Excel parser for tablo."""

    @staticmethod
    def parse_file(file_path: Union[str, Path], table_name: str | None = None) -> Table:
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")
        if file_path.suffix.lower() not in [".xlsx", ".xls", ".xlsm"]:
            raise ValueError(f"不支持的文件格式: {file_path.suffix}")
        if table_name is None:
            table_name = file_path.stem
        engine = "xlrd" if file_path.suffix.lower() == ".xls" else "openpyxl"
        try:
            df = pd.read_excel(file_path, engine=engine)
        except Exception as e:
            raise ValueError(f"读取 Excel 文件失败: {str(e)}") from e
        df = ExcelParser._clean_dataframe(df)
        return Table(name=table_name, data=df)

    @staticmethod
    def parse_file_all_sheets(file_path: Union[str, Path], file_id: str | None = None, sheet_names: List[str] | None = None) -> FileCollection:
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")
        engine = "xlrd" if file_path.suffix.lower() == ".xls" else "openpyxl"
        try:
            excel_file_data = pd.ExcelFile(file_path, engine=engine)
            all_sheet_names = excel_file_data.sheet_names
        except Exception as e:
            raise ValueError(f"读取 Excel 文件失败: {str(e)}") from e
        sheets_to_parse = all_sheet_names if sheet_names is None else sheet_names
        invalid_sheets = set(sheets_to_parse) - set(all_sheet_names)
        if invalid_sheets:
            raise ValueError(f"Sheet 不存在: {', '.join(invalid_sheets)}")
        collection = FileCollection()
        if file_id is None:
            file_id = file_path.stem
        excel_file = ExcelFile(file_id=file_id, filename=file_path.name)
        for sheet_name in sheets_to_parse:
            df = pd.read_excel(file_path, sheet_name=sheet_name, engine=engine)
            df = ExcelParser._clean_dataframe(df)
            excel_file.add_sheet(Table(name=sheet_name, data=df))
        collection.add_file(excel_file)
        return collection

    @staticmethod
    def parse_multiple_files(file_paths: Dict[str, Union[str, Path]]) -> FileCollection:
        collection = FileCollection()
        for file_id, file_path in file_paths.items():
            file_collection = ExcelParser.parse_file_all_sheets(file_path, file_id=file_id)
            for excel_file in file_collection:
                collection.add_file(excel_file)
        return collection

    @staticmethod
    def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
        df.columns = [str(col).strip() for col in df.columns]
        df = df.dropna(how="all")
        df = df.reset_index(drop=True)
        df = df.where(pd.notna(df), None)
        return df

    @staticmethod
    def get_file_info(file_path: Union[str, Path]) -> Dict:
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")
        engine = "xlrd" if file_path.suffix.lower() == ".xls" else "openpyxl"
        try:
            excel_file = pd.ExcelFile(file_path, engine=engine)
            sheets_info = {}
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name, engine=engine)
                sheets_info[sheet_name] = {
                    "rows": len(df),
                    "columns": len(df.columns),
                    "column_names": list(df.columns),
                }
            return {
                "file_name": file_path.name,
                "file_size": file_path.stat().st_size,
                "sheets": sheets_info,
            }
        except Exception as e:
            raise ValueError(f"读取文件信息失败: {str(e)}") from e
