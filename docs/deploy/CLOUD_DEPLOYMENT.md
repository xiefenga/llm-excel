# 云平台部署方案

本文档描述 Selgetabel 系统在云平台上的部署方案，支持无需国外信用卡的免费部署。

## 技术方案概述

| 组件   | 平台                 | 成本          | 说明                  |
| ------ | -------------------- | ------------- | --------------------- |
| 前端   | **Vercel** (SSR)     | 免费          | React Router v7 SSR   |
| 后端   | **Vercel Functions** | 免费          | Python FastAPI + SSE  |
| 数据库 | **Neon**             | 免费（0.5GB） | Serverless PostgreSQL |
| 存储   | **Cloudflare R2**    | 免费（10GB）  | S3 兼容，零出口费     |

### 方案优势

- 全部免费，无需信用卡
- 统一在 Vercel 平台管理
- 支持 SSE 流式响应（60s 内完成）
- 自动 HTTPS 和全球 CDN

### 注意事项

- Vercel Functions 有 60s 超时，复杂处理可能中断
- Cloudflare R2 需要绑定支付方式（PayPal 可用）

---

## 平台注册和配置

### 1. Neon（数据库）

1. 访问 [https://neon.tech](https://neon.tech) 注册账号
2. 创建新项目，选择区域（推荐：Singapore 或 Tokyo）
3. 获取连接字符串：
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/selgetabel?sslmode=require
   ```
4. 在项目中运行数据库迁移（本地执行）：
   ```bash
   export DATABASE_URL="postgresql+asyncpg://user:pass@ep-xxx.neon.tech/selgetabel?sslmode=require"
   cd apps/api
   uv run alembic upgrade head
   ```

### 2. Cloudflare R2（存储）

1. 访问 [https://dash.cloudflare.com](https://dash.cloudflare.com) 注册账号
2. 进入 R2 Object Storage，创建 bucket
3. 在 R2 > Manage R2 API Tokens 创建 API Token
4. 记录以下信息：
   - Endpoint: `<account_id>.r2.cloudflarestorage.com`
   - Access Key ID
   - Secret Access Key
   - Bucket Name

**备选方案（如果 R2 无法使用）：**

| 方案             | 说明                   |
| ---------------- | ---------------------- |
| Supabase Storage | 免费 1GB，不需要信用卡 |
| Vercel Blob      | 免费额度有限           |

### 3. Vercel（前端 + 后端）

1. 访问 [https://vercel.com](https://vercel.com) 使用 GitHub 登录
2. 导入 GitHub 仓库
3. 配置环境变量（见下文）
4. 部署

---

## 环境变量配置

在 Vercel 项目设置中配置以下环境变量：

```bash
# 数据库（Neon）
DATABASE_URL=postgresql+asyncpg://user:pass@ep-xxx.neon.tech/selgetabel?sslmode=require

# 存储（Cloudflare R2）
MINIO_ENDPOINT=<account_id>.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=<access_key>
MINIO_SECRET_KEY=<secret_key>
MINIO_BUCKET=selgetabel
S3_SECURE=true

# JWT
JWT_SECRET_KEY=<random-32-hex>

# 前端 API 地址（同域名，使用相对路径）
VITE_API_BASE_URL=/api
```

生成 JWT 密钥：

```bash
openssl rand -hex 32
```

---

## 需要修改的文件

### Phase 1：前端 Vercel SSR 适配

#### `apps/web/package.json` - 添加依赖

```json
{
  "dependencies": {
    "@vercel/react-router": "^1.0.0"
  }
}
```

#### `apps/web/vercel.json` - 新增配置

```json
{
  "buildCommand": "pnpm install && pnpm --filter @selgetabel/web build",
  "installCommand": "pnpm install",
  "outputDirectory": "build/client",
  "framework": null
}
```

#### `apps/web/vite.config.ts` - 添加 Vercel 插件

```typescript
import { vercelReactRouter } from "@vercel/react-router/vite";

export default defineConfig({
  plugins: [
    // ... 其他插件
    vercelReactRouter(),
  ],
});
```

#### `apps/web/app/lib/config.ts` - 添加环境变量

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
```

### Phase 2：后端 Vercel Functions 适配

#### `api/index.py` - 新增 Vercel 入口

```python
from mangum import Mangum
from app.main import app

handler = Mangum(app, lifespan="off")
```

#### `vercel.json` - 根目录配置

```json
{
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.11",
      "maxDuration": 60
    }
  },
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/$1" }]
}
```

#### `requirements.txt` - Python 依赖

```
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
mangum>=0.17.0
python-multipart>=0.0.20
openai>=1.0.0
pandas>=2.0.0
openpyxl>=3.1.0
python-dotenv>=1.0.0
pydantic-settings>=2.0.0
sse-starlette>=2.0.0
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.29.0
python-jose[cryptography]>=3.3.0
bcrypt>=4.0.0
email-validator>=2.0.0
minio>=7.2.10
```

#### `apps/api/app/core/config.py` - 添加配置

```python
class Settings(BaseSettings):
    # ... 现有配置 ...

    # S3/R2 HTTPS 支持
    S3_SECURE: bool = True

    # Vercel 动态端口
    PORT: int = 8000
```

#### `apps/api/app/services/oss.py` - 支持 HTTPS

```python
def get_s3_client() -> Minio:
    return Minio(
        endpoint=settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.S3_SECURE,  # R2/S3 需要 True
    )
```

### Phase 3：数据库适配

#### `apps/api/app/core/database.py` - Neon 连接

```python
# Neon 连接池配置
engine = create_async_engine(
    settings.DATABASE_URL_ASYNC,
    pool_size=1,  # Serverless 环境
    max_overflow=0,
    pool_pre_ping=True,
)
```

---

## 目录结构调整

```
llm-excel/
├── api/                    # Vercel Functions 入口（新增）
│   └── index.py           # Mangum 适配器
├── apps/
│   ├── api/               # 后端代码（无需改动结构）
│   └── web/               # 前端代码
├── vercel.json            # Vercel 配置（新增）
├── requirements.txt       # Python 依赖（新增）
└── package.json           # 已存在
```

---

## 部署步骤

### Step 1：创建云服务账号

1. 注册 [Neon](https://neon.tech) - 创建数据库
2. 注册 [Cloudflare](https://dash.cloudflare.com) - 创建 R2 bucket
3. 注册 [Vercel](https://vercel.com) - 连接 GitHub 仓库

### Step 2：本地测试

```bash
# 安装 Vercel CLI
npm i -g vercel

# 本地开发
vercel dev

# 测试 API
curl http://localhost:3000/api/health
```

### Step 3：部署到 Vercel

1. 在 Vercel 中导入 GitHub 仓库
2. 配置环境变量
3. 点击 Deploy

### Step 4：数据库迁移

```bash
# 本地连接 Neon 数据库运行迁移
export DATABASE_URL="postgresql+asyncpg://...@neon.tech/...?sslmode=require"
cd apps/api
uv run alembic upgrade head
```

### Step 5：验证部署

1. 访问 Vercel 分配的域名
2. 测试用户注册/登录
3. 测试文件上传
4. 测试 Excel 处理（SSE 流）
5. 测试结果下载

---

## 验证方法

```bash
# 1. 检查 API 健康状态
curl https://your-app.vercel.app/api/health

# 2. 检查前端页面
curl https://your-app.vercel.app

# 3. 本地测试 Vercel 环境
vercel dev
```
