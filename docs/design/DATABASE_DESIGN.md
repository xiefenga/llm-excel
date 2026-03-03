# 数据库设计方案

## 技术栈

- **数据库**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0+ (异步)
- **驱动**: asyncpg
- **迁移工具**: Alembic
- **认证**: JWT + bcrypt (passlib)

---

## 数据模型

### 关系图

```
User (1) ──< (N) Account                 [Account.user_id]
User (N) ──< UserRole >── (N) Role (N) ──< RolePermission >── (N) Permission
User (1) ──< (N) File                    [File.user_id]
User (1) ──< (N) Thread                  [Thread.user_id]
User (1) ──< (N) RefreshToken            [RefreshToken.user_id]

File (N) ──< TurnFile >── (N) ThreadTurn (N) ──< (1) Thread
ThreadTurn (1) ── (1) TurnResult         [TurnResult.turn_id UNIQUE]
```

**关系类型总结：**

| 关系类型 | 存储方式             | 示例                            |
| -------- | -------------------- | ------------------------------- |
| 一对多   | "多"方存储外键       | `File.user_id` → `User.id`     |
| 多对多   | 关联表存储两个外键   | `TurnFile(turn_id, file_id)`    |
| 一对一   | 外键 + UNIQUE 约束   | `TurnResult.turn_id` → `ThreadTurn.id` |

---

### 1. users（用户表）

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    avatar VARCHAR,
    status SMALLINT NOT NULL DEFAULT 0,  -- 0:正常, 1:禁用
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    last_login_at TIMESTAMP
);
```

**索引**: `username` (UNIQUE), `created_at DESC`, `status`

---

### 2. accounts（登录账户表）

支持多种登录方式（邮箱密码、GitHub OAuth 等）。设计参考 [better-auth](https://www.better-auth.com/)。

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    account_id VARCHAR NOT NULL,           -- 第三方唯一标识（credentials 时为邮箱）
    provider_id VARCHAR NOT NULL,          -- 登录方式: credentials, github, google...
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT,                     -- OAuth access token
    refresh_token TEXT,                    -- OAuth refresh token
    id_token TEXT,                         -- OIDC id token
    access_token_expires_at TIMESTAMP,
    refresh_token_expires_at TIMESTAMP,
    scope VARCHAR,
    password VARCHAR,                      -- 仅 credentials 时使用，bcrypt 加密
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE(provider_id, account_id)
);
```

**索引**: `user_id`, `(provider_id, account_id)` (UNIQUE), `provider_id`

一个用户可有多个账户（多种登录方式），同一 `(provider_id, account_id)` 唯一。

---

### 3. roles（角色表）

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,          -- 角色名称（显示用）
    code VARCHAR UNIQUE NOT NULL,          -- 角色代码（程序识别，如 "admin"）
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,       -- 系统角色不可删除
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

**索引**: `name` (UNIQUE), `code` (UNIQUE), `is_system`

预定义角色：`admin`（管理员）、`user`（普通用户）、`guest`（访客）、`operator`（运营）。角色权限详见 [PERMISSION_DESIGN.md](./PERMISSION_DESIGN.md)。

---

### 4. permissions（权限表）

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,                 -- 权限名称（显示用）
    code VARCHAR UNIQUE NOT NULL,          -- 权限代码（如 "file:read"）
    description TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

**索引**: `code` (UNIQUE)

权限代码格式 `resource:action`，详见 [PERMISSION_DESIGN.md](./PERMISSION_DESIGN.md)。

---

### 5. user_roles（用户-角色关联表）

```sql
CREATE TABLE user_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, role_id)
);
```

**索引**: `user_id`, `role_id`

---

### 6. role_permissions（角色-权限关联表）

```sql
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL,
    UNIQUE(role_id, permission_id)
);
```

**索引**: `role_id`, `permission_id`

---

### 7. refresh_tokens（刷新令牌表）

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR UNIQUE NOT NULL,         -- JWT 刷新令牌
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    device_info VARCHAR,                   -- 设备信息（可选）
    user_agent VARCHAR,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

**索引**: `user_id`, `token` (UNIQUE), `expires_at`（清理过期令牌）

---

### 8. files（文件表）

存储用户上传的 Excel 文件信息，实际文件存放在 MinIO。

```sql
CREATE TABLE files (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR NOT NULL,             -- 原始文件名
    file_path VARCHAR NOT NULL,            -- MinIO 存储路径
    file_size INTEGER NOT NULL,            -- 字节数
    md5 VARCHAR(32) UNIQUE NOT NULL,       -- 文件去重 + 校验
    mime_type VARCHAR,
    uploaded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

**索引**: `user_id`, `md5` (UNIQUE), `uploaded_at DESC`

---

### 9. threads（线程表）

一个线程包含多轮对话。

```sql
CREATE TABLE threads (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR,                         -- 可选，自动生成或用户自定义
    status VARCHAR NOT NULL DEFAULT 'active',  -- active | archived | deleted
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL          -- 最后一条消息的时间
);
```

**索引**: `user_id`, `status`, `updated_at DESC`

---

### 10. thread_turns（线程消息表）

每条记录代表用户发送的一条消息及其完整处理结果。

```sql
CREATE TABLE thread_turns (
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,          -- 消息序号（线程内递增）
    user_query TEXT NOT NULL,              -- 用户自然语言需求
    status VARCHAR NOT NULL,               -- pending | processing | completed | failed
    operations_json JSONB,                 -- LLM 生成的 operations JSON
    error_message TEXT,
    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,                  -- 开始处理时间
    completed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE(thread_id, turn_number)
);
```

**索引**: `thread_id`, `(thread_id, turn_number)` (UNIQUE), `status`, `created_at DESC`

**重要**：文件关联到每条消息（而非线程），这样每轮对话可以使用不同的文件组合。

---

### 11. turn_results（轮次结果表）

与 thread_turns 一对一关系。

```sql
CREATE TABLE turn_results (
    id UUID PRIMARY KEY,
    turn_id UUID UNIQUE NOT NULL REFERENCES thread_turns(id) ON DELETE CASCADE,
    variables JSONB,                       -- aggregate/compute 产生的变量值
    new_columns JSONB,                     -- add_column 产生的新列数据（前10行预览）
    formulas JSONB,                        -- Excel 公式列表
    output_file VARCHAR,                   -- 输出文件名
    output_file_path VARCHAR,              -- 输出文件路径
    errors JSONB,                          -- 执行错误列表
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

**索引**: `turn_id` (UNIQUE)

---

### 12. turn_files（消息-文件关联表）

```sql
CREATE TABLE turn_files (
    id UUID PRIMARY KEY,
    turn_id UUID NOT NULL REFERENCES thread_turns(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL,
    UNIQUE(turn_id, file_id)
);
```

**索引**: `turn_id`, `file_id`

---

## JSONB 字段说明

PostgreSQL 的 JSONB 类型用于存储结构化数据：

| 字段              | 内容                     |
| ----------------- | ------------------------ |
| `operations_json` | LLM 生成的 operations 数组 |
| `variables`       | 执行后的变量值字典       |
| `new_columns`     | 新列数据（嵌套字典）     |
| `formulas`        | Excel 公式列表           |
| `errors`          | 错误信息列表             |

所有表使用 UUID v4 作为主键（分布式友好、安全性好）。

---

## 认证机制

### JWT Token 设计

| 令牌类型      | 有效期         | 存储位置     | 用途               |
| ------------- | -------------- | ------------ | ------------------ |
| Access Token  | 15分钟 - 1小时 | 客户端       | API 请求认证       |
| Refresh Token | 7 - 30天       | 数据库       | 刷新 Access Token  |

**Access Token Payload**:

```json
{
  "sub": "user_id (UUID)",
  "username": "username",
  "roles": ["user", "admin"],
  "exp": 1234567890,
  "type": "access"
}
```

**Refresh Token Payload**:

```json
{
  "sub": "user_id (UUID)",
  "token_id": "refresh_token_id (UUID)",
  "exp": 1234567890,
  "type": "refresh"
}
```

### 认证 API

```
POST   /api/auth/register        # 注册（创建 User + Account）
POST   /api/auth/login            # 登录（返回 access + refresh token）
POST   /api/auth/refresh          # 刷新 access token
POST   /api/auth/logout           # 登出（撤销 refresh token）
GET    /api/auth/me               # 当前用户信息（含角色和权限）
PUT    /api/auth/me               # 更新用户信息
PUT    /api/auth/password         # 修改密码
POST   /api/auth/bind-account     # 绑定新登录方式
```

---

## 安全考虑

- **密码安全**: bcrypt 加密，cost factor 12，不存明文
- **Token 安全**: Access Token 短期有效，Refresh Token 可撤销，支持多设备登录
- **数据隔离**: 所有查询添加 `user_id` 过滤，防止越权访问
- **权限控制**: RBAC 模型，详见 [PERMISSION_DESIGN.md](./PERMISSION_DESIGN.md)

---

## 性能优化

- 所有外键字段建立索引
- 常用查询字段（status, created_at）建立索引
- asyncpg 连接池大小建议 10-20
- 使用 `selectinload` / `joinedload` 避免 N+1 查询
- 定期清理过期的 refresh_tokens 和软删除数据
- `ON DELETE CASCADE` 自动清理关联数据
