# 数据库和存储初始化方案（最终版）

## 🎯 方案总结

### 核心思路
- **首次部署** - 完全自动化，使用临时初始化容器
- **版本升级** - 脚本化，可控、可观测、可回滚

### 关键特性
- ✅ 容器职责单一（init 容器 vs api 容器）
- ✅ 完全自动化的首次部署体验
- ✅ 可控的版本升级流程
- ✅ 失败时自动回滚
- ✅ 版本一致性检查

---

## 📋 架构设计

### Docker Compose 服务

```
首次部署流程：
1. postgres 启动 → 健康检查通过
2. minio 启动
3. init-db 容器运行 → alembic upgrade head → 退出
4. init-db-data 容器运行 → 插入默认数据 → 退出
5. init-minio 容器运行 → 创建存储桶 + 上传默认文件 → 退出
6. api 容器启动 → 应用运行
7. web、nginx 启动
```

### 容器说明

| 容器 | 类型 | 命令 | 职责 |
|------|------|------|------|
| `init-db` | 临时 | `alembic upgrade head` | 数据库迁移 |
| `init-db-data` | 临时 | `python -m app.scripts.init_db_data` | 数据库默认数据 |
| `init-minio` | 临时 | `python -m app.scripts.init_minio` | MinIO 初始化 + 上传默认文件 |
| `api` | 长期运行 | `uvicorn app.main:app ...` | 应用服务 |
| `postgres` | 长期运行 | - | 数据库 |
| `minio` | 长期运行 | `server /data` | 对象存储 |

---

## 🚀 使用方式

### 1. 首次部署（完全自动化）

```bash
cd docker

# 配置环境变量
cp .env.example .env
nano .env

# 一键启动（自动完成所有初始化）
docker compose up -d

# 查看初始化日志
docker compose logs init-db
docker compose logs init-minio
docker compose logs api
```

**预期输出：**
```
init-db_1      | 🔧 执行数据库迁移...
init-db_1      | INFO  [alembic.runtime.migration] Running upgrade -> 648d4ca39b77
init-db_1      | ✅ 数据库迁移完成
init-db_1      | exited with code 0

init-db-data_1 | 🔧 数据库默认数据初始化脚本启动...
init-db-data_1 | ✅ 数据库已就绪
init-db-data_1 | ℹ️  未找到默认数据文件 (*.sql)
init-db-data_1 | ✅ 数据库默认数据初始化完成
init-db-data_1 | exited with code 0

init-minio_1   | 🔧 MinIO 初始化脚本启动...
init-minio_1   | ✅ MinIO 已就绪
init-minio_1   | ✅ 创建存储桶 'llm-excel' 成功
init-minio_1   | ✅ 上传文件: __SYS__/default_avatar.png
init-minio_1   | ✅ 上传文件: __SYS__/admin_avatar.svg
init-minio_1   | ✅ 共上传 2 个默认文件到 __SYS__ 目录
init-minio_1   | ✅ MinIO 初始化完成
init-minio_1   | exited with code 0

api_1          | 🚀 Selgetabel API v0.1.0 启动中...
api_1          | 🔍 检查版本一致性...
api_1          | ✅ 版本检查通过
api_1          | ✅ 应用初始化完成
```

### 2. 版本升级（脚本化）

```bash
cd docker

# 方式 A：一键升级（推荐）
./scripts/upgrade.sh 0.2.0

# 方式 B：手动分步
./scripts/backup.sh                  # 备份
docker compose pull                  # 拉取镜像
./scripts/migrate.sh 0.2.0           # 迁移
./scripts/verify.sh                  # 验证
nano .env                            # 更新版本
docker compose up -d api web         # 重启
```

### 3. 重新初始化（如果 init 容器失败）

```bash
cd docker

# 单独运行 init-db
docker compose up init-db

# 单独运行 init-db-data
docker compose up init-db-data

# 单独运行 init-minio
docker compose up init-minio

# 或者强制重新创建
docker compose up init-db --force-recreate
docker compose up init-db-data --force-recreate
docker compose up init-minio --force-recreate
```

---

## 📊 依赖关系

### Docker Compose 配置

```yaml
services:
  init-db:
    command: ["alembic", "upgrade", "head"]
    restart: "no"  # 只运行一次
    depends_on:
      postgres:
        condition: service_healthy  # 等待数据库健康

  init-db-data:
    command: ["python", "-m", "app.scripts.init_db_data"]
    restart: "no"
    volumes:
      - ./db_data:/db_data:ro
    depends_on:
      init-db:
        condition: service_completed_successfully

  init-minio:
    command: ["python", "-m", "app.scripts.init_minio"]
    restart: "no"
    volumes:
      - ./minio_data:/minio_data:ro
    depends_on:
      - minio  # 等待 MinIO 启动

  api:
    command: ["uvicorn", "app.main:app", ...]
    depends_on:
      init-db:
        condition: service_completed_successfully  # 等待数据库迁移
      init-db-data:
        condition: service_completed_successfully  # 等待默认数据
      init-minio:
        condition: service_completed_successfully  # 等待存储初始化
```

### 健康检查

```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U llmexcel"]
    interval: 5s
    timeout: 5s
    retries: 5

api:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s
```

---

## 🔄 完整流程

### 首次部署

```
用户操作：
1. cp .env.example .env
2. nano .env（配置）
3. docker compose up -d

系统行为：
1. ✅ postgres 启动并健康检查
2. ✅ minio 启动
3. ✅ init-db 执行数据库迁移并退出
4. ✅ init-db-data 插入默认数据并退出
5. ✅ init-minio 创建桶、上传默认文件并退出
6. ✅ api 启动并检查版本
7. ✅ web、nginx 启动
```

### 版本升级

```
用户操作：
./scripts/upgrade.sh 0.2.0

系统行为：
1. ✅ 备份数据库 → backups/backup_20250207.sql.gz
2. ✅ 拉取新镜像 → 0x1461a0/selgetabel-api:0.2.0
3. ✅ 运行 init-db 容器（新版本）
4. ✅ 验证迁移结果
5. ✅ 更新 .env: IMAGE_VERSION=0.2.0
6. ✅ 重启 api 容器（新版本）
7. ✅ 健康检查通过
8. ❌ 失败时自动回滚
```

---

## 🎯 关键设计点

### 1. 容器纯粹性

**API 容器只运行应用：**
```dockerfile
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**初始化在临时容器中：**
```yaml
init-db:
  command: ["alembic", "upgrade", "head"]
  restart: "no"
```

### 2. 幂等性保证

**Alembic：**
- 自动跟踪已执行的迁移
- 重复执行 `upgrade head` 安全

**MinIO 初始化：**
```python
if client.bucket_exists(bucket_name):
    print("存储桶已存在")
    return True
```

**权限系统：**
```python
# app/main.py lifespan
await init_permissions(db)  # 检查存在性，不重复创建
```

### 3. 失败处理

**init-db 失败：**
- 容器退出，后续初始化不会执行
- 查看日志：`docker compose logs init-db`
- 重新运行：`docker compose up init-db --force-recreate`

**init-db-data 失败：**
- 容器退出，api 不会启动
- 查看日志：`docker compose logs init-db-data`
- 如果无默认数据，会跳过并成功退出

**init-minio 失败：**
- 容器退出，api 不会启动
- 查看日志：`docker compose logs init-minio`
- 如果无默认文件，会跳过并成功退出

**api 启动失败：**
- 版本检查失败时打印警告
- 应用继续启动（非严格模式）
- 用户可以手动修复

**升级失败：**
- upgrade.sh 自动回滚
- 恢复配置文件
- 启动旧版本容器

### 4. 日志清晰

**独立日志：**
```bash
docker compose logs init-db    # 初始化日志
docker compose logs api         # 应用日志
```

**彩色输出：**
```
✅ 成功信息（绿色）
⚠️  警告信息（黄色）
❌ 错误信息（红色）
🔍 检查信息（蓝色）
```

---

## 📁 文件结构

```
apps/api/
├── Dockerfile                      # 纯净容器（只含应用）
└── app/
    ├── __version__.py              # 版本信息（自动生成）
    ├── main.py                     # 启动时版本检查
    ├── core/
    │   └── version_check.py        # 版本检查模块
    └── scripts/
        ├── __init__.py
        ├── __main__.py
        └── init_minio.py           # MinIO 初始化

docker/
├── docker-compose.yml              # 生产环境（预构建镜像）
├── docker-compose.build.yml        # 本地构建（测试用）
├── docker-compose.dev.yml          # 开发环境（仅 Postgres + MinIO）
├── minio_data/                     # MinIO 默认数据（上传到 __SYS__）
│   ├── default_avatar.png
│   ├── admin_avatar.svg
│   └── README.md
├── db_data/                        # 数据库默认数据（SQL 文件）
│   └── README.md
└── scripts/
    ├── upgrade.sh                  # 版本升级
    ├── migrate.sh                  # 数据库迁移
    ├── backup.sh                   # 数据库备份
    ├── verify.sh                   # 版本验证
    ├── rollback.sh                 # 版本回滚
    └── README.md                   # 脚本文档
```

---

## 🛠 故障排查

### 问题 1：init-db 容器失败

```bash
# 查看日志
docker compose logs init-db

# 常见原因：
# - 数据库未就绪 → 等待 postgres 健康检查
# - 迁移文件错误 → 检查 alembic/versions/
# - 权限问题 → 检查数据库用户权限

# 重新运行
docker compose up init-db --force-recreate
```

### 问题 2：init-db-data 容器失败

```bash
# 查看日志
docker compose logs init-db-data

# 常见原因：
# - 数据库连接失败 → 检查 DATABASE_URL
# - SQL 文件格式错误 → 检查 docker/db_data/*.sql
# - 数据冲突 → 使用 ON CONFLICT 确保幂等性

# 重新运行
docker compose up init-db-data --force-recreate
```

### 问题 3：init-minio 容器失败

```bash
# 查看日志
docker compose logs init-minio

# 常见原因：
# - MinIO 未启动 → docker compose ps minio
# - 密钥错误 → 检查 .env 中的 MINIO_ACCESS_KEY
# - 网络问题 → docker compose exec api ping minio
# - 文件不存在 → 检查 docker/minio_data/ 目录

# 重新运行
docker compose up init-minio --force-recreate
```

### 问题 3：api 容器版本不匹配

```bash
# 查看日志
docker compose logs api

# 运行验证脚本
./scripts/verify.sh

# 手动运行迁移
docker compose run --rm init-db

# 或回滚
./scripts/rollback.sh
```

### 问题 4：无法访问应用

```bash
# 检查容器状态
docker compose ps

# 检查健康状态
docker compose exec api curl http://localhost:8000/health

# 查看应用日志
docker compose logs api --tail=50

# 测试端口
curl http://localhost:8000/version
```

---

## 📚 相关文档

- **VERSION_IMPLEMENTATION.md** - 版本管理实现
- **docker/scripts/README.md** - 升级脚本使用指南
- **VERSION.md** - 版本管理规范
- **QUICKSTART.md** - 快速开始

---

## ✅ 优势总结

### 首次部署
- ✅ 一键启动，零配置
- ✅ 自动完成所有初始化
- ✅ 失败时容易重试
- ✅ 日志清晰独立

### 版本升级
- ✅ 完全可控的升级流程
- ✅ 自动备份和回滚
- ✅ 版本一致性验证
- ✅ 清晰的输出和日志

### 容器设计
- ✅ API 容器职责单一
- ✅ init 容器临时运行
- ✅ 易于调试和维护
- ✅ 符合容器最佳实践

---

**设计理念：** 首次部署傻瓜式，版本升级专业化！🚀
