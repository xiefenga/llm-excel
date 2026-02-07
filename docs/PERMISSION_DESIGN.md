# Selgetabel 权限系统设计

## 概述

本文档描述 Selgetabel 系统的权限设计方案，基于当前的 RBAC (Role-Based Access Control) 数据库结构，提供具备可扩展性的权限管理方案。

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

| 功能模块 | admin | user | guest | operator |
|---------|-------|------|-------|----------|
| 会话管理（自己的） | ✅ | ✅ | ✅ | ✅ |
| 会话管理（所有） | ✅ | ❌ | ❌ | ✅ |
| 文件上传 | ✅ | ✅ | ❌ | ✅ |
| Excel 处理 | ✅ | ✅ | ✅ | ✅ |
| BTrack 查看（自己的） | ✅ | ✅ | ❌ | ✅ |
| BTrack 查看（所有） | ✅ | ❌ | ❌ | ✅ |
| BTrack 导出 | ✅ | ❌ | ❌ | ✅ |
| 用户管理 | ✅ | ❌ | ❌ | ❌ |
| 角色管理 | ✅ | ❌ | ❌ | ❌ |
| 权限管理 | ✅ | ❌ | ❌ | ❌ |

## 权限定义

### 权限编码规范

格式：`{module}:{resource}:{action}` 或 `{resource}:{action}`

```python
# 完整格式（推荐）
"excel:thread:read"      # Excel模块 - 会话 - 读取
"excel:thread:write"     # Excel模块 - 会话 - 写入
"admin:user:manage"      # 管理模块 - 用户 - 管理

# 简化格式（资源全局唯一时）
"thread:read"
"file:upload"
```

### 按模块分类的权限

#### 1. 会话管理 (Thread Management)

| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| `thread:read` | 查看会话 | 查看自己的会话列表和详情 |
| `thread:read:all` | 查看所有会话 | 查看所有用户的会话 |
| `thread:write` | 创建会话 | 创建新会话 |
| `thread:update` | 编辑会话 | 编辑自己的会话 |
| `thread:delete` | 删除会话 | 删除自己的会话 |
| `thread:delete:all` | 删除任意会话 | 删除任何用户的会话 |

#### 2. 文件管理 (File Management)

| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| `file:upload` | 上传文件 | 上传 Excel 文件 |
| `file:read` | 查看文件 | 查看自己上传的文件 |
| `file:read:all` | 查看所有文件 | 查看所有用户的文件 |
| `file:delete` | 删除文件 | 删除自己的文件 |
| `file:download` | 下载文件 | 下载文件（包含处理结果） |

#### 3. Excel 处理 (Excel Processing)

| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| `excel:process` | 处理 Excel | 使用 Excel 处理功能 |
| `excel:preview` | 预览结果 | 预览处理结果 |
| `excel:download` | 下载结果 | 下载处理后的文件 |

#### 4. 异常追踪 (BTrack)

| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| `btrack:read` | 查看异常记录 | 查看自己的异常记录 |
| `btrack:read:all` | 查看所有异常 | 查看所有用户的异常记录 |
| `btrack:export` | 导出异常数据 | 导出所有异常记录为 JSON |
| `btrack:update` | 更新异常状态 | 标记异常为已修复 |

#### 5. 用户管理 (User Management)

| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| `user:read` | 查看用户 | 查看用户列表和详情 |
| `user:create` | 创建用户 | 创建新用户 |
| `user:update` | 编辑用户 | 编辑用户信息 |
| `user:delete` | 删除用户 | 删除用户 |
| `user:assign_role` | 分配角色 | 为用户分配角色 |

#### 6. 角色管理 (Role Management)

| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| `role:read` | 查看角色 | 查看角色列表和详情 |
| `role:create` | 创建角色 | 创建自定义角色 |
| `role:update` | 编辑角色 | 编辑角色信息 |
| `role:delete` | 删除角色 | 删除自定义角色（系统角色不可删除） |
| `role:assign_permission` | 分配权限 | 为角色分配权限 |

#### 7. 权限管理 (Permission Management)

| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| `permission:read` | 查看权限 | 查看权限列表和详情 |
| `permission:manage` | 管理权限 | 创建、编辑、删除权限（谨慎使用） |

#### 8. 系统管理 (System Management)

| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| `system:settings` | 系统设置 | 修改系统配置 |
| `system:logs` | 查看日志 | 查看系统日志 |
| `system:*` | 系统全部权限 | 所有系统管理权限 |

## 完整权限列表

```python
# apps/api/app/core/permissions.py

class Permissions:
    """权限常量定义"""

    # 会话管理
    THREAD_READ = "thread:read"
    THREAD_READ_ALL = "thread:read:all"
    THREAD_WRITE = "thread:write"
    THREAD_UPDATE = "thread:update"
    THREAD_DELETE = "thread:delete"
    THREAD_DELETE_ALL = "thread:delete:all"

    # 文件管理
    FILE_UPLOAD = "file:upload"
    FILE_READ = "file:read"
    FILE_READ_ALL = "file:read:all"
    FILE_DELETE = "file:delete"
    FILE_DOWNLOAD = "file:download"

    # Excel 处理
    EXCEL_PROCESS = "excel:process"
    EXCEL_PREVIEW = "excel:preview"
    EXCEL_DOWNLOAD = "excel:download"

    # 异常追踪
    BTRACK_READ = "btrack:read"
    BTRACK_READ_ALL = "btrack:read:all"
    BTRACK_EXPORT = "btrack:export"
    BTRACK_UPDATE = "btrack:update"

    # 用户管理
    USER_READ = "user:read"
    USER_CREATE = "user:create"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_ASSIGN_ROLE = "user:assign_role"

    # 角色管理
    ROLE_READ = "role:read"
    ROLE_CREATE = "role:create"
    ROLE_UPDATE = "role:update"
    ROLE_DELETE = "role:delete"
    ROLE_ASSIGN_PERMISSION = "role:assign_permission"

    # 权限管理
    PERMISSION_READ = "permission:read"
    PERMISSION_MANAGE = "permission:manage"

    # 系统管理
    SYSTEM_SETTINGS = "system:settings"
    SYSTEM_LOGS = "system:logs"
    SYSTEM_ALL = "system:*"

    # 超级权限
    ALL = "*:*"


# 角色预置权限配置
ROLE_PERMISSIONS = {
    "admin": [
        Permissions.ALL,  # 管理员拥有所有权限
    ],

    "user": [
        # 会话
        Permissions.THREAD_READ,
        Permissions.THREAD_WRITE,
        Permissions.THREAD_UPDATE,
        Permissions.THREAD_DELETE,

        # 文件
        Permissions.FILE_UPLOAD,
        Permissions.FILE_READ,
        Permissions.FILE_DELETE,
        Permissions.FILE_DOWNLOAD,

        # Excel 处理
        Permissions.EXCEL_PROCESS,
        Permissions.EXCEL_PREVIEW,
        Permissions.EXCEL_DOWNLOAD,

        # 异常追踪（仅自己的）
        Permissions.BTRACK_READ,
    ],

    "guest": [
        # 会话（只读）
        Permissions.THREAD_READ,

        # Excel 处理（只读）
        Permissions.EXCEL_PREVIEW,
    ],

    "operator": [
        # 会话（所有）
        Permissions.THREAD_READ,
        Permissions.THREAD_READ_ALL,
        Permissions.THREAD_WRITE,
        Permissions.THREAD_UPDATE,

        # 文件（所有）
        Permissions.FILE_UPLOAD,
        Permissions.FILE_READ,
        Permissions.FILE_READ_ALL,
        Permissions.FILE_DOWNLOAD,

        # Excel 处理
        Permissions.EXCEL_PROCESS,
        Permissions.EXCEL_PREVIEW,
        Permissions.EXCEL_DOWNLOAD,

        # 异常追踪（所有）
        Permissions.BTRACK_READ,
        Permissions.BTRACK_READ_ALL,
        Permissions.BTRACK_EXPORT,
        Permissions.BTRACK_UPDATE,

        # 系统日志
        Permissions.SYSTEM_LOGS,
    ],
}
```

## 实现指南

### 1. 权限检查装饰器

```python
# apps/api/app/api/deps.py

from functools import wraps
from typing import List
from fastapi import HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.models.role import Permission


async def get_user_permissions(user: User, db: AsyncSession) -> List[str]:
    """获取用户的所有权限"""
    permissions = set()

    # 通过用户的角色获取权限
    for role in user.roles:
        for permission in role.permissions:
            permissions.add(permission.code)

    return list(permissions)


def check_permission(permission_code: str, match_all: bool = False):
    """
    检查权限的依赖注入函数

    Args:
        permission_code: 权限代码或权限代码列表
        match_all: 如果为 True，需要匹配所有权限；否则匹配任意一个即可
    """
    async def _check(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ):
        # 获取用户权限
        user_permissions = await get_user_permissions(user, db)

        # 检查超级权限
        if "*:*" in user_permissions:
            return user

        # 权限代码列表
        required_permissions = (
            permission_code if isinstance(permission_code, list)
            else [permission_code]
        )

        # 检查通配符权限
        for perm in user_permissions:
            if "*" in perm:
                # 解析通配符权限
                parts = perm.split(":")
                for req_perm in required_permissions:
                    req_parts = req_perm.split(":")
                    # 模式匹配
                    if _match_permission_pattern(parts, req_parts):
                        if not match_all:
                            return user

        # 精确匹配
        if match_all:
            if all(p in user_permissions for p in required_permissions):
                return user
        else:
            if any(p in user_permissions for p in required_permissions):
                return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足"
        )

    return _check


def _match_permission_pattern(pattern: List[str], target: List[str]) -> bool:
    """匹配权限通配符模式"""
    if len(pattern) != len(target):
        return False

    for p, t in zip(pattern, target):
        if p != "*" and p != t:
            return False

    return True


def require_permissions(*permissions, match_all: bool = False):
    """
    权限检查装饰器（用于非 FastAPI 函数）

    Args:
        permissions: 权限代码列表
        match_all: 是否需要匹配所有权限
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从参数中提取 user 和 db
            user = kwargs.get('current_user') or kwargs.get('user')
            db = kwargs.get('db')

            if not user or not db:
                raise ValueError("require_permissions decorator needs user and db in kwargs")

            user_permissions = await get_user_permissions(user, db)

            # 检查超级权限
            if "*:*" in user_permissions:
                return await func(*args, **kwargs)

            # 权限检查逻辑...
            # （同上）

            return await func(*args, **kwargs)

        return wrapper
    return decorator
```

### 2. 在路由中使用权限检查

```python
# apps/api/app/api/routes/btrack.py

from app.api.deps import check_permission
from app.core.permissions import Permissions

@router.get(
    "",
    response_model=ApiResponse[BTrackListResponse],
    summary="获取 BTrack 列表",
)
async def get_btracks(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    fixed: Optional[bool] = Query(None),
    current_user: User = Depends(check_permission(Permissions.BTRACK_READ)),
    db: AsyncSession = Depends(get_db),
):
    # 检查用户是否有查看所有记录的权限
    user_permissions = await get_user_permissions(current_user, db)
    can_view_all = (
        Permissions.BTRACK_READ_ALL in user_permissions or
        "*:*" in user_permissions
    )

    if can_view_all:
        # 查询所有用户的记录
        filters = []
    else:
        # 只查询当前用户的记录
        filters = [BTrack.reporter_id == current_user.id]

    # ... 后续逻辑


@router.get(
    "/export",
    summary="导出 BTrack 数据（仅管理员/运营）",
)
async def export_btracks(
    fixed: Optional[bool] = Query(None),
    current_user: User = Depends(check_permission(Permissions.BTRACK_EXPORT)),
    db: AsyncSession = Depends(get_db),
):
    # 导出逻辑...
```

### 3. 前端权限判断

```typescript
// apps/web/app/lib/permissions.ts

export enum Permissions {
  // 会话
  THREAD_READ = "thread:read",
  THREAD_READ_ALL = "thread:read:all",
  THREAD_WRITE = "thread:write",
  THREAD_UPDATE = "thread:update",
  THREAD_DELETE = "thread:delete",

  // 文件
  FILE_UPLOAD = "file:upload",
  FILE_READ = "file:read",
  FILE_DELETE = "file:delete",

  // BTrack
  BTRACK_READ = "btrack:read",
  BTRACK_READ_ALL = "btrack:read:all",
  BTRACK_EXPORT = "btrack:export",

  // 用户管理
  USER_READ = "user:read",
  USER_CREATE = "user:create",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",

  // 超级权限
  ALL = "*:*",
}

export interface UserPermissions {
  permissions: string[];
}

export function hasPermission(
  userPermissions: string[],
  requiredPermission: string | string[],
  matchAll: boolean = false
): boolean {
  // 超级权限
  if (userPermissions.includes(Permissions.ALL)) {
    return true;
  }

  const required = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  // 通配符匹配
  for (const userPerm of userPermissions) {
    if (userPerm.includes("*")) {
      const pattern = userPerm.split(":");
      for (const reqPerm of required) {
        const target = reqPerm.split(":");
        if (matchPermissionPattern(pattern, target)) {
          if (!matchAll) return true;
        }
      }
    }
  }

  // 精确匹配
  if (matchAll) {
    return required.every(p => userPermissions.includes(p));
  } else {
    return required.some(p => userPermissions.includes(p));
  }
}

function matchPermissionPattern(pattern: string[], target: string[]): boolean {
  if (pattern.length !== target.length) return false;

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== "*" && pattern[i] !== target[i]) {
      return false;
    }
  }

  return true;
}

// 权限守卫 Hook
export function usePermission(requiredPermission: string | string[]) {
  const user = useUser(); // 假设有个 useUser hook
  const userPermissions = user?.permissions || [];

  return hasPermission(userPermissions, requiredPermission);
}
```

```tsx
// apps/web/app/features/btrack/btrack-page.tsx

import { usePermission } from "~/lib/permissions";
import { Permissions } from "~/lib/permissions";

const BTrackPage = () => {
  const canExport = usePermission(Permissions.BTRACK_EXPORT);
  const canViewAll = usePermission(Permissions.BTRACK_READ_ALL);

  return (
    <div>
      {/* 只有有权限的用户才显示导出按钮 */}
      {canExport && (
        <Button onClick={handleExport}>
          <Download className="h-4 w-4" />
          导出 JSON
        </Button>
      )}

      {/* 根据权限显示不同的数据 */}
      {canViewAll ? (
        <p>显示所有用户的异常记录</p>
      ) : (
        <p>只显示您的异常记录</p>
      )}
    </div>
  );
};
```

## 数据库初始化脚本

### 初始化角色和权限

```python
# apps/api/app/core/init_permissions.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.role import Role, Permission, RolePermission
from app.core.permissions import Permissions, ROLE_PERMISSIONS


async def init_permissions(db: AsyncSession):
    """初始化权限数据"""

    # 1. 创建所有权限
    permission_map = {}

    for attr_name in dir(Permissions):
        if not attr_name.startswith("_"):
            perm_code = getattr(Permissions, attr_name)

            # 检查权限是否已存在
            stmt = select(Permission).where(Permission.code == perm_code)
            result = await db.execute(stmt)
            permission = result.scalar_one_or_none()

            if not permission:
                # 创建权限
                permission = Permission(
                    name=attr_name.replace("_", " ").title(),
                    code=perm_code,
                    description=f"Permission for {perm_code}",
                )
                db.add(permission)
                await db.flush()

            permission_map[perm_code] = permission

    await db.commit()

    # 2. 创建系统角色
    system_roles = {
        "admin": {
            "name": "系统管理员",
            "description": "拥有所有权限，可管理用户、角色、权限",
        },
        "user": {
            "name": "普通用户",
            "description": "基础用户权限，可使用核心功能",
        },
        "guest": {
            "name": "访客",
            "description": "只读权限，用于演示或试用",
        },
        "operator": {
            "name": "运营人员",
            "description": "可查看所有数据，管理异常记录",
        },
    }

    for role_code, role_info in system_roles.items():
        # 检查角色是否已存在
        stmt = select(Role).where(Role.code == role_code)
        result = await db.execute(stmt)
        role = result.scalar_one_or_none()

        if not role:
            # 创建角色
            role = Role(
                name=role_info["name"],
                code=role_code,
                description=role_info["description"],
                is_system=True,
            )
            db.add(role)
            await db.flush()

        # 3. 分配权限给角色
        if role_code in ROLE_PERMISSIONS:
            for perm_code in ROLE_PERMISSIONS[role_code]:
                if perm_code in permission_map:
                    permission = permission_map[perm_code]

                    # 检查角色-权限关联是否已存在
                    stmt = select(RolePermission).where(
                        RolePermission.role_id == role.id,
                        RolePermission.permission_id == permission.id,
                    )
                    result = await db.execute(stmt)
                    role_perm = result.scalar_one_or_none()

                    if not role_perm:
                        role_perm = RolePermission(
                            role_id=role.id,
                            permission_id=permission.id,
                        )
                        db.add(role_perm)

    await db.commit()
    print("✅ 权限系统初始化完成")
```

### 在应用启动时初始化

```python
# apps/api/app/api/main.py

from contextlib import asynccontextmanager
from app.core.init_permissions import init_permissions
from app.core.database import get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化权限
    async for db in get_db():
        await init_permissions(db)
        break

    yield

    # 关闭时清理...


app = FastAPI(lifespan=lifespan)
```

## 扩展新权限

### 步骤 1: 定义权限常量

```python
# apps/api/app/core/permissions.py

class Permissions:
    # ... 现有权限

    # 新增模块权限
    REPORT_READ = "report:read"
    REPORT_EXPORT = "report:export"
    REPORT_SCHEDULE = "report:schedule"
```

### 步骤 2: 分配给角色

```python
# apps/api/app/core/permissions.py

ROLE_PERMISSIONS = {
    "admin": [
        Permissions.ALL,
    ],

    "user": [
        # ... 现有权限
        Permissions.REPORT_READ,  # 新增
    ],

    "operator": [
        # ... 现有权限
        Permissions.REPORT_READ,   # 新增
        Permissions.REPORT_EXPORT, # 新增
    ],
}
```

### 步骤 3: 在路由中使用

```python
# apps/api/app/api/routes/report.py

from app.api.deps import check_permission
from app.core.permissions import Permissions

@router.get("/reports")
async def get_reports(
    current_user: User = Depends(check_permission(Permissions.REPORT_READ)),
    db: AsyncSession = Depends(get_db),
):
    # 实现逻辑...
    pass
```

### 步骤 4: 前端权限判断

```typescript
// apps/web/app/lib/permissions.ts

export enum Permissions {
  // ... 现有权限

  // 报表
  REPORT_READ = "report:read",
  REPORT_EXPORT = "report:export",
  REPORT_SCHEDULE = "report:schedule",
}
```

```tsx
// 在组件中使用
const canExportReport = usePermission(Permissions.REPORT_EXPORT);

{canExportReport && (
  <Button onClick={handleExport}>导出报表</Button>
)}
```

### 步骤 5: 运行初始化脚本

```bash
# 重新运行应用，或执行初始化脚本
pnpm dev:api

# 或手动执行
python -m app.core.init_permissions
```

## 最佳实践

### 1. 权限粒度

- **粗粒度**: 适用于简单系统（如 `thread:manage`）
- **细粒度**: 适用于复杂权限控制（如 `thread:read`, `thread:write`, `thread:delete`）
- **推荐**: 使用细粒度权限，通过角色组合实现灵活控制

### 2. 命名规范

```python
# ✅ 好的命名
"user:read"           # 清晰、简洁
"btrack:export"       # 动作明确
"thread:read:all"     # 层级清晰

# ❌ 不好的命名
"userRead"            # 不符合规范
"get_user"            # 太像函数名
"user_management"     # 不够具体
```

### 3. 权限检查位置

- **后端路由**: 必须检查（安全第一）
- **前端组件**: 应该检查（用户体验）
- **业务逻辑**: 关键操作前检查（深度防御）

### 4. 测试权限

```python
# tests/test_permissions.py

async def test_user_can_read_own_threads():
    # 测试普通用户可以读取自己的会话
    pass

async def test_user_cannot_read_all_threads():
    # 测试普通用户不能读取所有会话
    pass

async def test_admin_can_do_anything():
    # 测试管理员有所有权限
    pass

async def test_guest_has_readonly_access():
    # 测试访客只有只读权限
    pass
```

## 安全注意事项

1. **默认拒绝**: 没有权限时默认拒绝访问
2. **后端验证**: 永远在后端验证权限，前端检查仅用于 UI
3. **最小权限**: 仅授予完成任务所需的最小权限
4. **定期审计**: 定期审查角色和权限分配
5. **系统角色**: 系统角色不可删除，谨慎修改
6. **权限记录**: 记录权限变更日志（建议）

## 附录

### 完整权限列表（按字母序）

```
btrack:export
btrack:read
btrack:read:all
btrack:update
excel:download
excel:preview
excel:process
file:delete
file:download
file:read
file:read:all
file:upload
permission:manage
permission:read
role:assign_permission
role:create
role:delete
role:read
role:update
system:*
system:logs
system:settings
thread:delete
thread:delete:all
thread:read
thread:read:all
thread:update
thread:write
user:assign_role
user:create
user:delete
user:read
user:update
*:*
```

### 角色-权限快速参考

```python
# admin - 超级管理员
["*:*"]

# user - 普通用户
["thread:*", "file:*", "excel:*", "btrack:read"]

# guest - 访客
["thread:read", "excel:preview"]

# operator - 运营人员
["thread:*", "file:*", "excel:*", "btrack:*", "system:logs"]
```

---

**版本**: v1.0
**最后更新**: 2024-01-01
**维护者**: 开发团队
