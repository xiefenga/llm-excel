# Docker 部署优化总结

## 优化内容

### 1. 移除 DOCKER_USERNAME 环境变量

**背景：**
- 之前需要在 `.env` 文件中配置 `DOCKER_USERNAME`
- 导致部署配置复杂化

**改进：**
- Docker Compose 配置中直接使用固定镜像名 `0x1461a0/selgetabel-*`
- `.env.example` 中移除了 `DOCKER_USERNAME` 配置项
- 简化了生产环境部署配置

**影响的文件：**
- `docker/docker-compose.yml` - 使用固定镜像名
- `docker/docker-compose.build.yml` - 使用固定镜像名
- `docker/.env.example` - 移除 DOCKER_USERNAME
- `docker/build-push.sh` - 更新输出提示
- 相关文档 - 移除 DOCKER_USERNAME 说明

**构建镜像时：**
仍然使用 `build-push.sh` 脚本指定用户名：
```bash
cd docker
./build-push.sh 0x1461a0 1.0.0
```

---

### 2. MinIO 默认数据目录优化

**背景：**
- 之前 MinIO 默认文件放在 `apps/api/app/scripts/data/`
- 与代码耦合，不便于管理

**改进：**
- 创建 `docker/minio_data/` 目录存放默认文件
- 初始化容器挂载该目录：`./minio_data:/minio_data:ro`
- 所有文件自动上传到 MinIO 的 `__SYS__/` 目录
- 支持子目录结构，保持相对路径

**目录结构：**
```
docker/minio_data/
├── default_avatar.png      → 上传到 __SYS__/default_avatar.png
├── admin_avatar.svg        → 上传到 __SYS__/admin_avatar.svg
└── icons/
    └── logo.png            → 上传到 __SYS__/icons/logo.png
```

**脚本改进：**
- `apps/api/app/scripts/init_minio.py`
  - 从 `/minio_data` 读取文件（挂载的目录）
  - 遍历所有文件（支持子目录）
  - 自动识别文件类型设置 content-type
  - 上传到 `__SYS__/` 目录

**使用方法：**
1. 将默认文件放入 `docker/minio_data/`
2. 启动 Docker Compose，init-minio 容器会自动上传

---

### 3. 数据库默认数据初始化

**背景：**
- 之前没有数据库默认数据初始化机制

**改进：**
- 创建 `docker/db_data/` 目录存放 SQL 文件
- 新增 `init-db-data` 容器负责插入默认数据
- 新增 `apps/api/app/scripts/init_db_data.py` 脚本

**目录结构：**
```
docker/db_data/
├── README.md
├── 01_default_roles.sql
├── 02_default_users.sql
└── 03_default_permissions.sql
```

**执行流程：**
```
postgres (healthy)
    ↓
init-db (数据库迁移)
    ↓
init-db-data (插入默认数据)
    ↓
api (应用启动)
```

**脚本特性：**
- 等待数据库就绪
- 按字母顺序执行 SQL 文件
- 单个文件失败不影响其他文件
- 支持幂等性（建议使用 `ON CONFLICT DO NOTHING`）
- 如果 `db_data/` 目录为空，自动跳过

**SQL 示例：**
```sql
-- 01_default_roles.sql
INSERT INTO roles (id, name, description)
VALUES
  (1, 'admin', '系统管理员'),
  (2, 'user', '普通用户')
ON CONFLICT (id) DO NOTHING;
```

---

## 容器依赖关系

### 完整依赖图

```
postgres (健康检查) ────┬──→ init-db (数据库迁移)
                       │         ↓
                       │    init-db-data (默认数据)
minio (启动) ──────────┤
                       │    init-minio (存储初始化)
                       └──────────┬───────────────┘
                                  ↓
                           api (应用服务)
                                  ↓
                           web → nginx
```

### 容器说明

| 容器 | 类型 | 职责 | 挂载 |
|------|------|------|------|
| `init-db` | 临时 | 数据库迁移 | - |
| `init-db-data` | 临时 | 插入默认数据 | `./db_data:/db_data:ro` |
| `init-minio` | 临时 | MinIO 初始化 + 上传默认文件 | `./minio_data:/minio_data:ro` |
| `api` | 长期 | 应用服务 | - |
| `postgres` | 长期 | 数据库 | `postgres_data` volume |
| `minio` | 长期 | 对象存储 | `minio_data` volume |

---

## 文件变更清单

### 新增文件

```
apps/api/app/scripts/init_db_data.py         # 数据库默认数据初始化脚本
docker/db_data/README.md                     # 数据库默认数据说明
docker/db_data/.gitkeep                      # 保留目录
docker/minio_data/README.md                  # MinIO 默认数据说明
docker/minio_data/.gitkeep                   # 保留目录
OPTIMIZATION_SUMMARY.md                      # 本文档
```

### 修改文件

```
docker/docker-compose.yml                    # 添加 init-db-data，去除 DOCKER_USERNAME
docker/docker-compose.build.yml              # 添加 init-db-data，去除 DOCKER_USERNAME
docker/.env.example                          # 移除 DOCKER_USERNAME
apps/api/app/scripts/init_minio.py          # 从 /minio_data 读取文件
docker/build-push.sh                        # 更新输出提示
DEPLOYMENT_FINAL.md                         # 更新容器说明和流程
docker/README.md                            # 更新配置说明
QUICKSTART.md                               # 移除 DOCKER_USERNAME
VERSION.md                                  # 更新 CI/CD 示例
```

### 删除文件

```
DOCKER_HUB_CONFIG.md                        # 不再需要（已固定用户名）
```

---

## 使用指南

### 首次部署

```bash
cd docker

# 1. 配置环境变量（不需要 DOCKER_USERNAME）
cp .env.example .env
nano .env

# 2. （可选）添加默认数据
# - 将 SQL 文件放入 db_data/
# - 将文件放入 minio_data/

# 3. 启动
docker compose up -d

# 4. 查看初始化日志
docker compose logs init-db
docker compose logs init-db-data
docker compose logs init-minio
```

### 版本升级

```bash
cd docker

# 完整升级流程（自动备份、迁移、验证）
./scripts/upgrade.sh 1.0.1

# 如果新版本包含默认数据，手动初始化
./scripts/init-data.sh --all
```

### 添加默认数据

**数据库默认数据：**
```bash
# 在 docker/db_data/ 下创建 SQL 文件
cat > docker/db_data/01_default_roles.sql <<EOF
INSERT INTO roles (id, name)
VALUES (1, 'admin'), (2, 'user')
ON CONFLICT (id) DO NOTHING;
EOF

# 使用脚本初始化（推荐）
cd docker
./scripts/init-data.sh --db

# 或手动运行容器
docker compose run --rm init-db-data
```

**MinIO 默认文件：**
```bash
# 复制文件到 docker/minio_data/
cp /path/to/file.png docker/minio_data/

# 使用脚本初始化（推荐）
cd docker
./scripts/init-data.sh --minio

# 或手动运行容器
docker compose run --rm init-minio
```

**初始化所有默认数据：**
```bash
cd docker
./scripts/init-data.sh --all
```

### 构建和推送镜像

```bash
cd docker

# 1. 登录 Docker Hub
docker login

# 2. 构建并推送（使用 package.json 版本）
./build-push.sh 0x1461a0

# 3. 或指定版本
./build-push.sh 0x1461a0 1.0.0
```

---

## 优势总结

### 部署配置简化
- ✅ 去除 DOCKER_USERNAME 环境变量
- ✅ 配置项更少，更易理解
- ✅ 生产环境部署更简单

### 默认数据管理优化
- ✅ 数据与代码分离（`docker/minio_data` 和 `docker/db_data`）
- ✅ 易于维护和更新
- ✅ 支持灵活的目录结构
- ✅ 初始化脚本幂等性好

### 容器职责清晰
- ✅ init-db：数据库迁移
- ✅ init-db-data：默认数据插入
- ✅ init-minio：存储初始化 + 文件上传
- ✅ api：纯粹的应用服务

### 扩展性强
- ✅ 添加新的默认文件只需放入对应目录
- ✅ SQL 文件按序号命名自动排序执行
- ✅ 支持任意文件类型和目录结构

---

## 注意事项

1. **幂等性**
   - SQL 文件应使用 `ON CONFLICT DO NOTHING` 确保幂等性
   - MinIO 上传会覆盖同名文件

2. **文件权限**
   - 挂载目录使用只读模式 (`:ro`)
   - 确保文件可被 Docker 读取

3. **初始化顺序**
   - init-db → init-db-data → init-minio → api
   - 数据库迁移必须先于默认数据插入

4. **重新初始化**
   - 使用 `--force-recreate` 强制重新运行初始化容器
   - 确保 SQL 文件和数据文件的幂等性

5. **镜像名固定**
   - 镜像名固定为 `0x1461a0/selgetabel-*`
   - 如需使用其他用户名，需修改 docker-compose.yml
