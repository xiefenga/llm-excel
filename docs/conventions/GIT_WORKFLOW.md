# Git 工作流规范

项目采用 **GitHub Flow** 分支管理策略。版本发布相关规范见 [RELEASE_VERSION.md](./RELEASE_VERSION.md)。

## 核心原则

- **main 分支**始终处于可部署状态
- 所有开发在**功能分支**进行，通过 PR 合并
- 所有代码变更必须经过代码审查
- 使用 **Squash and merge** 保持主线历史整洁

## 分支策略

```
main                    # 生产分支，始终可部署
├── feature/*           # 功能分支
├── fix/*               # 修复分支
├── docs/*              # 文档分支
├── refactor/*          # 重构分支
├── perf/*              # 性能优化分支
└── chore/*             # 构建/工具变更
```

## 提交规范

### 格式

```
<类型>(<可选作用域>): <描述>

[可选的正文]

[可选的脚注]
```

### 类型

| 类型       | 说明                   | 示例                            |
| ---------- | ---------------------- | ------------------------------- |
| `feat`     | 新功能                 | `feat: 添加 Excel 批量导入功能` |
| `fix`      | 修复问题               | `fix: 修复数据导出时的内存泄漏` |
| `docs`     | 文档变更               | `docs: 更新 API 接口文档`       |
| `style`    | 代码格式（不影响功能） | `style: 统一缩进格式`           |
| `refactor` | 重构                   | `refactor: 优化数据库查询逻辑`  |
| `perf`     | 性能优化               | `perf: 缓存频繁访问的数据`      |
| `test`     | 测试相关               | `test: 添加用户认证单元测试`    |
| `build`    | 构建相关               | `build: 更新 Docker 基础镜像`   |
| `ci`       | CI/CD 配置             | `ci: 添加自动化测试工作流`      |
| `chore`    | 其他变更               | `chore: 升级依赖包版本`         |
| `revert`   | 回滚                   | `revert: 撤销某次提交`          |

### 作用域

- `api` — 后端 API
- `web` — 前端
- `db` — 数据库
- `docker` — Docker 配置
- `deps` — 依赖更新

## 开发流程

### 1. 创建功能分支

```bash
git checkout main
git pull origin main
git checkout -b feature/excel-parser
```

### 2. 开发提交

```bash
# 保持提交粒度小且有意义
git commit -m "feat(api): 实现 xlsx 文件读取"
git commit -m "feat(api): 添加单元格数据格式化"

# 定期同步 main（减少冲突）
git fetch origin
git rebase origin/main
```

### 3. 推送和创建 PR

```bash
git push -u origin feature/excel-parser
# 在 GitHub 上创建 Pull Request
```

### 4. PR 合并要求

- 至少 1 个代码审查批准
- 所有 CI 检查通过
- 无合并冲突
- PR 标题使用提交规范格式（如 `feat: 添加用户认证功能`）

### 5. 合并后清理

```bash
git checkout main
git pull origin main
git branch -d feature/excel-parser
```

## 代码审查

### 审查者检查清单

- 代码逻辑正确
- 遵循项目编码规范
- 包含适当的测试
- 无安全问题
- 无调试代码（console.log 等）

### PR 要求

- 保持 PR 大小适中（建议 < 500 行变更）
- 提供清晰的 PR 描述
- 关联相关的 Issue
- 及时响应审查意见

## 紧急修复

```bash
# 从 main 切出热修复分支
git checkout main && git pull origin main
git checkout -b fix/critical-bug

# 修复、提交、创建 PR 并加急审查
git commit -m "fix: 修复生产环境崩溃问题"

# 合并后立即按发布流程打 tag 发版
```
