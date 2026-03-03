# Selgetabel 权限系统设计

## 概述

本文档描述 Selgetabel 系统的权限设计方案，基于 RBAC (Role-Based Access Control) 数据库结构，提供具备可扩展性的权限管理方案。

## 数据库设计

### 核心表结构

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    users    │────────▶│  user_roles  │◀────────│    roles    │
└─────────────┘         └──────────────┘         └─────────────┘
                                                        │
                                                        │
                                                        ▼
                                                 ┌──────────────────┐
                                                 │ role_permissions │
                                                 └──────────────────┘
                                                        │
                                                        │
                                                        ▼
                                                 ┌─────────────────┐
                                                 │   permissions   │
                                                 └─────────────────┘
```

### 表说明

- **users**: 用户表
- **roles**: 角色表（支持系统角色和自定义角色）
- **permissions**: 权限表
- **user_roles**: 用户-角色关联表（多对多）
- **role_permissions**: 角色-权限关联表（多对多）

## 权限设计原则

### 1. 资源-操作模型

权限编码采用 `{resource}:{action}` 格式：

```
资源:操作
例如：
- thread:read      # 读取会话
- thread:write     # 创建/编辑会话
- thread:delete    # 删除会话
- btrack:export    # 导出异常记录
```

### 2. 层级结构

支持通配符权限，便于角色管理：

```
*:*                # 超级权限（所有资源的所有操作）
thread:*           # 会话的所有操作
*:read             # 所有资源的读取权限
```

### 3. 最小权限原则

- 默认情况下用户无任何权限
- 通过角色授予权限
- 避免直接授予用户权限（通过角色间接授予）

### 4. 可扩展性

- 权限编码统一规范
- 支持按模块/资源组织
- 新增资源只需新增权限，无需修改代码结构

## 角色定义

### 系统预置角色

| 角色代码 | 角色名称 | 描述 | 系统角色 |
|---------|---------|------|---------|
| `admin` | 系统管理员 | 拥有所有权限，可管理用户、角色、权限 | ✅ |
| `user` | 普通用户 | 基础用户权限，可使用核心功能 | ✅ |
| `guest` | 访客 | 只读权限，用于演示或试用 | ✅ |
| `operator` | 运营人员 | 可查看所有数据，管理异常记录 | ❌ |

### 角色权限矩阵

| 功能 | 权限 | admin | user | guest | operator |
|------|------|-------|------|-------|----------|
| 查看自己的会话 | `thread:read` | ✅ | ✅ | ✅ | ✅ |
| 查看所有会话 | `thread:read:all` | ✅ | ❌ | ❌ | ✅ |
| 创建会话 | `thread:write` | ✅ | ✅ | ❌ | ✅ |
| 编辑会话 | `thread:update` | ✅ | ✅ | ❌ | ✅ |
| 删除会话 | `thread:delete` | ✅ | ✅ | ❌ | ❌ |
| 文件上传 | `file:upload` | ✅ | ✅ | ❌ | ✅ |
| Excel 处理 | `excel:process` | ✅ | ✅ | ❌ | ✅ |
| Excel 预览 | `excel:preview` | ✅ | ✅ | ✅ | ✅ |
| 查看自己的异常 | `btrack:read` | ✅ | ✅ | ❌ | ✅ |
| 查看所有异常 | `btrack:read:all` | ✅ | ❌ | ❌ | ✅ |
| 导出异常数据 | `btrack:export` | ✅ | ❌ | ❌ | ✅ |
| 用户管理 | `user:read` | ✅ | ❌ | ❌ | ❌ |
| 角色分配 | `user:assign_role` | ✅ | ❌ | ❌ | ❌ |
| 角色管理 | `role:read` | ✅ | ❌ | ❌ | ❌ |
| 权限管理 | `permission:read` | ✅ | ❌ | ❌ | ❌ |

## 权限定义

### 权限编码规范

格式：`{resource}:{action}` 或 `{resource}:{action}:{scope}`

- `thread:read` — 资源 + 操作
- `thread:read:all` — 资源 + 操作 + 范围

### 按模块分类的权限

#### 1. 会话管理

| 权限代码 | 描述 |
|---------|------|
| `thread:read` | 查看自己的会话列表和详情 |
| `thread:read:all` | 查看所有用户的会话 |
| `thread:write` | 创建新会话 |
| `thread:update` | 编辑自己的会话 |
| `thread:delete` | 删除自己的会话 |
| `thread:delete:all` | 删除任何用户的会话 |

#### 2. 文件管理

| 权限代码 | 描述 |
|---------|------|
| `file:upload` | 上传 Excel 文件 |
| `file:read` | 查看自己上传的文件 |
| `file:read:all` | 查看所有用户的文件 |
| `file:delete` | 删除自己的文件 |
| `file:download` | 下载文件（包含处理结果） |

#### 3. Excel 处理

| 权限代码 | 描述 |
|---------|------|
| `excel:process` | 使用 Excel 处理功能 |
| `excel:preview` | 预览处理结果 |
| `excel:download` | 下载处理后的文件 |

#### 4. 异常追踪 (BTrack)

| 权限代码 | 描述 |
|---------|------|
| `btrack:read` | 查看自己的异常记录 |
| `btrack:read:all` | 查看所有用户的异常记录 |
| `btrack:export` | 导出所有异常记录为 JSON |
| `btrack:update` | 标记异常为已修复 |

#### 5. 用户管理

| 权限代码 | 描述 |
|---------|------|
| `user:read` | 查看用户列表和详情 |
| `user:create` | 创建新用户 |
| `user:update` | 编辑用户信息 |
| `user:delete` | 删除用户 |
| `user:assign_role` | 为用户分配角色 |

#### 6. 角色管理

| 权限代码 | 描述 |
|---------|------|
| `role:read` | 查看角色列表和详情 |
| `role:create` | 创建自定义角色 |
| `role:update` | 编辑角色信息 |
| `role:delete` | 删除自定义角色（系统角色不可删除） |
| `role:assign_permission` | 为角色分配权限 |

#### 7. 权限管理

| 权限代码 | 描述 |
|---------|------|
| `permission:read` | 查看权限列表和详情 |
| `permission:manage` | 创建、编辑、删除权限 |

#### 8. 系统管理

| 权限代码 | 描述 |
|---------|------|
| `system:settings` | 修改系统配置 |
| `system:logs` | 查看系统日志 |
| `system:*` | 所有系统管理权限 |

## 扩展新权限

1. 在 `permissions.py` 中添加权限常量，并在 `ROLE_PERMISSIONS` 中分配给角色
2. 在后端路由中使用 `check_permission()` 依赖注入
3. 在前端 `permissions.ts` 中添加对应枚举值
4. 重启应用，权限自动初始化到数据库

## 角色分配

**UI 方式**：管理员登录 → `/users` → 点击「管理角色」→ 选择角色 → 保存

**API 方式**：
```bash
curl -X POST "http://localhost:8000/api/roles/assign" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{"user_id": "user-uuid", "role_ids": ["role-uuid-1"]}'
```

**SQL 方式**：
```sql
INSERT INTO user_roles (id, user_id, role_id, created_at)
SELECT gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'target_user'),
  (SELECT id FROM roles WHERE code = 'operator'),
  NOW();
```

## 最佳实践

- **权限粒度**：使用细粒度权限（`thread:read`, `thread:write`, `thread:delete`），通过角色组合实现灵活控制
- **命名规范**：使用 `resource:action` 格式，清晰简洁（如 `user:read`、`btrack:export`、`thread:read:all`）
- **检查位置**：后端路由必须检查（安全），前端组件应该检查（体验），业务逻辑关键操作前检查（深度防御）
- **默认拒绝**：没有权限时默认拒绝访问
- **后端验证**：永远在后端验证权限，前端检查仅用于 UI
- **系统角色**：系统角色不可删除，谨慎修改

## 实现状态

### 已完成

- [x] 权限常量定义 + 角色映射
- [x] 权限检查依赖注入（`check_permission`、`has_permission`）
- [x] 通配符权限匹配
- [x] 数据库初始化脚本
- [x] 前端权限 Hooks（`usePermission`、`useRole`）
- [x] 前端权限常量枚举
- [x] BTrack / Thread 路由权限控制
- [x] 用户管理界面 + 角色分配功能

### 待完成

- [ ] File 路由权限控制
- [ ] Chat 路由权限控制
- [ ] 角色创建/编辑界面
- [ ] 权限详情页面
- [ ] 审计日志

## 文件清单

### 后端

| 文件 | 说明 |
|------|------|
| `apps/api/app/core/permissions.py` | 权限常量定义 + 角色映射 |
| `apps/api/app/core/init_permissions.py` | 初始化脚本 |
| `apps/api/app/api/deps.py` | `check_permission`、`has_permission` 等工具 |
| `apps/api/app/api/routes/btrack.py` | BTrack 路由 |
| `apps/api/app/api/routes/thread.py` | Thread 路由 |
| `apps/api/app/api/routes/role.py` | 角色管理 API |
| `apps/api/app/api/routes/user.py` | 用户管理 API |
| `apps/api/app/main.py` | 启动初始化 |

### 前端

| 文件 | 说明 |
|------|------|
| `apps/web/app/hooks/use-permission.ts` | `usePermission`、`useRole` Hooks |
| `apps/web/app/lib/permissions.ts` | 权限常量枚举 + `hasPermission` 函数 |
| `apps/web/app/lib/permission-api.ts` | 权限管理 API 客户端 |
| `apps/web/app/features/admin/user-management-page.tsx` | 用户管理页面 |
| `apps/web/app/routes/_auth._app.users.tsx` | 用户管理路由 |
