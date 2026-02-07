"""版本检查模块

功能：
1. 检查数据库版本与代码版本是否匹配
2. 在应用启动时验证版本一致性
"""

from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

try:
    from app.__version__ import __version__
except ImportError:
    __version__ = "0.0.0-dev"


async def get_database_version(db: AsyncSession) -> str | None:
    """获取当前数据库版本（Alembic revision）"""
    try:
        result = await db.execute(
            text("SELECT version_num FROM alembic_version")
        )
        return result.scalar()
    except Exception:
        # 如果表不存在，说明数据库还未初始化
        return None


def get_latest_migration_version() -> str:
    """获取代码中的最新迁移版本"""
    # 获取 alembic.ini 路径
    api_dir = Path(__file__).parent.parent
    alembic_ini = api_dir / "alembic.ini"

    if not alembic_ini.exists():
        raise RuntimeError(f"找不到 alembic.ini: {alembic_ini}")

    config = Config(str(alembic_ini))
    script = ScriptDirectory.from_config(config)
    return script.get_current_head()


async def check_database_version(db: AsyncSession) -> dict:
    """检查数据库版本是否与代码匹配

    Returns:
        dict: {
            "db_version": str | None,
            "code_version": str,
            "is_match": bool,
            "is_initialized": bool,
        }
    """
    db_version = await get_database_version(db)
    code_version = get_latest_migration_version()

    is_initialized = db_version is not None
    is_match = db_version == code_version if is_initialized else False

    return {
        "db_version": db_version,
        "code_version": code_version,
        "is_match": is_match,
        "is_initialized": is_initialized,
    }


async def verify_versions_on_startup(db: AsyncSession, strict: bool = False):
    """启动时验证版本一致性

    Args:
        db: 数据库会话
        strict: 是否严格模式（不匹配时抛出异常）
    """
    print(f"🔍 检查版本一致性...")
    print(f"   应用版本: {__version__}")

    try:
        version_info = await check_database_version(db)

        if not version_info["is_initialized"]:
            print(f"⚠️  数据库未初始化")
            print(f"   请先运行数据库迁移: docker compose run init-db")
            if strict:
                raise RuntimeError("数据库未初始化")
            return

        print(f"   数据库版本: {version_info['db_version']}")
        print(f"   代码迁移版本: {version_info['code_version']}")

        if not version_info['is_match']:
            msg = (
                f"⚠️  版本不匹配！\n"
                f"   数据库: {version_info['db_version']}\n"
                f"   代码: {version_info['code_version']}\n"
                f"   请运行数据库迁移: docker compose run init-db"
            )
            print(msg)
            if strict:
                raise RuntimeError("数据库版本与代码版本不匹配")
        else:
            print(f"✅ 版本检查通过")

    except Exception as e:
        print(f"❌ 版本检查失败: {e}")
        if strict:
            raise
