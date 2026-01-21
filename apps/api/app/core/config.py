"""配置"""

from pathlib import Path

# 存储目录
STORAGE_DIR = Path("storage")
UPLOAD_DIR = STORAGE_DIR / "uploads"
OUTPUT_DIR = STORAGE_DIR / "outputs"


def init_dirs():
    """初始化目录"""
    STORAGE_DIR.mkdir(exist_ok=True)
    UPLOAD_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)
