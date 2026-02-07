FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# uv (Python 包管理/运行器)
RUN pip install --no-cache-dir uv

FROM base AS deps

# 安装系统依赖：PostgreSQL 客户端（健康检查）和 curl（Docker 健康检查）
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 先拷贝依赖清单以利用缓存
COPY apps/api/pyproject.toml apps/api/uv.lock /app/

# 安装依赖（锁定版本）
RUN uv sync --frozen

FROM base AS runner

WORKDIR /app

# 安装 curl（用于健康检查）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 拷贝已安装的虚拟环境
COPY --from=deps /app/.venv /app/.venv

# 拷贝 package.json（用于生成版本）
COPY package.json /tmp/

# 拷贝应用代码
COPY apps/api/ /app/

# 生成版本文件
RUN python scripts/generate_version.py

# FastAPI 默认端口
EXPOSE 8000

# 默认命令（运行应用）
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
