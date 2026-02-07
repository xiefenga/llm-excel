# Docker 目录重构总结

## 📋 变更概述

参考 Dify 等项目的最佳实践，将所有 Docker 相关配置集中到 `docker/` 目录。

## 📁 新目录结构

```
llm-excel/
├── docker/                          # 🆕 Docker 配置中心
│   ├── .env.example                 # 开发/测试环境变量模板
│   ├── .env.production.example      # 生产环境变量模板
│   ├── docker-compose.yml           # 完整部署（本地构建）
│   ├── docker-compose.dev.yml       # 开发环境（仅依赖服务）
│   ├── docker-compose.prod.yml      # 生产部署（远程镜像）
│   ├── build-push.sh                # 镜像构建推送脚本
│   ├── nginx/
│   │   └── nginx.conf               # Nginx 反向代理配置
│   └── README.md                    # Docker 部署完整指南
├── apps/
│   ├── api/                         # Python FastAPI 后端
│   └── web/                         # React Router v7 前端
├── .env.local.example               # 🆕 本地开发环境变量模板
├── ENV.md                           # 🆕 环境变量配置说明
├── QUICKSTART.md                    # 快速部署指南
├── README.md                        # 项目总览
└── CLAUDE.md                        # Claude Code 项目说明
```

## 🔄 文件迁移

### 已移动的文件

| 原路径 | 新路径 | 说明 |
|--------|--------|------|
| `docker-compose.yml` | `docker/docker-compose.yml` | 完整部署配置 |
| `docker-compose.dev.yml` | `docker/docker-compose.dev.yml` | 开发环境配置 |
| `docker-compose.prod.yml` | `docker/docker-compose.prod.yml` | 生产环境配置 |
| `.env.example` | `docker/.env.example` | 环境变量模板 |
| `.env.production.example` | `docker/.env.production.example` | 生产环境模板 |
| `deploy/nginx.conf` | `docker/nginx/nginx.conf` | Nginx 配置 |
| `scripts/build-and-push.sh` | `docker/build-push.sh` | 构建脚本 |

### 已删除的目录

- `deploy/` - 内容已整合到 `docker/`
- `scripts/` - 构建脚本已移至 `docker/`

### 新增的文件

- `docker/README.md` - Docker 部署完整指南
- `.env.local.example` - 本地开发环境变量模板（用于 pnpm dev）
- `ENV.md` - 环境变量配置说明

## 📝 配置文件更新

### docker-compose 文件路径调整

```yaml
# 构建上下文：. → ..
services:
  api:
    build:
      context: ..              # 从 docker/ 目录向上一级
      dockerfile: apps/api/Dockerfile

# Nginx 配置路径：./deploy/nginx.conf → ./nginx/nginx.conf
  nginx:
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

### package.json 脚本更新

```json
{
  "scripts": {
    "dev:docker": "docker compose -f docker/docker-compose.dev.yml up -d",
    "docker:build": "docker compose -f docker/docker-compose.yml build",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down",
    "docker:logs": "docker compose -f docker/docker-compose.yml logs -f",
    "docker:prod": "docker compose -f docker/docker-compose.prod.yml up -d",
    "docker:prod:down": "docker compose -f docker/docker-compose.prod.yml down"
  }
}
```

### 构建脚本更新

`docker/build-push.sh` 现在从 `docker/` 目录运行：

```bash
# 使用方法
cd docker
./build-push.sh 0x1461a0 1.0.0
```

## 🚀 使用方式

### 本地开发（仅启动依赖服务）

```bash
# 方式 1：使用 pnpm 脚本
pnpm dev:docker

# 方式 2：手动启动
cd docker
docker compose -f docker-compose.dev.yml up -d
```

然后运行前端和后端：
```bash
pnpm dev
```

### 完整部署（本地构建）

```bash
# 方式 1：使用 pnpm 脚本
pnpm docker:up

# 方式 2：手动启动
cd docker
cp .env.example .env
nano .env  # 配置环境变量
docker compose up --build -d
```

### 生产部署（使用远程镜像）

```bash
# 1. 构建并推送镜像（开发机器）
cd docker
./build-push.sh 0x1461a0 1.0.0

# 2. 部署到生产服务器
cd docker
cp .env.production.example .env
nano .env  # 配置环境变量
docker compose -f docker-compose.prod.yml up -d
```

## 📚 文档更新

所有文档已更新以反映新的目录结构：

- ✅ `README.md` - 更新部署说明
- ✅ `QUICKSTART.md` - 更新快速部署流程
- ✅ `CLAUDE.md` - 更新 Docker 部署说明
- ✅ `docker/README.md` - 新增完整的 Docker 指南
- ✅ `ENV.md` - 新增环境变量配置说明
- ✅ `package.json` - 更新所有 Docker 相关脚本

## ✅ 优势

1. **更清晰的组织结构**
   - 所有 Docker 相关文件集中管理
   - 易于查找和维护

2. **环境分离**
   - 开发环境：`docker/.env.example`
   - 生产环境：`docker/.env.production.example`
   - 本地开发：`.env.local.example`（用于 pnpm dev）

3. **简化部署**
   - 生产环境只需复制 `docker/` 目录
   - 所有配置在一个位置

4. **符合最佳实践**
   - 参考 Dify 等成熟项目的组织方式
   - 更专业的项目结构

## 🔄 迁移指南

### 对于已有部署

如果你之前已经部署过，需要更新：

```bash
# 1. 停止旧服务
docker compose down

# 2. 拉取最新代码
git pull

# 3. 迁移环境变量
mv .env docker/.env

# 4. 启动新服务
cd docker
docker compose up -d
```

### 对于本地开发

```bash
# 1. 停止旧的开发环境
docker compose -f docker-compose.dev.yml down

# 2. 启动新的开发环境
cd docker
docker compose -f docker-compose.dev.yml up -d

# 或使用 pnpm 脚本
pnpm dev:docker
```

## 📞 获取帮助

- Docker 部署问题：查看 `docker/README.md`
- 环境变量配置：查看 `ENV.md`
- 快速开始：查看 `QUICKSTART.md`
- 项目概览：查看 `README.md`
