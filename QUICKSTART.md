# 快速部署指南

本文档提供最快速的部署流程。

## 方式一：使用预构建镜像（推荐用于生产环境）

### 步骤 1：构建并推送镜像（在本地开发机器上）

```bash
cd docker

# 1. 登录 Docker Hub
docker login

# 2. 构建并推送镜像（替换 0x1461a0 为你的 Docker Hub 用户名）
./build-push.sh 0x1461a0 1.0.0

# 或推送为 latest 标签
./build-push.sh 0x1461a0 latest
```

### 步骤 2：在生产服务器上部署

```bash
# 1. 下载部署文件（或克隆仓库）
# 最少需要这些文件：
# - docker/docker-compose.yml
# - docker/nginx/nginx.conf
# - docker/.env.example

cd docker

# 2. 配置环境变量
cp .env.example .env
nano .env

# 必须修改的配置：
# - IMAGE_VERSION=1.0.0                 # 镜像版本
# - OPENAI_API_KEY=xxx                  # OpenAI API 密钥
# - POSTGRES_PASSWORD=strong_password   # 数据库密码
# - MINIO_ROOT_PASSWORD=strong_password # MinIO 密码
# - JWT_SECRET_KEY=xxx                  # 使用 openssl rand -hex 32 生成

# 3. 启动服务
docker compose up -d

# 4. 查看状态
docker compose ps

# 5. 查看日志
docker compose logs -f
```

### 步骤 3：访问服务

打开浏览器访问 `http://your-server-ip:8080`

## 方式二：本地构建部署（适合开发和测试）

### 使用 Docker Compose

```bash
cd docker

# 1. 配置环境变量
cp .env.example .env
nano .env

# 必须修改的配置：
# - OPENAI_API_KEY=xxx
# - POSTGRES_PASSWORD=xxx
# - MINIO_ROOT_PASSWORD=xxx
# - JWT_SECRET_KEY=xxx  # 使用 openssl rand -hex 32 生成

# 2. 构建并启动
docker compose -f docker-compose.build.yml up --build -d

# 3. 查看日志
docker compose -f docker-compose.build.yml logs -f

# 4. 访问服务
# http://localhost:8080
```

### 使用 pnpm 脚本（推荐）

```bash
# 1. 配置环境变量（同上）
cd docker
cp .env.example .env
nano .env

# 2. 构建镜像
pnpm docker:build

# 3. 启动服务
pnpm docker:up

# 4. 查看日志
pnpm docker:logs

# 5. 停止服务
pnpm docker:down
```

## 更新部署

### 使用预构建镜像（生产环境）

```bash
cd docker

# 1. 本地构建新版本
./build-push.sh 0x1461a0 1.0.1

# 2. 在服务器上更新
docker compose pull
docker compose up -d
```

### 本地构建（开发/测试）

```bash
cd docker
git pull
docker compose -f docker-compose.build.yml up --build -d
```

## 常用命令

### 使用 pnpm 脚本

```bash
# 开发环境（仅 Postgres + MinIO）
pnpm dev:docker

# 本地构建测试
pnpm docker:build        # 构建镜像
pnpm docker:up           # 启动服务
pnpm docker:logs         # 查看日志
pnpm docker:down         # 停止服务

# 生产环境
pnpm docker:prod:pull    # 拉取镜像
pnpm docker:prod         # 启动服务
pnpm docker:prod:logs    # 查看日志
pnpm docker:prod:down    # 停止服务

# 数据管理
pnpm docker:init-data    # 初始化默认数据
pnpm docker:backup       # 备份数据库
pnpm docker:upgrade 1.0.1  # 升级版本
```

### 使用 Docker Compose

```bash
cd docker

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启单个服务
docker compose restart api

# 停止所有服务
docker compose down

# 停止并删除数据（谨慎！）
docker compose down -v

# 进入容器调试
docker compose exec api bash
docker compose exec postgres psql -U llmexcel

# 备份数据库
docker compose exec postgres pg_dump -U llmexcel llmexcel > backup.sql
```

## 故障排除

### 1. 端口被占用

修改 `docker/.env` 中的 `WEB_PORT`：
```bash
WEB_PORT=8090
```

### 2. 无法连接数据库

检查 PostgreSQL 配置：
```bash
cd docker

# 查看 PostgreSQL 日志
docker compose logs postgres

# 测试连接
docker compose exec postgres psql -U llmexcel -d llmexcel
```

### 3. MinIO 无法访问

```bash
cd docker

# 查看 MinIO 日志
docker compose logs minio

# 确认环境变量配置正确
# MINIO_ACCESS_KEY 应该与 MINIO_ROOT_USER 一致
# MINIO_SECRET_KEY 应该与 MINIO_ROOT_PASSWORD 一致
```

### 4. API 无法启动

```bash
cd docker

# 查看 API 日志
docker compose logs api

# 常见问题：
# - JWT_SECRET_KEY 未设置
# - 数据库连接失败
# - OpenAI API 密钥无效
```

## 生产环境注意事项

1. **使用强密码**
   - PostgreSQL 密码
   - MinIO 密码
   - JWT 密钥（使用随机生成）

2. **配置 HTTPS**
   - 修改 `docker/nginx/nginx.conf` 添加 SSL 配置
   - 使用 Let's Encrypt 获取免费证书

3. **限制端口访问**
   - 生产环境不要暴露 PostgreSQL、MinIO 端口
   - 注释掉 `docker-compose.yml` 中的相关 `ports` 配置

4. **定期备份**
   - 数据库备份
   - MinIO 文件备份

5. **资源监控**
   - 监控容器资源使用
   - 配置日志轮转

详细文档请参考 [docker/README.md](docker/README.md)
