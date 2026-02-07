# BTrack 导出格式说明

## 概述

BTrack 导出功能将系统中记录的所有异常数据导出为标准 **JSON** 格式。这种格式便于内网管理员收集异常数据，并在互联网环境快速复现 bug。

**注意**: 此功能仅供管理员使用，导出所有用户的异常记录。

## 导出格式

### 文件格式

- **格式**: JSON (标准 JSON 数组)
- **编码**: UTF-8
- **扩展名**: `.json`
- **MIME 类型**: `application/json`

### 数据结构

导出文件是一个 JSON 数组，每个元素是一条异常记录：

```json
[
  {
    "btrack_id": "uuid",
    "created_at": "2024-01-01T12:00:00Z",
    "fixed": false,
    "reporter": {
      "id": "uuid",
      "username": "用户名",
      "avatar": "头像URL"
    },
    "turn": {
      "id": "uuid",
      "thread_id": "uuid",
      "turn_number": 1,
      "user_query": "用户的原始需求描述",
      "status": "error",
      "steps": [
        {
          "step": "load",
          "status": "done",
          "output": {...},
          "started_at": "2024-01-01T12:00:01Z",
          "completed_at": "2024-01-01T12:00:02Z"
        },
        {
          "step": "generate",
          "status": "error",
          "output": {...},
          "started_at": "2024-01-01T12:00:03Z",
          "completed_at": "2024-01-01T12:00:04Z"
        }
      ],
      "created_at": "2024-01-01T12:00:00Z",
      "started_at": "2024-01-01T12:00:01Z",
      "completed_at": "2024-01-01T12:00:10Z",
      "files": [
        {
          "id": "uuid",
          "filename": "test.xlsx",
          "file_size": 12345,
          "md5": "abc123",
          "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      ]
    },
    "generation_prompt": "LLM 生成操作时使用的提示词",
    "errors": [
      "错误信息1",
      "错误信息2"
    ]
  }
]
```

## 字段说明

### 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `btrack_id` | string | BTrack 记录的唯一标识符 |
| `created_at` | string (ISO 8601) | 异常记录创建时间 |
| `fixed` | boolean | 是否已修复 |
| `reporter` | object | 报告用户信息 |
| `turn` | object | 关联的执行轮次完整信息 |
| `generation_prompt` | string | LLM 生成操作时使用的提示词 |
| `errors` | array | 错误信息列表 |

### reporter 对象

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 用户 ID |
| `username` | string | 用户名 |
| `avatar` | string | 用户头像 URL |

### turn 对象

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | Turn ID |
| `thread_id` | string | 所属线程 ID |
| `turn_number` | integer | 轮次编号 |
| `user_query` | string | 用户的原始需求描述 |
| `status` | string | 执行状态 (如 "error", "completed") |
| `steps` | array | 执行步骤的完整历史（数据库原样数据） |
| `created_at` | string (ISO 8601) | Turn 创建时间 |
| `started_at` | string (ISO 8601) | 开始执行时间 |
| `completed_at` | string (ISO 8601) | 完成时间 |
| `files` | array | 关联的文件列表 |

### steps 数组

每个 step 对象包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| `step` | string | 步骤名称 (如 "load", "analysis", "generate", "execute") |
| `status` | string | 步骤状态 (如 "start", "done", "error") |
| `output` | object | 步骤输出数据 |
| `started_at` | string (ISO 8601) | 步骤开始时间 |
| `completed_at` | string (ISO 8601) | 步骤完成时间 |

### files 数组

每个 file 对象包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 文件 ID |
| `filename` | string | 文件名 |
| `file_size` | integer | 文件大小（字节） |
| `md5` | string | 文件 MD5 哈希值 |
| `mime_type` | string | MIME 类型 |

## 使用方法

### 导出数据

1. 访问 BTrack 页面（仅管理员可访问）
2. 点击右上角的 "导出 JSON" 按钮
3. 浏览器会自动下载 `btracks_export_YYYYMMDD_HHMMSS.json` 文件

**注意**: 导出功能会导出所有用户的异常记录，不限制当前登录用户。

### 筛选导出

可以通过 API 参数筛选导出的数据：

```bash
# 只导出未修复的异常
GET /api/btracks/export?fixed=false

# 只导出已修复的异常
GET /api/btracks/export?fixed=true

# 导出所有异常（默认）
GET /api/btracks/export
```

### 读取导出文件

#### Python 示例

```python
import json

# 读取整个 JSON 文件
with open('btracks_export_20240101_120000.json', 'r', encoding='utf-8') as f:
    records = json.load(f)

# 遍历所有记录
for record in records:
    print(f"BTrack ID: {record['btrack_id']}")
    print(f"Reporter: {record['reporter']['username']}")
    print(f"User Query: {record['turn']['user_query']}")
    print(f"Errors: {record['errors']}")
    print("---")

# 筛选特定用户的记录
user_records = [r for r in records if r['reporter']['username'] == 'user1']

# 统计未修复的异常数量
unfixed_count = sum(1 for r in records if not r['fixed'])
print(f"未修复异常数量: {unfixed_count}")
```

#### 使用 jq 工具

```bash
# 查看所有错误信息
cat btracks_export_20240101_120000.json | jq '.[].errors'

# 筛选特定用户的记录
cat btracks_export_20240101_120000.json | jq '.[] | select(.reporter.username == "user1")'

# 统计每个用户的异常数量
cat btracks_export_20240101_120000.json | jq 'group_by(.reporter.username) | map({user: .[0].reporter.username, count: length})'

# 查看未修复的异常
cat btracks_export_20240101_120000.json | jq '.[] | select(.fixed == false)'

# 提取所有用户查询
cat btracks_export_20240101_120000.json | jq '.[].turn.user_query'

# 查看执行步骤
cat btracks_export_20240101_120000.json | jq '.[0].turn.steps'
```

#### JavaScript 示例

```javascript
// 在浏览器或 Node.js 中读取
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('btracks_export_20240101_120000.json', 'utf-8'));

// 按用户分组
const byUser = data.reduce((acc, record) => {
  const username = record.reporter.username;
  if (!acc[username]) acc[username] = [];
  acc[username].push(record);
  return acc;
}, {});

console.log('用户异常统计:', Object.keys(byUser).map(user => ({
  user,
  count: byUser[user].length
})));

// 查找包含特定错误的记录
const specificError = data.filter(r =>
  r.errors.some(e => e.includes('KeyError'))
);
```

## 复现 Bug 流程

1. **收集数据**: 内网用户导出 JSONL 文件
2. **传输数据**: 将文件传输到互联网环境
3. **分析数据**: 使用 jq 或 Python 脚本分析异常模式
4. **准备测试数据**: 根据 `turn.files` 中的文件信息准备测试文件
5. **复现问题**: 使用 `turn.user_query` 和测试文件在开发环境复现
6. **查看详细步骤**: 检查 `turn.steps` 了解执行流程和失败点
7. **修复验证**: 修复后标记 `fixed = true`

## 注意事项

1. **权限控制**: 此功能仅供管理员使用，导出所有用户的异常记录
2. **数据隐私**: 导出文件包含所有用户的查询和文件信息，请妥善保管
3. **文件大小**: 如果异常记录很多，导出文件可能较大
4. **编码问题**: 确保使用 UTF-8 编码读取文件
5. **时区**: 所有时间戳使用 UTC 时区（ISO 8601 格式）
6. **文件缺失**: 导出数据不包含实际的 Excel 文件内容，只包含文件元信息（文件名、大小、MD5）
7. **JSON 格式**: 使用标准 JSON 数组格式，便于一次性加载和处理所有数据

## 版本历史

- **v1.1** (2024-01-01): 改用标准 JSON 格式，导出所有用户数据（管理员功能）
- **v1.0** (2024-01-01): 初始版本，JSONL 格式
