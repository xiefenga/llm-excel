# 版本标识和管理实现总结

本文档总结版本标识和管理方案的完整实现。

## ✅ 已实现功能

### 1. 版本号统一管理

**单一数据源：** `package.json`

```json
{
  "version": "0.1.0"
}
```

**自动同步到：**
- ✅ FastAPI 应用版本
- ✅ API 文档版本
- ✅ Docker 镜像标签
- ✅ 运行时版本查询

### 2. 构建时版本注入

**脚本：** `apps/api/scripts/generate_version.py`

**功能：**
- 读取 `package.json` 中的版本号
- 生成 `apps/api/app/__version__.py`
- 包含版本号和构建时间

**集成：**
- Dockerfile 构建时自动执行
- 本地开发可手动执行

**生成的文件：**
```python
# app/__version__.py
__version__ = "0.1.0"
__build_time__ = "2026-02-07T08:21:26.922324+00:00"
```

### 3. 应用运行时版本

**API 端点：**

| 端点 | 说明 | 响应 |
|------|------|------|
| `GET /version` | 详细版本信息 | JSON |
| `GET /health` | 健康检查（含版本） | JSON |
| 响应头 | `X-App-Version` | Header |

**示例：**
```bash
# 查询版本
curl http://localhost:8000/version
{
  "app": {
    "name": "Selgetabel",
    "version": "0.1.0",
    "build_time": "2026-02-07T08:21:26Z"
  }
}

# 健康检查
curl http://localhost:8000/health
{
  "status": "ok",
  "version": "0.1.0"
}

# 响应头
curl -I http://localhost:8000/
HTTP/1.1 200 OK
X-App-Version: 0.1.0
```

### 4. 启动时版本检查

**模块：** `app/core/version_check.py`

**功能：**
- 检查数据库版本（Alembic revision）
- 检查代码迁移版本
- 验证两者是否匹配
- 启动时自动检查（非严格模式）

**启动日志：**
```
🚀 Selgetabel API v0.1.0 启动中...
   构建时间: 2026-02-07T08:21:26Z
🔍 检查版本一致性...
   应用版本: 0.1.0
   数据库版本: 648d4ca39b77
   代码迁移版本: 648d4ca39b77
✅ 版本检查通过
✅ 应用初始化完成
```

### 5. 升级脚本

**脚本位置：** `docker/scripts/`

| 脚本 | 功能 |
|------|------|
| `upgrade.sh` | 完整升级流程（推荐） |
| `migrate.sh` | 仅执行数据库迁移 |
| `backup.sh` | 备份数据库 |
| `verify.sh` | 验证版本一致性 |
| `rollback.sh` | 回滚到上一版本 |

**升级流程：**
```bash
cd docker
./scripts/upgrade.sh 0.2.0

# 自动执行：
# 1. 备份数据库
# 2. 拉取新镜像
# 3. 执行迁移
# 4. 验证版本
# 5. 更新配置
# 6. 重启应用
# 7. 健康检查
# 失败时自动回滚
```

---

## 📁 文件结构

### 新增文件

```
apps/api/
├── app/
│   ├── __version__.py              # 自动生成（Git 忽略）⭐
│   └── core/
│       └── version_check.py        # 版本检查模块 ⭐
└── scripts/
    └── generate_version.py         # 版本生成脚本 ⭐

docker/scripts/
├── upgrade.sh                      # 完整升级脚本 ⭐
├── migrate.sh                      # 迁移脚本 ⭐
├── backup.sh                       # 备份脚本 ⭐
├── verify.sh                       # 验证脚本 ⭐
├── rollback.sh                     # 回滚脚本 ⭐
└── README.md                       # 脚本使用文档 ⭐
```

### 修改文件

```
apps/api/
├── Dockerfile                      # 添加版本生成步骤
└── app/main.py                     # 集成版本信息和检查

.gitignore                          # 忽略自动生成的版本文件
```

---

## 🔄 完整工作流程

### 开发阶段

```bash
# 1. 修改代码
git add .
git commit -m "feat: 添加新功能"

# 2. 更新版本号
npm version patch  # 0.1.0 -> 0.1.1

# 3. 推送代码
git push origin main --tags
```

### 构建阶段

```bash
cd docker

# 构建镜像（自动读取版本号）
./build-push.sh

# 等价于：
# 1. 从 package.json 读取版本 (0.1.1)
# 2. 构建镜像并打标签: 0x1461a0/selgetabel-api:0.1.1
# 3. 推送到 Docker Hub
```

### 部署阶段

```bash
cd docker

# 方式 A：一键升级
./scripts/upgrade.sh 0.1.1

# 方式 B：手动步骤
./scripts/backup.sh
docker compose pull
./scripts/migrate.sh 0.1.1
./scripts/verify.sh
nano .env  # IMAGE_VERSION=0.1.1
docker compose up -d
```

### 运行时

```bash
# 查询版本
curl http://localhost:8000/version

# 查看启动日志
docker compose logs api | grep -A5 "Selgetabel API"

# 验证版本一致性
./scripts/verify.sh
```

---

## 🎯 版本一致性保证

### 构建时

```
package.json (0.1.0)
    ↓
generate_version.py
    ↓
__version__.py (0.1.0)
    ↓
Docker build
    ↓
镜像标签 (0x1461a0/selgetabel-api:0.1.0)
```

### 运行时

```
容器启动
    ↓
导入 __version__.py
    ↓
FastAPI(version="0.1.0")
    ↓
启动日志: "🚀 Selgetabel API v0.1.0"
    ↓
版本检查: 数据库 vs 代码
    ↓
/version API: {"version": "0.1.0"}
    ↓
响应头: X-App-Version: 0.1.0
```

---

## 📊 版本信息来源

| 位置 | 来源 | 更新方式 |
|------|------|----------|
| `package.json` | 手动 | `npm version` |
| `__version__.py` | 自动生成 | 构建时 |
| FastAPI 应用 | `__version__.py` | 导入 |
| Docker 镜像 | `package.json` | 构建脚本 |
| 数据库版本 | Alembic | 迁移脚本 |

---

## 🔍 版本查询方式

### 1. 查询应用版本

```bash
# HTTP API
curl http://localhost:8000/version

# 响应头
curl -I http://localhost:8000/ | grep X-App-Version

# Docker 容器
docker compose exec api python -c "from app.__version__ import __version__; print(__version__)"

# 启动日志
docker compose logs api | grep "Selgetabel API"
```

### 2. 查询数据库版本

```bash
# Alembic 命令
docker compose run --rm init-db alembic current

# SQL 查询
docker compose exec postgres psql -U llmexcel -d llmexcel -c "SELECT version_num FROM alembic_version"

# 验证脚本
cd docker
./scripts/verify.sh
```

### 3. 查询镜像版本

```bash
# 本地镜像
docker images | grep selgetabel

# Docker Hub
docker manifest inspect 0x1461a0/selgetabel-api:0.1.0

# 当前运行
docker compose ps | grep api
```

---

## ⚙️ 配置选项

### 启动时版本检查

**文件：** `app/main.py`

```python
# 严格模式：版本不匹配时抛出异常
await verify_versions_on_startup(db, strict=True)

# 非严格模式：版本不匹配时只打印警告（默认）
await verify_versions_on_startup(db, strict=False)
```

### 版本生成

**手动执行：**
```bash
cd apps/api
python scripts/generate_version.py
```

**Docker 构建时自动执行**（已集成到 Dockerfile）

---

## 🎓 最佳实践

### 1. 版本号规范

遵循语义化版本：`MAJOR.MINOR.PATCH`

```bash
# 修复 Bug
npm version patch  # 0.1.0 -> 0.1.1

# 新功能（向下兼容）
npm version minor  # 0.1.1 -> 0.2.0

# 破坏性变更
npm version major  # 0.2.0 -> 1.0.0
```

### 2. 升级前检查

```bash
# 查看当前版本
curl http://localhost:8000/version

# 查看 CHANGELOG
cat CHANGELOG.md

# 备份数据
cd docker
./scripts/backup.sh
```

### 3. 升级后验证

```bash
cd docker

# 验证版本一致性
./scripts/verify.sh

# 检查应用状态
docker compose ps

# 测试核心功能
curl http://localhost:8000/health
```

### 4. 回滚准备

```bash
# 保留备份文件
ls docker/backups/

# 记录当前版本
docker compose exec api python -c "from app.__version__ import __version__; print(__version__)"

# 了解回滚流程
cat docker/scripts/README.md
```

---

## 🐛 故障排查

### 问题 1：版本文件不存在

**错误：** `ImportError: No module named '__version__'`

**原因：** 未生成版本文件

**解决：**
```bash
# 手动生成
cd apps/api
python scripts/generate_version.py

# 或重新构建镜像
cd docker
docker compose build api
```

### 问题 2：版本不匹配

**警告：** `⚠️ 版本不匹配！`

**原因：** 数据库版本与代码版本不一致

**解决：**
```bash
cd docker

# 执行迁移
./scripts/migrate.sh <版本号>

# 或回滚代码
./scripts/rollback.sh
```

### 问题 3：无法查询版本

**错误：** `curl: (7) Failed to connect`

**原因：** 应用未启动

**解决：**
```bash
# 检查容器状态
docker compose ps

# 查看日志
docker compose logs api

# 重启应用
docker compose restart api
```

---

## 📚 相关文档

- [VERSION.md](VERSION.md) - 版本管理规范
- [docker/scripts/README.md](docker/scripts/README.md) - 升级脚本使用指南
- [INITIALIZATION_SUMMARY.md](INITIALIZATION_SUMMARY.md) - 初始化方案总结
- [QUICKSTART.md](QUICKSTART.md) - 快速开始指南

---

## 🎉 总结

这个版本管理方案实现了：

1. **单一数据源** - package.json 是唯一的版本来源
2. **自动同步** - 构建时自动生成版本文件
3. **运行时可查** - 提供多种方式查询版本
4. **版本检查** - 启动时验证数据库版本匹配
5. **完整工具链** - 备份、迁移、验证、回滚脚本
6. **清晰日志** - 启动时显示版本信息
7. **安全升级** - 失败时自动回滚

现在你可以：
- ✅ 一键升级版本
- ✅ 随时查询版本
- ✅ 自动检查一致性
- ✅ 快速回滚错误
