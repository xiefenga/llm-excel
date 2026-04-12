"""API Excel parser adapter.

Local-file parsing is delegated to `tablo.ExcelParser` so the reusable core stays in
`packages/tablo`. This adapter keeps only the MinIO/settings-backed loading methods that
belong to the API infrastructure layer.
"""

import io
from pathlib import Path
from typing import List

import pandas as pd
from minio import Minio
from minio.error import S3Error

from tablo import ExcelParser as CoreExcelParser
from tablo.models import Table, ExcelFile, FileCollection
from app.core.config import settings


class ExcelParser(CoreExcelParser):
    """API adapter that extends the tablo local parser with MinIO-backed loading."""

    @staticmethod
    def _get_minio_client() -> Minio:
        return Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False,
        )

    @staticmethod
    def _extract_minio_object_name(path: str) -> str:
        clean_path = path.lstrip("/")

        public_base = f"{settings.MINIO_PUBLIC_BASE.rstrip('/')}/{settings.MINIO_BUCKET}"
        if public_base:
            prefix = f"{public_base}/"
            if clean_path.startswith(prefix):
                return clean_path[len(prefix) :]

        return clean_path

    @staticmethod
    def load_tables_from_minio_paths(file_records: List[tuple[str, str, str]]) -> FileCollection:
        collection = FileCollection()

        try:
            client = ExcelParser._get_minio_client()
        except RuntimeError as e:
            raise RuntimeError(f"初始化 MinIO 客户端失败: {e}") from e

        bucket_name = settings.MINIO_BUCKET

        for file_id, file_path, filename in file_records:
            object_name = ExcelParser._extract_minio_object_name(file_path)

            try:
                response = client.get_object(bucket_name, object_name)
                try:
                    data = response.read()
                finally:
                    response.close()
                    response.release_conn()
            except S3Error as e:
                raise FileNotFoundError(f"文件不存在或无法从 MinIO 读取: {e}") from e
            except Exception as e:
                raise RuntimeError(f"从 MinIO 读取文件失败: {e}") from e

            try:
                excel_bytes = io.BytesIO(data)
                file_suffix = Path(filename).suffix.lower()
                engine = "xlrd" if file_suffix == ".xls" else "openpyxl"
                excel_file_data = pd.ExcelFile(excel_bytes, engine=engine)
                sheet_names = excel_file_data.sheet_names

                excel_file = ExcelFile(file_id=file_id, filename=filename)

                for sheet_name in sheet_names:
                    df = pd.read_excel(
                        excel_file_data,
                        sheet_name=sheet_name,
                        engine=engine,
                    )
                    df = CoreExcelParser._clean_dataframe(df)
                    table = Table(name=sheet_name, data=df)
                    excel_file.add_sheet(table)

                collection.add_file(excel_file)

            except Exception as e:
                raise ValueError(f"解析 Excel 文件失败 ({filename}): {e}") from e

        return collection
