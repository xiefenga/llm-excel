# 发布与版本管理

## 版本号规则

项目使用 [语义化版本](https://semver.org/lang/zh-CN/)：`MAJOR.MINOR.PATCH`

- **MAJOR**（主版本）：不兼容的 API 修改
- **MINOR**（次版本）：向下兼容的功能性新增
- **PATCH**（修订号）：向下兼容的问题修正

版本号统一在根目录 `package.json` 的 `version` 字段维护，前端和后端共享同一版本号。

### 版本阶段

- **0.x.x** — 初始开发阶段，API 可能不稳定
- **1.x.x** — 第一个稳定版本

## Docker 镜像标签策略

| 标签类型 | 示例 | 用途 |
|---------|------|------|
| 语义化版本 | `selgetabel-api:0.2.0` | 生产环境，不可变，版本锁定 |
| latest | `selgetabel-api:latest` | 开发环境，始终指向最新稳定版本 |

镜像名称：`${DOCKERHUB_USERNAME}/selgetabel-api` 和 `${DOCKERHUB_USERNAME}/selgetabel-web`

## 发布流程

### 1. 更新版本号并提交

```bash
npm version patch  # 0.2.0 -> 0.2.1
npm version minor  # 0.2.0 -> 0.3.0
npm version major  # 0.2.0 -> 1.0.0

git push origin main
```

### 2. 创建 Git 标签触发 CI/CD

```bash
git tag -a v0.2.1 -m "Release v0.2.1"
git push origin v0.2.1
```

推送 `v*` 标签后，GitHub Actions（`.github/workflows/docker-build-push.yml`）自动：
- 从 `package.json` 读取版本号
- 构建 `linux/amd64` + `linux/arm64` 多架构镜像
- 推送版本标签和 `latest` 标签到 Docker Hub

也可在 GitHub Actions UI 手动触发 workflow dispatch。

### 3. 部署到生产环境

```bash
cd docker
# 更新 .env 中的 IMAGE_VERSION
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 版本回退

```bash
cd docker
# 修改 .env: IMAGE_VERSION=0.2.0（回退到旧版本）
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

生产环境始终在 `docker/.env` 中锁定具体版本号，不要使用 `latest`。
