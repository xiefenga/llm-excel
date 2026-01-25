# 数据库设计方案

## 技术栈

- **数据库**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0+ (异步)
- **驱动**: asyncpg
- **迁移工具**: Alembic
- **认证**: JWT (JSON Web Token)
- **密码加密**: bcrypt (通过 passlib)
- **JWT 库**: python-jose[cryptography]

## 数据模型设计

### 1. User（用户表）

存储用户账户信息。

```python
class User(Base):
    __tablename__ = "users"
    
    # ========== 数据库实际存储的字段（Column）==========
    id: UUID (PK)               # 用户 ID
    email: str (unique)          # 邮箱（唯一，用于登录）
    username: str (unique)        # 用户名（可选，用于显示）
    password: str                # 加密后的密码（bcrypt）
    is_active: bool              # 账户是否激活（默认 True）
    is_superuser: bool           # 是否为超级用户（默认 False）
    
    # 个人信息（可选）
    full_name: str (nullable)     # 全名
    avatar: str (nullable)        # 头像 URL
    
    # 时间戳
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime (nullable)  # 最后登录时间
    
    # ========== Python 层面的关系定义（relationship，不存储在数据库）==========
    # 这些关系通过其他表的外键字段来关联
    # - files: 通过 File.user_id 外键关联（一对多）
    # - conversations: 通过 Conversation.user_id 外键关联（一对多）
    # - refresh_tokens: 通过 RefreshToken.user_id 外键关联（一对多）
    files: List[File]            # 用户上传的文件（关系定义，不存储）
    conversations: List[Conversation]  # 用户创建的会话（关系定义，不存储）
    refresh_tokens: List[RefreshToken]  # 用户的刷新令牌（关系定义，不存储）
```

**数据库表结构**（实际存储）:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    username VARCHAR UNIQUE,
    password VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    full_name VARCHAR,
    avatar VARCHAR,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    last_login_at TIMESTAMP
);
```

**索引**:
- `idx_users_email`: `email` (唯一索引)
- `idx_users_username`: `username` (唯一索引)
- `idx_users_created_at`: `created_at DESC`

**字段说明**:
- `email`: 必填，唯一，用于登录和找回密码
- `username`: 可选，用于显示名称，如果不提供则使用 email 前缀
- `password`: 使用 bcrypt 加密存储，不存储明文密码
- `is_active`: 用于软删除或禁用账户
- `is_superuser`: 用于管理员权限控制

**关系说明**:
- `User.files` 关系：通过 `File` 表中的 `user_id` 外键字段关联，**不存储在 users 表中**
- `User.conversations` 关系：通过 `Conversation` 表中的 `user_id` 外键字段关联，**不存储在 users 表中**
- `User.refresh_tokens` 关系：通过 `RefreshToken` 表中的 `user_id` 外键字段关联，**不存储在 users 表中**

### 2. RefreshToken（刷新令牌表）

存储 JWT 刷新令牌，用于实现 token 刷新机制。

```python
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id: UUID (PK)
    user_id: UUID (FK -> User.id)  # 关联用户
    token: str (unique)             # 刷新令牌（JWT）
    expires_at: datetime           # 过期时间
    is_revoked: bool               # 是否已撤销（默认 False）
    
    # 设备/客户端信息（可选）
    device_info: str (nullable)     # 设备信息（浏览器、IP等）
    user_agent: str (nullable)      # User-Agent
    
    created_at: datetime
    updated_at: datetime
```

**索引**:
- `idx_refresh_tokens_user_id`: `user_id`
- `idx_refresh_tokens_token`: `token` (唯一索引)
- `idx_refresh_tokens_expires_at`: `expires_at` (用于清理过期令牌)

**说明**:
- 刷新令牌有效期通常较长（如 7-30 天）
- 用户登出时可以撤销令牌（设置 `is_revoked = True`）
- 定期清理过期的令牌

### 3. File（文件表）

存储用户上传的 Excel 文件信息。

```python
class File(Base):
    __tablename__ = "files"
    
    # ========== 数据库实际存储的字段（Column）==========
    id: UUID (PK)              # file_id，对应现有的 UUID
    user_id: UUID (FK -> User.id)  # 文件所有者（外键，存储在 files 表中）
    filename: str               # 原始文件名
    file_path: str           # 文件存储路径（相对路径）
    file_size: int              # 文件大小（字节）
    md5: str (unique)            # 文件 MD5 哈希值（用于去重和校验）
    mime_type: str              # MIME 类型
    uploaded_at: datetime       # 上传时间
    created_at: datetime         # 创建时间
    updated_at: datetime         # 更新时间
    
    # ========== Python 层面的关系定义（relationship，不存储在数据库）==========
    # - user: 通过 user_id 外键反向关联到 User（多对一）
    # - conversations: 通过 ConversationFile 关联表关联到 Conversation（多对多）
    user: User                  # 文件所有者（关系定义，不存储）
    conversations: List[Conversation]    # 使用该文件的会话列表（关系定义，不存储）
```

**数据库表结构**（实际存储）:
```sql
CREATE TABLE files (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    file_size INTEGER NOT NULL,
    md5 VARCHAR(32) UNIQUE NOT NULL,
    mime_type VARCHAR,
    uploaded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

**索引**:
- `idx_files_user_id`: `user_id` (外键索引，用于关联查询)
- `idx_files_md5`: `md5` (唯一索引，用于文件去重和校验)
- `idx_files_uploaded_at`: `uploaded_at DESC` (查询最近上传的文件)

**字段说明**:
- `md5`: 文件的 MD5 哈希值（32 位十六进制字符串），用于：
  - 文件去重：相同内容的文件可以共享存储
  - 文件校验：验证文件完整性
  - 快速查找：通过 MD5 快速定位文件

**关系说明**:
- `File.user_id`：**实际存储在 files 表中的外键字段**，关联到 `users.id`
- `File.user`：Python 关系定义，通过 `user_id` 反向查询 User 对象
- `File.conversations`：Python 关系定义，通过 `ConversationFile` 关联表查询关联的会话（多对多关系）

**权限控制**:
- 用户只能访问自己上传的文件（通过 `user_id` 过滤）
- 管理员可以访问所有文件

### 4. ProcessingTask（处理任务表）

存储每次处理请求的完整信息。

```python
class ProcessingTask(Base):
    __tablename__ = "processing_tasks"
    
    # ========== 数据库实际存储的字段（Column）==========
    id: UUID (PK)               # 任务 ID
    user_id: UUID (FK -> User.id)  # 任务创建者（外键，存储在 processing_tasks 表中）
    query: str                   # 用户需求（自然语言）
    status: str                 # 任务状态: pending, processing, completed, failed
    analysis: str (nullable)     # LLM 第一步分析结果（文本）
    operations_json: JSONB       # LLM 第二步生成的 operations JSON
    error_message: str (nullable) # 错误信息
    
    # 时间戳
    created_at: datetime
    started_at: datetime (nullable)
    completed_at: datetime (nullable)
    updated_at: datetime
    
    # ========== Python 层面的关系定义（relationship，不存储在数据库）==========
    # - user: 通过 user_id 外键反向关联到 User（多对一）
    # - files: 通过 TaskFile 关联表关联到 File（多对多）
    # - result: 通过 TaskResult.task_id 外键关联（一对一）
    user: User                  # 任务创建者（关系定义，不存储）
    files: List[File]           # 多对多：任务使用的文件（关系定义，不存储）
    result: TaskResult (1:1)    # 处理结果（关系定义，不存储）
```

**数据库表结构**（实际存储）:
```sql
CREATE TABLE processing_tasks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    status VARCHAR NOT NULL,
    analysis TEXT,
    operations_json JSONB,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);
```

**关系说明**:
- `ProcessingTask.user_id`：**实际存储在 processing_tasks 表中的外键字段**，关联到 `users.id`
- `ProcessingTask.user`：Python 关系定义，通过 `user_id` 反向查询 User 对象
- `ProcessingTask.files`：Python 关系定义，通过 `TaskFile` 关联表`查询关联的 File（多对多关系，需要关联表）
- `ProcessingTask.result`：Python 关系定义，通过 `TaskResult.task_id` 外键关联（一对一关系）

**索引**:
- `idx_tasks_user_id`: `user_id`
- `idx_tasks_status`: `status`
- `idx_tasks_created_at`: `created_at DESC`
- `idx_tasks_files`: 多对多关联表索引

**状态枚举**:
- `pending`: 已创建，等待处理
- `processing`: 正在处理中
- `completed`: 处理完成
- `failed`: 处理失败

## 数据库关系图

```
User (1) ──< (N) File                    [通过 File.user_id 外键]
User (1) ──< (N) Conversation            [通过 Conversation.user_id 外键]
User (1) ──< (N) RefreshToken            [通过 RefreshToken.user_id 外键]

File (1) ──< ConversationFile >── (N) Conversation (1) ──< (N) ConversationTurn (1) ── (1) TurnResult
         [关联表]                        [通过 ConversationTurn.conversation_id 外键]  [通过 TurnResult.turn_id 外键]
```

**关系说明**:

### 一对多关系（通过外键实现）

1. **User → File**（一对多）
   - 存储方式：`File` 表中有 `user_id` 外键字段
   - 一个用户可以有多个文件
   - 查询：`SELECT * FROM files WHERE user_id = :user_id`

2. **User → Conversation**（一对多）
   - 存储方式：`Conversation` 表中有 `user_id` 外键字段
   - 一个用户可以有多个会话
   - 查询：`SELECT * FROM conversations WHERE user_id = :user_id`

3. **User → RefreshToken**（一对多）
   - 存储方式：`RefreshToken` 表中有 `user_id` 外键字段
   - 一个用户可以有多个刷新令牌（多设备登录）
   - 查询：`SELECT * FROM refresh_tokens WHERE user_id = :user_id`

4. **Conversation → ConversationTurn**（一对多）
   - 存储方式：`ConversationTurn` 表中有 `conversation_id` 外键字段
   - 一个会话可以有多轮对话
   - 查询：`SELECT * FROM conversation_turns WHERE conversation_id = :conversation_id ORDER BY turn_number`

### 多对多关系（通过关联表实现）

5. **File ↔ Conversation**（多对多）
   - 存储方式：通过 `ConversationFile` 关联表存储
   - `ConversationFile` 表中有 `file_id` 和 `conversation_id` 两个外键
   - 一个文件可以被多个会话使用
   - 一个会话可以使用多个文件
   - 查询：通过 JOIN `conversation_files` 表

### 一对一关系（通过外键实现）

6. **ConversationTurn → TurnResult**（一对一）
   - 存储方式：`TurnResult` 表中有 `turn_id` 外键字段（唯一约束）
   - 一轮对话对应一个结果
   - 查询：`SELECT * FROM turn_results WHERE turn_id = :turn_id`

**重要说明**:
- **外键字段**（如 `user_id`）是实际存储在数据库表中的列
- **关系定义**（如 `User.files`）只是 SQLAlchemy 的 Python 代码，用于方便查询，**不存储在数据库中**
- 多对多关系需要**关联表**（如 `TaskFile`）来存储关联信息

## SQLAlchemy 关系 vs 数据库存储

### 重要概念区分

在 SQLAlchemy 中，有两种不同的定义：

1. **Column（列）** - 实际存储在数据库中的字段
   - 例如：`user_id: UUID` 会创建一个实际的数据库列
   - 这些字段会出现在 `CREATE TABLE` 语句中

2. **Relationship（关系）** - Python 层面的关系定义，**不存储在数据库中**
   - 例如：`files: List[File]` 只是定义了一个 Python 属性
   - 用于方便地通过 `user.files` 访问关联数据
   - 实际查询时，SQLAlchemy 会通过外键字段自动 JOIN 查询

### 示例说明

```python
class User(Base):
    # ✅ 这些是数据库实际存储的字段
    id: UUID = Column(UUID, primary_key=True)
    email: str = Column(String, unique=True)
    user_id: UUID = Column(UUID, ForeignKey('users.id'))  # ❌ 这个不在 User 表中！
    
    # ❌ 这些关系定义不会存储在数据库中
    files: List[File] = relationship("File", back_populates="user")
    # 实际存储的是 File 表中的 user_id 字段
```

**实际数据库表结构**:
```sql
-- users 表（实际存储）
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    -- 注意：没有 files 字段！
);

-- files 表（实际存储）
CREATE TABLE files (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),  -- ✅ 这里才是实际存储的外键
    filename VARCHAR NOT NULL
);
```

### 关系类型总结

| 关系类型 | 存储方式 | 示例 |
|---------|---------|------|
| **一对多** | 在"多"的一方存储外键 | `File.user_id` → `User.id` |
| **多对一** | 在"多"的一方存储外键 | `ConversationTurn.conversation_id` → `Conversation.id` |
| **一对一** | 在任意一方存储外键（通常在有扩展信息的一方） | `TurnResult.turn_id` → `ConversationTurn.id` |
| **多对多** | 需要关联表存储两个外键 | `ConversationFile.file_id` + `ConversationFile.conversation_id` |

### 查询时的区别

```python
# 方式1：直接通过外键查询（SQL）
session.query(File).filter(File.user_id == user_id).all()

# 方式2：通过关系定义查询（SQLAlchemy 会自动 JOIN）
user = session.get(User, user_id)
files = user.files  # SQLAlchemy 自动执行: SELECT * FROM files WHERE user_id = ?

# 两种方式生成的 SQL 是一样的，但方式2更简洁
```

## 字段类型说明

### JSONB 字段

PostgreSQL 的 JSONB 类型用于存储：
- `operations_json`: LLM 生成的 operations 数组
- `variables`: 执行后的变量值字典
- `new_columns`: 新列数据（嵌套字典结构）
- `formulas`: Excel 公式列表
- `errors`: 错误信息列表

**优势**:
- 支持 JSON 查询和索引
- 数据验证和约束
- 高效的存储和查询

### UUID 主键

所有表使用 UUID v4 作为主键：
- 分布式友好
- 避免 ID 冲突
- 安全性更好（不暴露自增 ID）

## 认证机制

### JWT Token 设计

系统使用 **JWT (JSON Web Token)** 进行认证，包含两种令牌：

1. **Access Token（访问令牌）**
   - 有效期短（如 15 分钟 - 1 小时）
   - 存储在客户端（内存或 localStorage）
   - 用于 API 请求认证
   - 过期后使用 Refresh Token 刷新

2. **Refresh Token（刷新令牌）**
   - 有效期长（如 7-30 天）
   - 存储在数据库（RefreshToken 表）
   - 用于获取新的 Access Token
   - 可以撤销（登出时）

### Token Payload 结构

**Access Token**:
```json
{
  "sub": "user_id (UUID)",
  "email": "user@example.com",
  "is_superuser": false,
  "exp": 1234567890,
  "iat": 1234567890,
  "type": "access"
}
```

**Refresh Token**:
```json
{
  "sub": "user_id (UUID)",
  "token_id": "refresh_token_id (UUID)",
  "exp": 1234567890,
  "iat": 1234567890,
  "type": "refresh"
}
```

### 密码加密

使用 **bcrypt** 算法加密密码：
- 自动生成 salt
- 成本因子（rounds）建议设置为 12
- 使用 `passlib` 库的 `CryptContext`

### API 端点设计

```
POST   /api/auth/register      # 用户注册
POST   /api/auth/login          # 用户登录（返回 access + refresh token）
POST   /api/auth/refresh        # 刷新 access token
POST   /api/auth/logout         # 登出（撤销 refresh token）
GET    /api/auth/me             # 获取当前用户信息
PUT    /api/auth/me             # 更新用户信息
PUT    /api/auth/password       # 修改密码
```

## 查询场景

### 认证相关

#### 1. 用户登录验证
```sql
SELECT id, email, hashed_password, is_active, is_superuser
FROM users
WHERE email = :email;
```

#### 2. 创建刷新令牌
```sql
INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
VALUES (:id, :user_id, :token, :expires_at, NOW());
```

#### 3. 验证刷新令牌
```sql
SELECT rt.*, u.id as user_id, u.email, u.is_superuser
FROM refresh_tokens rt
JOIN users u ON rt.user_id = u.id
WHERE rt.token = :token
  AND rt.is_revoked = false
  AND rt.expires_at > NOW();
```

#### 4. 撤销刷新令牌（登出）
```sql
UPDATE refresh_tokens
SET is_revoked = true, updated_at = NOW()
WHERE token = :token;
```

#### 5. 清理过期令牌
```sql
DELETE FROM refresh_tokens
WHERE expires_at < NOW() - INTERVAL '7 days';
```

### 业务相关

#### 1. 获取用户文件列表
```sql
SELECT * FROM files
WHERE user_id = :user_id
ORDER BY uploaded_at DESC
LIMIT 20;
```

#### 2. 获取用户会话列表（按时间倒序）
```sql
SELECT c.*, COUNT(ct.id) as turn_count
FROM conversations c
LEFT JOIN conversation_turns ct ON c.id = ct.conversation_id
WHERE c.user_id = :user_id
  AND c.status = 'active'
GROUP BY c.id
ORDER BY c.updated_at DESC
LIMIT 20;
```

#### 3. 获取会话详情（包含所有轮次）
```sql
SELECT 
    c.*,
    ct.id as turn_id,
    ct.turn_number,
    ct.user_query,
    ct.status as turn_status,
    ct.analysis,
    ct.created_at as turn_created_at
FROM conversations c
LEFT JOIN conversation_turns ct ON c.id = ct.conversation_id
WHERE c.id = :conversation_id
  AND c.user_id = :user_id  -- 权限验证
ORDER BY ct.turn_number ASC;
```

#### 4. 获取轮次详情（包含结果，验证权限）
```sql
SELECT 
    ct.*,
    tr.variables,
    tr.new_columns,
    tr.formulas,
    tr.output_file
FROM conversation_turns ct
LEFT JOIN turn_results tr ON ct.id = tr.turn_id
JOIN conversations c ON ct.conversation_id = c.id
WHERE ct.id = :turn_id
  AND c.user_id = :user_id;  -- 权限验证
```

#### 5. 查询文件的所有会话（验证权限）
```sql
SELECT c.*
FROM conversations c
JOIN conversation_files cf ON c.id = cf.conversation_id
WHERE cf.file_id = :file_id
  AND c.user_id = :user_id  -- 确保文件属于该用户
ORDER BY c.updated_at DESC;
```

#### 6. 创建新会话（关联文件）
```sql
-- 1. 创建会话
INSERT INTO conversations (id, user_id, title, status, created_at, updated_at)
VALUES (:conversation_id, :user_id, :title, 'active', NOW(), NOW());

-- 2. 关联文件
INSERT INTO conversation_files (id, conversation_id, file_id, created_at)
VALUES 
    (:id1, :conversation_id, :file_id1, NOW()),
    (:id2, :conversation_id, :file_id2, NOW());
```

#### 7. 创建新轮次
```sql
-- 1. 获取下一个轮次号
SELECT COALESCE(MAX(turn_number), 0) + 1 as next_turn_number
FROM conversation_turns
WHERE conversation_id = :conversation_id;

-- 2. 创建轮次
INSERT INTO conversation_turns (
    id, conversation_id, turn_number, user_query, status, created_at, updated_at
)
VALUES (
    :turn_id, :conversation_id, :turn_number, :user_query, 'pending', NOW(), NOW()
);

-- 3. 更新会话更新时间
UPDATE conversations
SET updated_at = NOW()
WHERE id = :conversation_id;
```

#### 8. 获取用户统计信息
```sql
SELECT 
    COUNT(DISTINCT f.id) as file_count,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(DISTINCT ct.id) as turn_count,
    COUNT(DISTINCT CASE WHEN ct.status = 'completed' THEN ct.id END) as completed_turns
FROM users u
LEFT JOIN files f ON u.id = f.user_id
LEFT JOIN conversations c ON u.id = c.user_id
LEFT JOIN conversation_turns ct ON c.id = ct.conversation_id
WHERE u.id = :user_id;
```

## 多轮对话设计说明

### 设计理念

1. **会话（Conversation）**：代表一次完整的对话会话，关联一组文件
   - 用户可以创建多个会话，每个会话处理不同的文件组合
   - 会话可以归档或删除（软删除）

2. **轮次（ConversationTurn）**：代表会话中的一轮完整处理
   - 每轮包含：用户输入 → LLM 分析 → 生成操作 → 执行结果
   - 轮次按 `turn_number` 排序（1, 2, 3...）
   - 后续轮次可以基于前面轮次的结果进行进一步处理

3. **文件关联**：文件在会话创建时关联，所有轮次共享这些文件
   - 如果需要在会话中添加新文件，可以创建新会话或更新关联

### 多轮对话流程

```
用户创建会话（关联文件）
    ↓
第1轮：用户输入 query1 → 分析 → 生成操作 → 执行 → 结果1
    ↓
第2轮：用户输入 query2（可以基于结果1） → 分析 → 生成操作 → 执行 → 结果2
    ↓
第3轮：用户输入 query3（可以基于结果1、结果2） → ...
```

### API 设计建议

```
POST   /api/conversations              # 创建新会话（关联文件）
GET    /api/conversations              # 获取用户会话列表
GET    /api/conversations/:id          # 获取会话详情（包含所有轮次）
PUT    /api/conversations/:id          # 更新会话（标题等）
DELETE /api/conversations/:id          # 删除会话

POST   /api/conversations/:id/turns    # 创建新轮次（处理用户输入）
GET    /api/conversations/:id/turns    # 获取会话的所有轮次
GET    /api/turns/:id                  # 获取轮次详情（包含结果）
```

## 迁移策略

### 现有数据迁移

当前系统使用文件系统存储，需要：
1. 保留现有文件存储结构（向后兼容）
2. 逐步将新数据写入数据库
3. 可选：编写迁移脚本将历史数据导入数据库

## 安全考虑

### 1. 密码安全
- 使用 bcrypt 加密，不存储明文密码
- 密码强度要求（最小长度、复杂度）
- 支持密码重置功能（需要邮箱验证）

### 2. Token 安全
- Access Token 存储在客户端，建议使用 httpOnly cookie（可选）
- Refresh Token 存储在数据库，可以撤销
- Token 过期时间合理设置
- 支持多设备登录（多个 Refresh Token）

### 3. 权限控制
- 用户只能访问自己的数据（文件、任务）
- 使用 FastAPI 的依赖注入实现权限验证
- 支持角色权限（普通用户、管理员）

### 4. 数据隔离
- 所有查询都添加 `user_id` 过滤条件
- 文件存储路径可以包含 `user_id` 目录
- 防止越权访问

### 5. 审计日志
- 记录用户登录/登出时间
- 记录敏感操作（密码修改、文件删除等）
- 可选：添加操作日志表

## 扩展性考虑

### 未来可能添加的表

1. **TaskLog（任务日志表）** - 如果需要详细的操作日志
   ```python
   class TaskLog(Base):
       id: UUID
       task_id: UUID
       action: str  # load, analysis, generate, execute
       status: str  # start, done, error
       message: str
       created_at: datetime
   ```

3. **FileMetadata（文件元数据表）** - 如果需要存储 Excel 表结构信息
   ```python
   class FileMetadata(Base):
       id: UUID
       file_id: UUID
       table_name: str
       schema: JSONB  # 表结构信息
       created_at: datetime
   ```

## 性能优化建议

1. **索引策略**
   - 所有外键字段建立索引
   - 常用查询字段建立索引（status, created_at）
   - JSONB 字段可以建立 GIN 索引（如果需要查询 JSON 内容）

2. **连接池配置**
   - asyncpg 连接池大小：建议 10-20
   - 根据并发量调整

3. **查询优化**
   - 使用 `selectinload` 或 `joinedload` 预加载关联数据
   - 避免 N+1 查询问题

4. **数据清理**
   - 定期清理过期的任务和文件（可配置保留时间）
   - 定期清理过期的刷新令牌
   - 使用数据库的 `ON DELETE CASCADE` 自动清理关联数据

5. **认证优化**
   - 实现 token 黑名单（Redis）用于立即撤销 token
   - 支持 OAuth2 登录（GitHub、Google 等）
   - 支持双因素认证（2FA）

## 依赖库清单

### 认证相关依赖

需要在 `pyproject.toml` 中添加：

```toml
dependencies = [
    # ... 现有依赖 ...
    
    # 数据库
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.29.0",
    "alembic>=1.13.0",
    
    # 认证
    "python-jose[cryptography]>=3.3.0",  # JWT 处理
    "passlib[bcrypt]>=1.7.4",            # 密码加密
    "python-multipart>=0.0.20",          # 表单数据（已有）
]
```

### 环境变量配置

在 `.env` 文件中添加：

```bash
# 数据库配置
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/llm_excel
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# JWT 配置
JWT_SECRET_KEY=your-secret-key-here  # 使用 openssl rand -hex 32 生成
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30   # Access Token 过期时间（分钟）
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7      # Refresh Token 过期时间（天）

# 密码加密
BCRYPT_ROUNDS=12
```
