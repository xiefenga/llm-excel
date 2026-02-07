# 数据库和存储初始化方案

本文档说明 Selgetabel 项目的数据库和存储初始化策略，确保容器首次启动时自动完成所有必要的初始化工作。

## 问题描述

使用 Docker 部署时面临的初始化问题：

1. **PostgreSQL** - 容器启动后数据库为空，缺少表结构
2. **MinIO** - 需要创建存储桶和上传默认文件（如默认头像）
3. **权限系统** - 需要初始化权限、角色和关联关系

## 解决方案设计

### 方案概览

```
容器启动流程：
1. PostgreSQL 容器启动
2. MinIO 容器启动
3. API 容器启动
   ├─ 等待数据库就绪
   ├─ 执行 Alembic 迁移（创建表）
   ├─ 启动 FastAPI 应用
   └─ 自动初始化权限系统（应用 lifespan）
4. 初始化 MinIO（可选的后台任务）
```

### 技术实现

#### 1. 数据库迁移（Alembic）

**文件位置：** `docker/init/init-db.sh`

```bash
#!/bin/bash
set -e

# 等待 PostgreSQL 就绪
until PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  sleep 2
done

# 执行数据库迁移
cd /app
alembic upgrade head
```

**特点：**
- ✅ 自动等待数据库就绪（健康检查）
- ✅ 使用 Alembic 管理数据库版本
- ✅ 幂等性：重复执行不会出错
- ✅ 支持增量迁移

#### 2. 容器入口点

**文件位置：** `docker/init/docker-entrypoint.sh`

```bash
#!/bin/bash
set -e

# 1. 执行数据库初始化
bash /docker-entrypoint-initdb.d/init-db.sh

# 2. 启动应用
exec /app/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**集成到 Dockerfile：**
```dockerfile
# 拷贝初始化脚本
COPY docker/init/init-db.sh /docker-entrypoint-initdb.d/
COPY docker/init/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /docker-entrypoint-initdb.d/init-db.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# 使用自定义入口点
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
```

#### 3. 权限系统自动初始化

**已有实现：** `apps/api/app/main.py`

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动时自动初始化权限系统"""
    async for db in get_db():
        try:
            await init_permissions(db)  # 创建权限、角色、关联
        except Exception as e:
            print(f"❌ 权限系统初始化失败: {e}")
        break
    yield
```

**初始化内容：**
- ✅ 57 个权限记录
- ✅ 4 个系统角色（admin, user, guest, operator）
- ✅ 角色-权限关联关系
- ✅ 幂等性：已存在的记录不会重复创建

#### 4. MinIO 初始化（可选）

**文件位置：** `docker/init/init-minio.py`

```python
def main():
    client = Minio(endpoint, access_key, secret_key, secure=False)

    # 1. 等待 MinIO 就绪
    wait_for_minio(client)

    # 2. 创建存储桶
    ensure_bucket(client, bucket_name)

    # 3. 上传默认文件
    upload_default_files(client, bucket_name, data_dir)
```

**集成方式：**

**方式 A - Docker Compose 初始化容器（推荐）**

```yaml
services:
  minio-init:
    image: 0x1461a0/selgetabel-api:latest
    depends_on:
      - minio
    environment:
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - MINIO_BUCKET=${MINIO_BUCKET}
    command: python /app/docker/init/init-minio.py
    restart: "no"
```

**方式 B - 应用启动时初始化（已集成）**

MinIO 服务会在首次使用时自动创建存储桶：

```python
# apps/api/app/services/oss.py
def ensure_bucket_exists(client: Minio, bucket_name: str) -> None:
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)
```

## 优雅性分析

### ✅ 优点

1. **自动化**
   - 容器启动即完成所有初始化
   - 无需手动执行脚本

2. **幂等性**
   - 重复启动不会重复创建
   - 支持容器重启和更新

3. **健康检查**
   - 自动等待依赖服务就绪
   - 避免竞态条件

4. **版本管理**
   - Alembic 管理数据库版本
   - 支持增量迁移和回滚

5. **开发生产一致**
   - 相同的初始化流程
   - 环境变量控制差异

### ⚠️ 注意事项

1. **首次启动时间**
   - 数据库迁移可能需要几秒钟
   - API 容器会等待数据库就绪后才启动

2. **日志可见性**
   - 初始化日志会输出到容器日志
   - 使用 `docker compose logs -f api` 查看

3. **失败处理**
   - 初始化失败会导致容器退出
   - Docker 会根据 `restart` 策略重试

## 目录结构

```
docker/
├── init/
│   ├── docker-entrypoint.sh      # API 容器入口点
│   ├── init-db.sh                # 数据库初始化脚本
│   ├── init-minio.py             # MinIO 初始化脚本（可选）
│   └── data/
│       ├── default_avatar.png     # 默认头像图片
│       └── create_default_avatar.py  # 生成默认头像的脚本
├── docker-compose.yml            # 开发/生产配置
└── README.md                     # 部署文档
```

## 使用方式

### 首次部署

```bash
cd docker

# 1. 配置环境变量
cp .env.example .env
nano .env

# 2. 启动所有服务（自动初始化）
docker compose up -d

# 3. 查看初始化日志
docker compose logs -f api

# 4. 验证初始化
docker compose exec api /app/.venv/bin/python -c "
from app.core.database import get_db
from app.models import User, Role, Permission
import asyncio

async def check():
    async for db in get_db():
        roles = await db.execute('SELECT COUNT(*) FROM roles')
        perms = await db.execute('SELECT COUNT(*) FROM permissions')
        print(f'✅ 角色数量: {roles.scalar()}')
        print(f'✅ 权限数量: {perms.scalar()}')
        break

asyncio.run(check())
"
```

### 更新部署

```bash
cd docker

# 1. 拉取新镜像
docker compose pull

# 2. 重启服务（自动执行新的迁移）
docker compose up -d

# 数据库迁移会自动执行，无需手动干预
```

### 重置数据库

```bash
cd docker

# 1. 停止服务并删除数据
docker compose down -v

# 2. 重新启动（完全重新初始化）
docker compose up -d
```

## 数据库迁移管理

### 创建新的迁移

```bash
cd apps/api

# 自动检测模型变更并生成迁移
alembic revision --autogenerate -m "描述变更内容"

# 手动编辑生成的迁移文件
nano alembic/versions/xxxxx_描述变更内容.py

# 应用迁移
alembic upgrade head
```

### 回滚迁移

```bash
cd apps/api

# 回滚到上一个版本
alembic downgrade -1

# 回滚到特定版本
alembic downgrade <revision_id>

# 查看迁移历史
alembic history
alembic current
```

## 环境变量配置

### 数据库相关

```bash
# PostgreSQL 配置
POSTGRES_USER=llmexcel
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=llmexcel

# API 数据库连接（自动生成）
DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

### MinIO 相关

```bash
# MinIO 服务认证
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_secure_password

# API 访问 MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_secure_password
MINIO_BUCKET=llm-excel
MINIO_PUBLIC_BASE=storage
```

## 故障排查

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否就绪
docker compose exec postgres pg_isready -U llmexcel

# 查看 PostgreSQL 日志
docker compose logs postgres

# 手动测试连接
docker compose exec api /app/.venv/bin/python -c "
import asyncpg
import asyncio

async def test():
    conn = await asyncpg.connect('postgresql://llmexcel:password@postgres:5432/llmexcel')
    print('✅ 数据库连接成功')
    await conn.close()

asyncio.run(test())
"
```

### 迁移执行失败

```bash
# 查看当前迁移状态
docker compose exec api /app/.venv/bin/alembic current

# 查看待执行的迁移
docker compose exec api /app/.venv/bin/alembic heads

# 手动执行迁移
docker compose exec api /app/.venv/bin/alembic upgrade head

# 查看详细错误
docker compose logs api | grep -A 10 "alembic"
```

### MinIO 初始化失败

```bash
# 检查 MinIO 是否就绪
docker compose exec minio mc ready local

# 手动创建存储桶
docker compose exec minio mc mb local/llm-excel

# 查看存储桶列表
docker compose exec minio mc ls local/
```

## 参考资源

- [Alembic 官方文档](https://alembic.sqlalchemy.org/)
- [PostgreSQL Docker 镜像](https://hub.docker.com/_/postgres)
- [MinIO 官方文档](https://min.io/docs/)
- [Docker Compose 健康检查](https://docs.docker.com/compose/compose-file/compose-file-v3/#healthcheck)
