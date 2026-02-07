# 环境变量配置说明

本项目使用 Docker 进行部署，所有环境变量配置文件位于 `docker/` 目录下。

## 配置文件位置

- **开发/测试环境**: `docker/.env.example` → `docker/.env`
- **生产环境**: `docker/.env.production.example` → `docker/.env`

## 快速开始

```bash
# 复制模板
cd docker
cp .env.example .env

# 编辑配置
nano .env
```

## 必需配置

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

## 详细说明

请参考以下文件获取完整的配置说明：

- `docker/.env.example` - 开发/测试环境配置模板
- `docker/.env.production.example` - 生产环境配置模板
- `docker/README.md` - Docker 部署完整指南

## 注意事项

⚠️ **不要将 `.env` 文件提交到版本控制系统**

- `.env` 文件包含敏感信息（API 密钥、密码等）
- 项目已在 `.gitignore` 中排除所有 `.env` 文件
- 只提交 `.env.example` 模板文件
