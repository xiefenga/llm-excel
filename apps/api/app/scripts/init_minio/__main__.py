#!/usr/bin/env python3
"""MinIO 初始化脚本

功能：
1. 等待 MinIO 服务就绪
2. 创建必要的存储桶
3. 上传默认文件（如默认头像）

使用：
    python -m app.scripts.init_minio
    或
    python app/scripts/init_minio.py
"""

import os
import sys
from pathlib import Path
import time

try:
    from minio import Minio
    from minio.error import S3Error
except ImportError:
    print("❌ 错误：未安装 minio 库")
    print("   请安装：pip install minio")
    sys.exit(1)


def wait_for_minio(client: Minio, max_retries: int = 30) -> bool:
    """等待 MinIO 服务就绪"""
    print("⏳ 等待 MinIO 服务就绪...")
    for i in range(max_retries):
        try:
            client.list_buckets()
            print("✅ MinIO 已就绪")
            return True
        except Exception as e:
            if i < max_retries - 1:
                print(f"   MinIO 还未就绪，等待中... ({i+1}/{max_retries})")
                time.sleep(2)
            else:
                print(f"❌ MinIO 连接超时: {e}")
                return False
    return False


def ensure_bucket(client: Minio, bucket_name: str) -> bool:
    """确保存储桶存在"""
    try:
        if client.bucket_exists(bucket_name):
            print(f"✓ 存储桶 '{bucket_name}' 已存在")
            return True

        client.make_bucket(bucket_name)
        print(f"✅ 创建存储桶 '{bucket_name}' 成功")
        return True
    except S3Error as e:
        print(f"❌ 创建存储桶 '{bucket_name}' 失败: {e}")
        return False


def upload_default_files(client: Minio, bucket_name: str, data_dir: Path) -> None:
    """上传默认文件到 __SYS__ 目录"""
    print("📁 上传默认文件...")

    # 遍历 data_dir 下的所有文件
    if not data_dir.exists():
        print(f"⚠️  默认文件目录不存在: {data_dir}")
        return

    uploaded_count = 0
    for file_path in data_dir.rglob("*"):
        if file_path.is_file():
            try:
                # 计算相对路径
                relative_path = file_path.relative_to(data_dir)
                # 上传到 __SYS__ 目录
                object_name = f"__SYS__/{relative_path}"

                # 根据文件扩展名设置 content_type
                content_type = "application/octet-stream"
                suffix = file_path.suffix.lower()
                if suffix == ".png":
                    content_type = "image/png"
                elif suffix == ".jpg" or suffix == ".jpeg":
                    content_type = "image/jpeg"
                elif suffix == ".svg":
                    content_type = "image/svg+xml"
                elif suffix == ".xlsx":
                    content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

                client.fput_object(
                    bucket_name,
                    object_name,
                    str(file_path),
                    content_type=content_type
                )
                print(f"✅ 上传文件: {object_name}")
                uploaded_count += 1
            except S3Error as e:
                print(f"⚠️  上传文件 {file_path} 失败: {e}")

    if uploaded_count > 0:
        print(f"✅ 共上传 {uploaded_count} 个默认文件到 __SYS__ 目录")
    else:
        print("⚠️  未找到任何默认文件")


def main():
    # 从环境变量读取配置
    endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    bucket_name = os.getenv("MINIO_BUCKET", "llm-excel")

    print("🔧 MinIO 初始化脚本启动...")
    print(f"   Endpoint: {endpoint}")
    print(f"   Bucket: {bucket_name}")

    # 创建 MinIO 客户端
    client = Minio(
        endpoint=endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=False,
    )

    # 等待 MinIO 就绪
    if not wait_for_minio(client):
        sys.exit(1)

    # 创建存储桶
    if not ensure_bucket(client, bucket_name):
        sys.exit(1)

    # 上传默认文件（从挂载的 /minio_data 目录）
    data_dir = Path("/minio_data")
    upload_default_files(client, bucket_name, data_dir)

    print("✅ MinIO 初始化完成")


if __name__ == "__main__":
    main()
