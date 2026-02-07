#!/usr/bin/env python3
"""数据库默认数据初始化脚本

功能：
1. 等待数据库就绪
2. 检查是否需要初始化默认数据
3. 从 /db_data 目录读取默认数据并插入数据库

使用：
    python -m app.scripts.init_db_data
    或
    python app/scripts/init_db_data.py
"""

import os
import sys
import asyncio
from pathlib import Path

try:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text
except ImportError:
    print("❌ 错误：未安装 sqlalchemy 库")
    print("   请安装：pip install sqlalchemy asyncpg")
    sys.exit(1)


async def wait_for_database(engine, max_retries: int = 30) -> bool:
    """等待数据库就绪"""
    print("⏳ 等待数据库就绪...")
    for i in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            print("✅ 数据库已就绪")
            return True
        except Exception as e:
            if i < max_retries - 1:
                print(f"   数据库还未就绪，等待中... ({i+1}/{max_retries})")
                await asyncio.sleep(2)
            else:
                print(f"❌ 数据库连接超时: {e}")
                return False
    return False


async def check_if_initialized(session: AsyncSession) -> bool:
    """检查是否已经初始化过默认数据

    TODO: 实现检查逻辑，例如查询某个标记表或配置表
    目前返回 False，表示每次都会尝试初始化（幂等性由具体插入逻辑保证）
    """
    # 示例：检查某个标记表
    # result = await session.execute(text("SELECT COUNT(*) FROM system_config WHERE key='default_data_initialized'"))
    # count = result.scalar()
    # return count > 0

    return False


async def load_default_data(session: AsyncSession, data_dir: Path) -> None:
    """从 data_dir 加载并插入默认数据

    TODO: 实现默认数据插入逻辑
    - 读取 SQL 文件或 JSON 文件
    - 插入到对应的表中
    - 确保幂等性（使用 INSERT ... ON CONFLICT DO NOTHING 或先检查）
    """
    print("📁 加载默认数据...")

    if not data_dir.exists():
        print(f"⚠️  默认数据目录不存在: {data_dir}")
        return

    # 示例：查找所有 SQL 文件
    sql_files = list(data_dir.glob("*.sql"))
    if not sql_files:
        print("ℹ️  未找到默认数据文件 (*.sql)")
        return

    for sql_file in sorted(sql_files):
        print(f"📄 执行 SQL 文件: {sql_file.name}")
        try:
            sql_content = sql_file.read_text(encoding="utf-8")
            # 执行 SQL（注意：这里简单处理，生产环境可能需要更复杂的解析）
            for statement in sql_content.split(";"):
                statement = statement.strip()
                if statement:
                    await session.execute(text(statement))
            await session.commit()
            print(f"✅ 执行成功: {sql_file.name}")
        except Exception as e:
            await session.rollback()
            print(f"⚠️  执行 {sql_file.name} 失败: {e}")
            # 不中断，继续执行下一个文件

    print("✅ 默认数据加载完成")


async def main():
    # 从环境变量读取配置
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ 未设置 DATABASE_URL 环境变量")
        sys.exit(1)

    print("🔧 数据库默认数据初始化脚本启动...")
    print(f"   Database: {database_url.split('@')[-1] if '@' in database_url else 'unknown'}")

    # 创建数据库引擎
    engine = create_async_engine(database_url, echo=False)

    # 等待数据库就绪
    if not await wait_for_database(engine):
        sys.exit(1)

    # 创建会话
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # 检查是否已初始化
        if await check_if_initialized(session):
            print("ℹ️  默认数据已初始化，跳过")
        else:
            # 加载默认数据
            data_dir = Path("/db_data")
            await load_default_data(session, data_dir)

    await engine.dispose()
    print("✅ 数据库默认数据初始化完成")


if __name__ == "__main__":
    asyncio.run(main())
