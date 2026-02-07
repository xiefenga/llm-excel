# Selgetabel 数据处理系统

用自然语言描述 Excel 数据处理需求，由后端调用大模型生成可执行的结构化操作，并返回预览、公式与导出的 Excel 文件。

## 项目结构

```
Selgetabel/
├── apps/
│   ├── api/                    # Python FastAPI 后端（SSE）
│   │   ├── app/
│   │   │   ├── main.py          # FastAPI 入口：app.main:app
│   │   │   ├── api/             # 路由（/excel/*）
│   │   │   ├── lib/             # JSON 解析/执行/公式生成等
│   │   │   └── services/        # Excel 读写与文件管理
│   │   └── pyproject.toml       # Python 依赖（uv）
│   └── web/                     # 前端（React Router v7 + Vite）
│       ├── app/                 # UI 与页面
│       └── vite.config.ts       # /api -> 后端代理
├── package.json                 # monorepo 脚本入口
├── pnpm-workspace.yaml          # pnpm workspace
└── turbo.json                   # turborepo 任务编排
```

## 环境要求

- **Node.js**：>= 22（仓库内有 Volta 版本约束）
- **pnpm**：>= 10
- **Python**：>= 3.11
- **uv**：用于安装/运行后端依赖

## 快速开始（本地开发）

### 1) 安装前端依赖

```bash
pnpm install
```

### 2) 安装后端依赖（apps/api）

```bash
pnpm --filter @selgetabel/api install
```

### 3) 配置后端环境变量

在 `apps/api` 下创建 `.env`（或直接在 shell 里导出环境变量），至少需要：

- `OPENAI_API_KEY`

（如果仓库里提供了 `.env.example`，可复制一份改名为 `.env`。）

### 4) 启动开发环境（Web + API 一起起）

```bash
pnpm dev
```

- Web：`http://localhost:5173`
- API：`http://localhost:8000`（Swagger：`http://localhost:8000/docs`）

## Web 与 API 的联调方式

前端代码里默认请求基路径为 `'/api'`，开发时由 `apps/web/vite.config.ts` 代理到后端：

- 默认后端地址：`http://localhost:8000`
- 如需自定义，启动前设置环境变量：`API_BASE_URL=http://your-api-host:8000`

## API 概要

当前核心接口为：

- `POST /excel/upload`：上传一个或多个 Excel 文件，返回 `file_id`（每个文件独立）。
- `POST /excel/chat`：传入 `query` 与 `file_ids`，以 **SSE** 流式返回 load / analysis / generate / execute 等阶段事件。

文件访问：

- API 会把文件写到 `storage/` 下，并在应用里挂载为静态目录：`/storage/*`
- 执行完成后返回的 `output_file` 一般形如 `storage/outputs/result_YYYYmmdd_HHMMSS.xlsx`，可通过 `http://localhost:8000/storage/outputs/...` 访问（也可直接从返回的路径拼出 URL）。

## 常用命令

### 开发命令

```bash
# 启动全部（web + api）
pnpm dev

# 只启动后端
pnpm dev:api

# 启动开发环境 Docker 服务（仅 Postgres + MinIO）
pnpm dev:docker

# 构建
pnpm build

# 类型检查
pnpm check-types

# 格式化代码
pnpm format
```

### Docker 命令

**本地构建测试：**
```bash
# 构建镜像
pnpm docker:build

# 启动服务
pnpm docker:up

# 查看日志
pnpm docker:logs

# 停止服务
pnpm docker:down
```

**生产环境：**
```bash
# 拉取最新镜像
pnpm docker:prod:pull

# 启动生产环境
pnpm docker:prod

# 查看生产日志
pnpm docker:prod:logs

# 停止生产环境
pnpm docker:prod:down
```

**数据管理：**
```bash
# 初始化默认数据
pnpm docker:init-data

# 备份数据库
pnpm docker:backup

# 升级版本（需要参数）
pnpm docker:upgrade 1.0.1
```

**发布镜像：**
```bash
# 构建并推送镜像到 Docker Hub
pnpm release
```

## 部署与运行（Docker Compose）

该项目前端生产环境默认请求基路径为 `'/api'`，因此推荐使用本仓库提供的 **Nginx 反向代理** 统一对外暴露一个入口（同时处理 SSE 不缓冲）。

### 快速部署（本地构建）

### 1) 准备环境变量

```bash
cd docker
cp .env.example .env
nano .env  # 填写必要的配置
```

必须配置的环境变量：
- `OPENAI_API_KEY` - OpenAI API 密钥
- `POSTGRES_PASSWORD` - PostgreSQL 密码
- `MINIO_ROOT_PASSWORD` - MinIO 密码
- `JWT_SECRET_KEY` - JWT 密钥（使用 `openssl rand -hex 32` 生成）

### 2) 构建并启动

```bash
# 在 docker 目录下
docker compose up --build -d

# 或在项目根目录
pnpm docker:up
```

### 3) 访问地址

- Web：`http://localhost:8080`
- API（直连）：`http://localhost:8000`（Swagger：`http://localhost:8000/docs`）
- API（经 Nginx）：`http://localhost:8080/api/*`
- MinIO Console：`http://localhost:9001`（文件管理）

### 4) 数据持久化

- **PostgreSQL**: 数据库数据持久化在 `postgres_data` volume
- **MinIO**: 文件存储持久化在 `minio_data` volume
- 容器重启不会丢失数据

### 5) 停止与清理

```bash
cd docker
docker compose down

# 连同持久化数据一起删除（会清空上传/导出文件）
docker compose down -v
```

---

### 生产环境部署（使用预构建镜像）

推荐使用预构建镜像部署到生产环境，无需在服务器上构建代码。

**详细步骤请参考：[docker/README.md](docker/README.md)**

快速概览：

```bash
# 1. 本地构建并推送镜像到 Docker Hub（自动读取版本号）
cd docker
./build-push.sh 0x1461a0

# 或手动指定版本
./build-push.sh 0x1461a0 1.0.0

# 2. 在生产服务器上配置环境变量
cd docker
cp .env.example .env
nano .env  # 填写配置

# 3. 启动服务
docker compose up -d
```

## 相关文档

- **版本管理**: [VERSION.md](VERSION.md) - 版本号规则和发布流程
- **快速部署**: [QUICKSTART.md](QUICKSTART.md) - 最快速的部署步骤
- **Docker 部署**: [docker/README.md](docker/README.md) - Docker 部署完整指南
- **环境变量**: [ENV.md](ENV.md) - 环境变量配置说明
- **后端 API**: [apps/api/README.md](apps/api/README.md) - 后端 API 详细文档
- **操作规范**: [docs/OPERATION_SPEC.md](docs/OPERATION_SPEC.md) - JSON 操作规范说明
