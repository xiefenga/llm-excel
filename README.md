# LLM Excel 数据处理系统

使用 LLM 辅助生成 Excel 数据处理规则的系统。

## 项目结构

```
llm-excel/
├── apps/
│   └── api/                    # Python FastAPI 后端
│       ├── main.py             # FastAPI 应用入口
│       ├── models.py           # 数据模型
│       ├── executor.py         # 执行引擎
│       ├── parser.py           # JSON 解析器
│       ├── functions.py        # 函数实现
│       ├── excel_parser.py     # Excel 解析
│       ├── excel_generator.py  # Excel 公式生成
│       ├── llm_client.py       # LLM 客户端
│       ├── prompt.py           # 提示词
│       ├── SPEC.md             # 技术规范
│       └── data/               # 示例数据
├── package.json                # 根 package.json
├── pnpm-workspace.yaml         # pnpm 工作区配置
└── turbo.json                  # Turbo 配置
```

## 快速开始

### 1. 安装依赖

```bash
# 安装 Python 依赖
cd apps/api
uv sync
```

### 2. 配置环境变量

```bash
cd apps/api
cp env.example .env
# 编辑 .env 文件，设置 OPENAI_API_KEY
```

### 3. 启动服务

```bash
cd apps/api
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 健康检查 |
| POST | `/upload` | 上传 Excel 文件 |
| POST | `/analyze` | 第一步：需求分析 |
| POST | `/generate` | 第二步：生成操作描述 |
| POST | `/execute` | 第三步：执行操作 |
| POST | `/process` | 一键处理（完整流程） |
| GET | `/download/{filename}` | 下载结果文件 |
| DELETE | `/session/{session_id}` | 删除会话 |

## 使用流程

### 方式一：分步调用

```bash
# 1. 上传文件
curl -X POST http://localhost:8000/upload \
  -F "files=@data/贴现发生额明细.xlsx" \
  -F "files=@data/卖断发生额明细.xlsx"

# 返回 session_id 和表结构

# 2. 需求分析
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"session_id": "xxx", "requirement": "检查票据是否已卖断"}'

# 3. 生成操作（可加入用户反馈）
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"session_id": "xxx", "requirement": "...", "analysis": "...", "user_feedback": "可选"}'

# 4. 执行操作
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{"session_id": "xxx", "operations_json": "..."}'

# 5. 下载结果
curl -O http://localhost:8000/download/output_xxx.xlsx
```

### 方式二：一键处理

```bash
# 上传文件后直接一键处理
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{"session_id": "xxx", "requirement": "检查票据是否已卖断"}'
```

## 核心功能

### 两步 LLM 流程

1. **需求分析**：LLM 理解用户需求，给出操作步骤（Excel 公式形式）
2. **生成操作**：基于分析结果，生成结构化 JSON 操作描述

### 支持的操作类型

| 操作类型 | 说明 | 输出 |
|----------|------|------|
| `aggregate` | 整列聚合 | 单个值 |
| `add_column` | 新增计算列 | 新的一列 |
| `compute` | 标量运算 | 单个值 |

### 支持的函数

- **聚合函数**：SUM, COUNT, AVERAGE, MIN, MAX, SUMIF, COUNTIF
- **行级函数**：IF, AND, OR, COUNTIFS, VLOOKUP, IFERROR, ROUND, LEFT, RIGHT...
- **标量函数**：ROUND, ABS, MAX, MIN

## 技术栈

- **后端**：Python 3.11+, FastAPI, Pandas
- **LLM**：OpenAI API (兼容接口)
- **构建**：uv, pnpm, turbo

## 开发

```bash
# API 文档
http://localhost:8000/docs

# 重新生成依赖锁
cd apps/api && uv lock
```
