#!/usr/bin/env python3
"""从 package.json 读取版本并生成 __version__.py

用途：
- 在 Docker 构建时生成版本文件
- 在本地开发时也可手动运行
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timezone


def main():
    # 获取项目根目录（脚本在 apps/api/scripts/）
    script_dir = Path(__file__).parent
    api_dir = script_dir.parent
    root_dir = api_dir.parent.parent

    # 读取 package.json（优先使用 /tmp/package.json，用于 Docker 构建）
    package_json_candidates = [
        Path("/tmp/package.json"),  # Docker 构建时的位置
        root_dir / "package.json",  # 本地开发时的位置
    ]

    package_json_path = None
    for candidate in package_json_candidates:
        if candidate.exists():
            package_json_path = candidate
            break

    if not package_json_path:
        print(f"❌ 错误：找不到 package.json，尝试过的位置:", file=sys.stderr)
        for candidate in package_json_candidates:
            print(f"   - {candidate}", file=sys.stderr)
        sys.exit(1)

    try:
        with open(package_json_path, encoding="utf-8") as f:
            data = json.load(f)
            version = data.get("version")

            if not version:
                print("❌ 错误：package.json 中没有 version 字段", file=sys.stderr)
                sys.exit(1)
    except Exception as e:
        print(f"❌ 读取 package.json 失败: {e}", file=sys.stderr)
        sys.exit(1)

    # 生成构建时间（UTC）
    build_time = datetime.now(timezone.utc).isoformat()

    # 生成 __version__.py
    version_file_path = api_dir / "app" / "__version__.py"

    content = f'''"""
应用版本信息（自动生成，请勿手动修改）

此文件在构建时自动生成，版本号来源于项目根目录的 package.json
"""

__version__ = "{version}"
__build_time__ = "{build_time}"
'''

    try:
        version_file_path.write_text(content, encoding="utf-8")
        print(f"✅ 生成版本文件成功")
        print(f"   版本: {version}")
        print(f"   构建时间: {build_time}")
        print(f"   文件位置: {version_file_path}")
    except Exception as e:
        print(f"❌ 写入版本文件失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
