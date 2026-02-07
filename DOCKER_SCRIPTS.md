# Docker 脚本命令参考

本文档说明 `package.json` 中所有 Docker 相关的 npm 脚本命令。

## 📋 命令分类

### 开发环境

| 命令 | 说明 | 对应的 Docker Compose 文件 |
|------|------|---------------------------|
| `pnpm dev:docker` | 启动开发环境（仅 Postgres + MinIO） | `docker-compose.dev.yml` |

**使用场景：**
- 本地开发，前后端在宿主机运行
- 只需要数据库和对象存储服务

**示例：**
```bash
# 1. 启动 Docker 服务
pnpm dev:docker

# 2. 在另一个终端启动前后端
pnpm dev

# 3. 停止 Docker 服务
cd docker
docker compose -f docker-compose.dev.yml down
```

---

### 本地构建测试

| 命令 | 说明 | 对应操作 |
|------|------|---------|
| `pnpm docker:build` | 构建本地镜像 | `docker compose -f docker-compose.build.yml build` |
| `pnpm docker:up` | 启动完整服务 | `docker compose -f docker-compose.build.yml up -d` |
| `pnpm docker:logs` | 查看服务日志 | `docker compose -f docker-compose.build.yml logs -f` |
| `pnpm docker:down` | 停止所有服务 | `docker compose -f docker-compose.build.yml down` |

**使用场景：**
- 测试完整的 Docker 部署流程
- 验证 Dockerfile 和配置
- 本地构建和测试镜像

**示例：**
```bash
# 1. 配置环境变量
cd docker
cp .env.example .env
nano .env

# 2. 构建镜像
pnpm docker:build

# 3. 启动服务
pnpm docker:up

# 4. 查看日志
pnpm docker:logs

# 5. 访问应用
# http://localhost:8080

# 6. 停止服务
pnpm docker:down
```

---

### 生产环境

| 命令 | 说明 | 对应操作 |
|------|------|---------|
| `pnpm docker:prod:pull` | 拉取预构建镜像 | `cd docker && docker compose pull` |
| `pnpm docker:prod` | 启动生产服务 | `cd docker && docker compose up -d` |
| `pnpm docker:prod:logs` | 查看生产日志 | `cd docker && docker compose logs -f` |
| `pnpm docker:prod:down` | 停止生产服务 | `cd docker && docker compose down` |

**使用场景：**
- 生产环境部署
- 使用预构建的 Docker Hub 镜像

**示例：**
```bash
# 1. 配置环境变量
cd docker
cp .env.example .env
nano .env
# 设置 IMAGE_VERSION=1.0.0

# 2. 拉取镜像
pnpm docker:prod:pull

# 3. 启动服务
pnpm docker:prod

# 4. 查看日志
pnpm docker:prod:logs

# 5. 停止服务
pnpm docker:prod:down
```

---

### 数据管理

| 命令 | 说明 | 对应脚本 |
|------|------|---------|
| `pnpm docker:init-data` | 初始化默认数据 | `cd docker && ./scripts/init-data.sh --all` |
| `pnpm docker:backup` | 备份数据库 | `cd docker && ./scripts/backup.sh` |
| `pnpm docker:upgrade` | 升级版本 | `cd docker && ./scripts/upgrade.sh` |

**使用场景：**
- 添加新的默认数据
- 定期备份数据库
- 版本升级

**示例：**
```bash
# 初始化默认数据
pnpm docker:init-data

# 备份数据库
pnpm docker:backup

# 升级到新版本（需要指定版本号）
pnpm docker:upgrade 1.0.1
```

---

### 镜像发布

| 命令 | 说明 | 对应脚本 |
|------|------|---------|
| `pnpm release` | 构建并推送镜像 | `cd docker && ./build-push.sh` |

**使用场景：**
- 发布新版本到 Docker Hub

**示例：**
```bash
# 1. 更新版本号
pnpm version:patch  # 0.1.0 -> 0.1.1

# 2. 提交代码
git add .
git commit -m "chore: release v0.1.1"
git tag v0.1.1
git push origin main --tags

# 3. 构建并推送镜像（自动读取 package.json 版本）
pnpm release

# 或指定版本
cd docker
./build-push.sh 0x1461a0 0.1.1
```

---

## 📊 命令对比

### 开发 vs 测试 vs 生产

| 特性 | dev:docker | docker:* | docker:prod:* |
|------|-----------|----------|---------------|
| Compose 文件 | dev.yml | build.yml | docker-compose.yml |
| 镜像来源 | 官方镜像 | 本地构建 | Docker Hub |
| 包含服务 | Postgres + MinIO | 全部服务 | 全部服务 |
| 前后端 | 宿主机运行 | 容器运行 | 容器运行 |
| 端口暴露 | 5432, 9000, 9001 | 8080, 8000 (可选) | 8080 |
| 使用场景 | 本地开发 | 本地测试 | 生产部署 |

---

## 🔄 典型工作流

### 1. 本地开发

```bash
# 启动依赖服务
pnpm dev:docker

# 启动前后端
pnpm dev

# 开发完成后停止
cd docker
docker compose -f docker-compose.dev.yml down
```

### 2. 本地测试完整部署

```bash
# 配置环境
cd docker
cp .env.example .env
nano .env

# 构建并启动
pnpm docker:build
pnpm docker:up

# 查看日志
pnpm docker:logs

# 测试完成后停止
pnpm docker:down
```

### 3. 发布新版本

```bash
# 1. 更新版本
pnpm version:patch

# 2. 提交代码
git add .
git commit -m "chore: release v0.1.1"
git tag v0.1.1
git push origin main --tags

# 3. 构建推送镜像
pnpm release

# 4. 在生产服务器部署
cd docker
nano .env  # 更新 IMAGE_VERSION=0.1.1
pnpm docker:prod:pull
pnpm docker:prod
```

### 4. 生产环境升级

```bash
# 使用升级脚本（自动备份、迁移、验证）
pnpm docker:upgrade 1.0.1

# 如果包含新的默认数据
pnpm docker:init-data
```

---

## 💡 提示

### 环境变量优先级

1. 环境变量 > 2. `.env` 文件 > 3. 默认值

### 工作目录

- `dev:docker`: 在项目根目录执行
- `docker:*`: 在项目根目录执行
- `docker:prod:*`: 自动切换到 `docker/` 目录
- `docker:init-data`: 自动切换到 `docker/` 目录
- `docker:backup`: 自动切换到 `docker/` 目录
- `docker:upgrade`: 自动切换到 `docker/` 目录

### 端口说明

- **开发环境 (dev:docker)**:
  - Postgres: 5432
  - MinIO API: 9000
  - MinIO Console: 9001

- **测试环境 (docker:*)**:
  - Web (Nginx): 8080
  - API (可选): 8000
  - Postgres: 5432 (可选)
  - MinIO: 9000, 9001 (可选)

- **生产环境 (docker:prod:*)**:
  - Web (Nginx): 8080 (可通过 WEB_PORT 修改)
  - 其他端口默认不暴露

---

## 📚 相关文档

- [README.md](README.md) - 项目概览
- [QUICKSTART.md](QUICKSTART.md) - 快速开始
- [docker/README.md](docker/README.md) - Docker 详细文档
- [docker/scripts/README.md](docker/scripts/README.md) - 脚本文档
- [DEPLOYMENT_FINAL.md](DEPLOYMENT_FINAL.md) - 部署方案
- [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) - 优化总结
