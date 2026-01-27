"""SQLAlchemy declarative base（供模型与 Alembic 使用，此处不创建引擎）"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """SQLAlchemy 基础模型类"""
    pass
