# 版本管理指南

本文档说明 Selgetabel 项目的版本管理策略。

## 版本号规则

项目使用 [语义化版本](https://semver.org/lang/zh-CN/)：`MAJOR.MINOR.PATCH`

- **MAJOR**（主版本）：不兼容的 API 修改
- **MINOR**（次版本）：向下兼容的功能性新增
- **PATCH**（修订号）：向下兼容的问题修正

### 当前版本

版本号统一在 `package.json` 中维护：

```json
{
  "version": "0.1.0"
}
```

### 版本阶段

- **0.x.x** - 初始开发阶段，API 可能不稳定
- **1.x.x** - 第一个稳定版本
- **2.x.x+** - 后续大版本

## Docker 镜像标签策略

### 标签类型

1. **语义化版本标签**（推荐用于生产环境）
   - `0.1.0`, `0.2.0`, `1.0.0` 等
   - 不可变，适合生产环境版本锁定

2. **latest 标签**（适合开发环境）
   - 始终指向最新的稳定版本
   - 适合快速迭代的开发环境

### 示例

```bash
# 镜像命名示例
0x1461a0/selgetabel-api:0.1.0
0x1461a0/selgetabel-api:latest

0x1461a0/selgetabel-web:0.1.0
0x1461a0/selgetabel-web:latest
```

## 发布流程

### 1. 更新版本号

编辑 `package.json`，更新版本号：

```bash
# 手动编辑
nano package.json

# 或使用 npm version（会自动创建 git tag）
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.1 -> 0.2.0
npm version major  # 0.2.0 -> 1.0.0
```

### 2. 提交代码

```bash
git add package.json
git commit -m "chore: bump version to 0.1.1"
git push
```

### 3. 构建并推送 Docker 镜像

```bash
cd docker

# 方式 1：自动读取 package.json 版本
./build-push.sh 0x1461a0

# 方式 2：手动指定版本
./build-push.sh 0x1461a0 0.1.1

# 方式 3：推送 latest 标签
./build-push.sh 0x1461a0 latest
```

脚本会询问是否同时推送 `latest` 标签。

### 4. 创建 Git 标签（可选但推荐）

```bash
git tag -a v0.1.1 -m "Release version 0.1.1"
git push origin v0.1.1
```

### 5. 部署到生产环境

```bash
# 在生产服务器上
cd docker
nano .env  # 更新 IMAGE_VERSION=0.1.1
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 版本回退

如果新版本有问题，可以快速回退：

```bash
cd docker

# 修改 .env 文件
nano .env
# IMAGE_VERSION=0.1.0  # 回退到旧版本

# 重新部署
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 开发分支策略

### 推荐的 Git 工作流

```
main          # 生产环境，每次合并打 tag
├── develop   # 开发主分支
├── feature/* # 功能分支
└── hotfix/*  # 紧急修复分支
```

### 版本发布示例

```bash
# 1. 在 develop 分支开发完成
git checkout develop
git merge feature/new-feature

# 2. 准备发布
git checkout main
git merge develop

# 3. 更新版本号
npm version minor  # 0.1.0 -> 0.2.0

# 4. 推送代码和标签
git push origin main
git push origin v0.2.0

# 5. 构建并推送 Docker 镜像
cd docker
./build-push.sh 0x1461a0  # 自动使用 package.json 版本

# 6. 部署到生产环境
# ... 按照上述步骤部署
```

## 版本历史

### v0.1.0 (2025-02-07)
- 初始版本
- 基础 Excel 数据处理功能
- LLM 驱动的操作生成
- Docker 容器化部署

### 未来计划

- **v0.2.0** - 权限系统完善
- **v0.3.0** - 多文件批处理支持
- **v1.0.0** - 第一个稳定版本

## 常见问题

### Q: 为什么使用 package.json 管理版本？

A: 统一版本管理，避免多处维护。前端和后端共享同一个版本号，简化发布流程。

### Q: 如何查看当前版本？

A:
```bash
# 查看 package.json
cat package.json | grep version

# 查看 Git 标签
git tag -l

# 查看 Docker 镜像标签
docker images | grep selgetabel
```

### Q: latest 标签应该指向哪个版本？

A: `latest` 应该始终指向最新的**稳定版本**。不要将开发中的不稳定版本推送为 `latest`。

### Q: 如何在生产环境使用特定版本？

A: 在 `docker/.env` 中设置：
```bash
IMAGE_VERSION=0.1.0  # 锁定版本
```

不要使用 `latest`，以避免意外更新。

## 自动化发布（未来计划）

可以使用 GitHub Actions 自动化发布流程：

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and Push
        run: |
          cd docker
          # 默认使用 0x1461a0，也可以通过 secrets 覆盖
          ./build-push.sh 0x1461a0 ${GITHUB_REF#refs/tags/v}
```

## 参考资源

- [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)
- [Docker 镜像标签最佳实践](https://docs.docker.com/develop/dev-best-practices/)
- [Git 标签管理](https://git-scm.com/book/zh/v2/Git-基础-打标签)
