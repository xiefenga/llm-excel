# Docker 部署配置

本目录包含所有 Docker 相关的配置文件。

## 📁 目录结构

```
docker/
├── .env.example              # 生产环境变量模板
├── docker-compose.yml        # 生产部署配置（使用预构建镜像）
├── docker-compose.build.yml  # 本地构建配置（测试用）
├── docker-compose.dev.yml    # 开发环境（仅数据库和对象存储）
├── build-push.sh             # 镜像构建和推送脚本
├── nginx/
│   └── nginx.conf            # Nginx 反向代理配置
└── README.md                 # 本文件
```

## 🚀 快速开始

### 开发环境（仅启动依赖服务）

适用于本地开发，只启动 PostgreSQL 和 MinIO：

```bash
cd docker
cp .env.example .env
nano .env  # 填写配置

docker compose -f docker-compose.dev.yml up -d
```

然后在项目根目录运行：
```bash
pnpm dev  # 启动前端和后端开发服务器
```

### 完整部署（本地构建测试）

适用于测试完整的生产环境配置：

```bash
cd docker
cp .env.example .env
nano .env  # 填写配置

docker compose -f docker-compose.build.yml up --build -d
```

访问：`http://localhost:8080`

### 生产部署（使用预构建镜像）

#### 步骤 1：构建并推送镜像

在开发机器上：

```bash
cd docker
chmod +x build-push.sh

# 登录 Docker Hub
docker login

# 构建并推送
./build-push.sh 0x1461a0 1.0.0
```

#### 步骤 2：在生产服务器部署

```bash
# 下载 docker 目录到服务器
# 或只需要这些文件：
# - docker-compose.yml
# - nginx/nginx.conf
# - .env.example

cd docker
cp .env.example .env
nano .env  # 填写配置

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

## 📝 环境变量配置

### 必需配置

以下环境变量必须配置：

```bash
# OpenAI API
OPENAI_API_KEY=sk-xxxxx

# 数据库
POSTGRES_PASSWORD=strong_password

# MinIO 对象存储
MINIO_ROOT_PASSWORD=strong_password
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=strong_password

# JWT 认证（使用 openssl rand -hex 32 生成）
JWT_SECRET_KEY=random_secret_key_here
```

### 生产环境额外配置

```bash
# 镜像版本配置
IMAGE_VERSION=1.0.0

# Web 端口（可选，默认 8080）
WEB_PORT=8080
```

完整配置请参考 `.env.example`

## 🔧 常用命令

### 开发环境

```bash
cd docker

# 启动
docker compose -f docker-compose.dev.yml up -d

# 停止
docker compose -f docker-compose.dev.yml down

# 查看日志
docker compose -f docker-compose.dev.yml logs -f

# 清理数据（谨慎！）
docker compose -f docker-compose.dev.yml down -v
```

### 本地构建测试

```bash
cd docker

# 构建并启动
docker compose -f docker-compose.build.yml up --build -d

# 停止
docker compose -f docker-compose.build.yml down

# 查看日志
docker compose -f docker-compose.build.yml logs -f

# 重启单个服务
docker compose -f docker-compose.build.yml restart api

# 查看服务状态
docker compose -f docker-compose.build.yml ps
```

### 生产部署

```bash
cd docker

# 拉取最新镜像
docker compose pull

# 启动
docker compose up -d

# 停止
docker compose down

# 查看日志
docker compose logs -f api
docker compose logs -f web
```

## 🗂️ 数据管理

### 备份数据库

```bash
cd docker

# 备份
docker compose exec postgres pg_dump -U llmexcel llmexcel > backup-$(date +%Y%m%d).sql

# 恢复
docker compose exec -T postgres psql -U llmexcel llmexcel < backup-20260207.sql
```

### 备份 MinIO 文件

```bash
cd docker

# 使用 Docker volume 备份
docker run --rm \
  -v docker_minio_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/minio-$(date +%Y%m%d).tar.gz /data
```

### 清理旧数据

```bash
cd docker

# 清理未使用的镜像
docker image prune -a

# 清理未使用的卷（谨慎！）
docker volume prune
```

## 🌐 服务端口

### 开发环境（docker-compose.dev.yml）

- PostgreSQL: `5432`
- MinIO API: `9000`
- MinIO Console: `9001`

### 本地构建测试（docker-compose.build.yml）

- Web (通过 Nginx): `8080`
- API (直接): `8000` (开发时暴露)
- PostgreSQL: `5432`
- MinIO API: `9000`
- MinIO Console: `9001`

### 生产部署（docker-compose.yml）

- Web (通过 Nginx): `8080` (可通过 `WEB_PORT` 环境变量修改)
- 其他端口默认不暴露（更安全）

## 📦 镜像构建

### 使用构建脚本（推荐）

```bash
cd docker
./build-push.sh 0x1461a0 1.0.0
```

### 手动构建

```bash
cd ..  # 回到项目根目录

# 构建 API 镜像
docker build -f apps/api/Dockerfile -t 0x1461a0/selgetabel-api:1.0.0 .

# 构建 Web 镜像
docker build -f apps/web/Dockerfile -t 0x1461a0/selgetabel-web:1.0.0 .

# 推送到 Docker Hub
docker push 0x1461a0/selgetabel-api:1.0.0
docker push 0x1461a0/selgetabel-web:1.0.0
```

## 🔍 故障排查

### 服务无法启动

```bash
cd docker

# 查看详细日志
docker compose logs

# 查看特定服务日志
docker compose logs api
docker compose logs postgres
```

### 端口冲突

修改 `.env` 文件中的端口配置：

```bash
WEB_PORT=8090  # 默认 8080
```

或修改 `docker-compose.yml` 中的端口映射。

### 数据库连接失败

```bash
# 进入数据库容器
docker compose exec postgres psql -U llmexcel -d llmexcel

# 检查连接字符串
# DATABASE_URL=postgresql+asyncpg://llmexcel:password@postgres:5432/llmexcel
```

### MinIO 连接失败

确保环境变量配置正确：
- `MINIO_ENDPOINT=minio:9000` (容器内部访问)
- `MINIO_ACCESS_KEY` 应与 `MINIO_ROOT_USER` 一致
- `MINIO_SECRET_KEY` 应与 `MINIO_ROOT_PASSWORD` 一致

### 清理并重新开始

```bash
cd docker

# 停止所有服务
docker compose down

# 删除所有数据（谨慎！）
docker compose down -v

# 清理 Docker 系统
docker system prune -a

# 重新启动
docker compose up --build -d
```

## 🔒 安全建议

### 生产环境

1. **使用强密码**
   - PostgreSQL
   - MinIO
   - JWT Secret Key

2. **限制端口暴露**
   - 只暴露 Nginx (8080)
   - 关闭数据库和 MinIO 的直接访问

3. **配置 HTTPS**
   - 修改 `nginx/nginx.conf`
   - 添加 SSL 证书

4. **环境隔离**
   - 使用独立的 `.env` 文件
   - 不要提交 `.env` 到版本控制

5. **定期更新**
   - 定期更新基础镜像
   - 定期备份数据

## 📚 相关文档

- [项目根目录 README](../README.md) - 项目概览
- [QUICKSTART](../QUICKSTART.md) - 快速部署指南
- [后端 API 文档](../apps/api/README.md) - API 详细说明
