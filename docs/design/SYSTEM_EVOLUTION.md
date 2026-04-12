# 系统分层与技术演进

> 本文档基于当前仓库实现，梳理 Selgetabel 的现状、主要约束，以及后续可能的技术演进方向。

## 1. 文档目标

这不是一份纯愿景稿，也不是逐文件设计说明。

本文档重点回答 3 个问题：

1. 当前系统实际上已经实现了什么。
2. 当前架构的主要瓶颈在哪里。
3. 如果继续往更可复用、更 agentic 的方向演进，合理的拆分路径是什么。

---

## 2. 当前系统现状

### 2.1 系统分层

当前系统仍然是一个以 FastAPI 为中心的单体应用，但内部已经形成了相对清晰的分层：

```
┌─────────────────────────────────────────────────────────────┐
│                         接口层                               │
│  FastAPI routes / SSE / 鉴权 / 线程与文件入口                │
├─────────────────────────────────────────────────────────────┤
│                         编排层                               │
│  chat.py / intent_service.py / chat_stream.py               │
│  processing_pipeline.py                                     │
├─────────────────────────────────────────────────────────────┤
│                         领域服务层                           │
│  context_service.py / chat_service.py / processor_stream.py │
│  excel.py / thread.py / oss.py                              │
├─────────────────────────────────────────────────────────────┤
│                         引擎层                               │
│  intent_classifier.py / context_builder.py                  │
│  parser.py / executor.py / excel_generator.py               │
│  llm_client.py / llm_providers/                             │
├─────────────────────────────────────────────────────────────┤
│                      存储与基础设施层                        │
│  PostgreSQL / MinIO / LLM provider config / Alembic         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 当前已经实现的关键能力

#### 统一聊天入口

- Web 端目前通过 `/chat` 统一入口进入后端。
- 请求先做意图识别，再分流到聊天/澄清分支或处理分支。
- `chat`、`analysis`、`processing`、`unclear` 四类意图已经存在。

#### 基于 LLM 的意图识别，而不是纯硬编码路由

- 当前意图识别以 `IntentClassifier` 为核心，主路径是 LLM 分类。
- 历史对话、文件继承、表头 schema 提取已经接入 `IntentService`。
- 规则修正仍然存在，但主要是兜底和纠偏，不再是早期那种纯规则分发。

#### 多轮上下文

- 系统已经具备 `Thread / ThreadTurn` 模型。
- 支持历史轮次读取、文件继承、上下文快照保存。
- `ContextService` 会按意图类型构建不同上下文。

#### Excel 处理流水线

- 处理链路已经拆成标准阶段：`load -> generate -> validate -> execute -> export -> complete`。
- SSE 事件流、阶段埋点、步骤持久化已经落地。
- Excel 处理核心仍在同一仓库、同一后端进程内完成。

#### 统一 LLM Provider 抽象

- 当前已经存在统一的 `LLMClient` 和 `ProviderRegistry`。
- 模型调用已经按 `stage` 做路由配置，而不是单一模型全局硬编码。
- 现有 provider 适配层支持扩展，但真实可用 provider 仍然有限。

### 2.3 当前仓库结构

```
llm-excel/
├── apps/
│   ├── api/                 # FastAPI 后端
│   └── web/                 # React Router + Vite 前端
├── docs/
│   ├── design/              # 设计文档
│   ├── specs/               # 协议与数据规格
│   ├── guides/              # 使用说明
│   └── conventions/         # 开发约定
├── docker/                  # 部署与初始化脚本
└── fixtures/                # 示例数据
```

---

## 3. 当前架构的主要问题

### 3.1 Excel 引擎和业务编排仍然强耦合

虽然内部已经有 `engine/`、`services/`、`processor/` 分层，但它们仍然直接运行在当前 FastAPI 应用中。

带来的问题：

- Excel 处理能力无法独立复用。
- CLI / MCP / 外部 Agent 难以直接复用处理核心。
- Web 业务变更和处理引擎变更仍在一个发布单元里。

### 3.2 “analysis” 与 “processing” 还没有形成真正独立的产品边界

当前系统已经识别 `analysis` 意图，但在后端路径上，`analysis` 和 `processing` 仍然共享同一条处理管线。

这意味着：

- “分析但不修改数据”的能力边界还不稳定。
- 后续如果要支持统计分析、报告生成、图表输出，会继续推高现有处理管线复杂度。

### 3.3 当前不是 Agent Orchestrator，只是“LLM 驱动的路由编排”

系统已经比早期规则路由更灵活，但目前仍然是：

1. 先分类意图。
2. 再走预定义分支。

这和真正的 agent 编排还有明显差距：

- 工具选择不是动态的。
- 单次请求通常只会进入一条固定链路。
- 没有多工具决策和组合执行能力。

### 3.4 LLM 基础设施只完成了第一阶段抽象

当前已经有：

- provider 抽象
- stage 路由
- 模型配置来自数据库

但还缺少：

- fallback 策略
- 成本统计
- 限流
- 缓存
- 更完整的 provider 可用性治理

### 3.5 文档与实现容易脱节

过去的部分文档会把“已实现能力”写成“未来计划”，也会把“纯设想”写得像现状。这会导致：

- 团队误判真实完成度
- 重复建设
- 难以确定演进优先级

这份文档的一个目标，就是把这个问题纠正过来。

---

## 4. 演进方向总览

### 4.1 总体原则

后续演进建议遵守以下原则：

| 原则 | 说明 |
|------|------|
| **先解耦，再扩展** | 先把处理核心从 Web/API 业务中拆开，再谈 TUI、MCP、Agent |
| **现状兼容优先** | 新架构不能要求现有 Web 端和现有 `/chat` 入口大改 |
| **分阶段抽离** | 先逻辑抽离，再仓库抽离；先接口稳定，再独立发包 |
| **处理与分析分边界** | 数据变换和统计分析要逐步拆清 |
| **Agent 化渐进演进** | 先 tool 化，再 orchestrator 化，不要一步到位重写 |

### 4.2 目标架构

建议中的目标状态如下：

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户交互层                              │
│  Web / CLI / TUI / MCP / 外部 Agent                            │
├─────────────────────────────────────────────────────────────────┤
│                         编排层                                  │
│  Selgetabel API / Agent Orchestrator / Tool Router             │
├─────────────────────────────────────────────────────────────────┤
│                         能力层                                  │
│  Tablo(数据处理) / Analysis(分析) / Conversation(对话)         │
├─────────────────────────────────────────────────────────────────┤
│                         基础设施层                              │
│  LLM Gateway / DB / OSS / Event / Metrics                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 演进主题一：抽离可复用的数据处理核心

### 5.1 目标

把当前与 Excel 处理强相关的能力，从 API 业务编排中抽出，形成一个可复用的 Python 核心包。

该核心包暂定内部代号为 `Tablo`。

### 5.2 为什么现在值得做

当前后端里已经存在可以抽离的稳定核心：

- JSON 操作解析
- 操作执行
- Excel 公式生成
- 表结构模型
- 处理阶段事件模型

这些能力天然适合被 CLI、测试基准、MCP 工具、未来 agent tool 复用。

### 5.3 抽离边界建议

建议优先抽离以下部分：

#### 适合进入核心包

- `parser.py`
- `executor.py`
- `excel_generator.py`
- 引擎数据模型
- 处理阶段的纯领域类型
- 与文件表格读写直接相关的能力

#### 暂时不要抽离

- FastAPI route
- Thread / Turn 持久化
- 权限、认证、用户、角色
- 依赖数据库的上下文服务
- 与当前产品文案/品牌强绑定的聊天提示词

### 5.4 推荐产物

第一阶段不要直接追求“大而全 SDK”，先拿到这三个产物：

1. 可被当前 API 调用的内部 Python package。
2. 最小 CLI。
3. 面向核心处理的独立测试集。

### 5.5 包结构建议

```
packages/
└── tablo/
    ├── pyproject.toml
    ├── src/tablo/
    │   ├── __init__.py
    │   ├── processor.py
    │   ├── parser.py
    │   ├── executor.py
    │   ├── excel_generator.py
    │   ├── models.py
    │   ├── io.py
    │   └── types.py
    ├── tests/
    └── cli/
```

### 5.6 注意事项

- “零依赖核心”可以作为方向，但不要为了追求绝对零依赖，把现有成熟能力过度拆碎。
- 当前更重要的是“和 FastAPI 业务解耦”，不是“和所有三方库解耦”。

---

## 6. 演进主题二：从意图分流走向 tool 化编排

### 6.1 当前状态

当前系统本质上是：

```python
识别意图 -> 选择固定处理链路 -> 返回结果
```

这是合理的第一阶段，但还不是 agent orchestration。

### 6.2 推荐路径

#### Phase A：先把现有能力 tool 化

不要先上“智能大总管”，而是先把当前已有能力整理成稳定工具边界，例如：

- `process_excel`
- `analyze_excel`
- `answer_general_question`
- `clarify_requirement`

此阶段的编排仍然可以保留当前 `/chat` 统一入口。

#### Phase B：引入单工具 Agent

在保留显式意图分类的前提下，让一个轻量 agent 来决定：

- 是否调用工具
- 调用哪个工具
- 如何组织最终回答

#### Phase C：多工具编排

当 `Tablo` 核心和分析能力边界足够稳定后，再考虑：

- 先分析后处理
- 先澄清再处理
- 多文件多步骤组合

### 6.3 为什么不建议现在直接上完全 Agent 化

- 当前核心能力边界还没有稳定到适合随意组合。
- 处理链路仍然高度依赖现有线程、上下文、SSE 事件模型。
- 如果现在直接替换 `/chat` 主入口，风险高，且很难验证回归。

---

## 7. 演进主题三：LLM Gateway 补全而不是重做

### 7.1 当前已经有的基础

当前系统已经具备一个“轻量 LLM Gateway 雏形”：

- provider registry
- provider adapter
- stage 级路由
- 数据库配置驱动

所以这里不应该被描述为“从零开始设计 LLM Gateway”，而应该是“补齐生产级能力”。

### 7.2 优先补齐的能力

建议按以下顺序推进：

1. **Fallback**
   当主模型不可用或失败时，能按 stage 自动切换备选模型。
2. **可观测性**
   记录 stage、provider、model、耗时、成功率、失败原因。
3. **成本统计**
   至少按 provider / model / stage 聚合。
4. **限流与熔断**
   避免单 provider 故障放大。
5. **缓存**
   仅对适合缓存的场景启用，例如 schema 分析或部分只读问答。

### 7.3 Provider 支持策略

当前 registry 中“声明支持”和“真实可用”并不等价。后续文档和代码都应该明确区分：

- 已实现且可用于生产/开发
- 已登记但仅返回 unsupported
- 计划支持但未实现

---

## 8. 演进主题四：分析能力单独成层

### 8.1 当前状态

系统已经存在 `analysis` 意图，但它还没有形成独立能力层，当前更像是“处理管线的一种入口变体”。

### 8.2 建议方向

把分析能力拆成两个阶段理解：

#### 第一阶段：在当前系统里稳定 analysis 能力

先明确：

- 什么算 analysis
- analysis 是否允许输出文件
- analysis 是否允许生成新 sheet
- analysis 和 processing 的返回格式如何区分

#### 第二阶段：当分析能力足够稳定后，再考虑独立包

如果未来真的需要：

- 描述统计
- 相关性分析
- 回归
- 图表
- 报告生成

再考虑提取为 `tablo-stats` 或其他独立分析包。

### 8.3 当前不建议直接做独立分析包的原因

- analysis 的产品边界还不稳定。
- 当前 analysis 还没有和 processing 真正分流。
- 现在先发包，大概率会把未成熟接口固化下来。

---

## 9. 演进主题五：CLI / TUI / MCP 适配

### 9.1 推荐顺序

不要并行推进所有入口，建议顺序如下：

1. **CLI**
2. **MCP / Tool**
3. **TUI**

### 9.2 原因

#### CLI 最适合作为第一适配层

- 最容易验证核心包是否足够独立。
- 最适合做 benchmark 和批处理。
- 最能暴露核心 API 设计是否合理。

#### MCP / Tool 依赖核心接口先稳定

如果 `Tablo` 还没稳定，过早做 MCP Server 只会把不稳定接口再包装一层。

#### TUI 是体验层，不是解耦层

TUI 很适合展示能力，但对系统解耦帮助不大。它应该在 CLI 或核心包稳定后再做。

### 9.3 推荐目标

#### CLI 示例

```bash
tablo run sales.xlsx "计算销售额并按降序排序" -o output.xlsx
tablo schema sales.xlsx
tablo run input.xlsx "筛选金额大于1000的记录" --stream
```

#### MCP 示例

```python
@app.tool()
async def process_excel(file_path: str, query: str) -> dict:
    ...
```

这里的重点不是接口形式，而是底层必须真正复用同一套处理核心。

---

## 10. 推荐演进路线

### Phase 1：近期

目标：把“当前单体中的核心能力”整理稳定。

1. 明确并更新现状文档，避免继续基于错误基线做设计。
2. 抽离 Excel 处理核心的内部 package 形态。
3. 为核心处理增加更独立的测试与 benchmark。
4. 补齐 LLM Gateway 的 fallback 与基础观测能力。
5. 明确 analysis 与 processing 的边界。

### Phase 2：中期

目标：让处理能力开始被外部复用。

1. 提供最小 CLI。
2. 将核心处理封装成稳定 tool 接口。
3. 在 API 内部引入更轻量的 tool 化编排。
4. 让 analysis 能力真正形成独立输出语义。

### Phase 3：远期

目标：扩展多入口和多工具生态。

1. MCP / Tool 生态接入。
2. TUI。
3. 如有必要，再提取独立统计分析包。
4. 视核心成熟度决定是否引入更完整的 Agent Orchestrator。

---

## 11. 当前结论

Selgetabel 当前最重要的工作，不是“立刻重写成 Agent 系统”，而是：

1. 承认当前已经拥有的能力边界。
2. 先把 Excel 处理核心和产品编排逻辑拆开。
3. 在此基础上再扩展 CLI、MCP、TUI 和更 agentic 的编排模式。

换句话说，下一阶段的关键词应该是：

**解耦、稳定、复用。**

而不是：

**重写、推倒、一步到位。**

---

## 12. 参考方向

- [browser-use](https://github.com/browser-use/browser-use) - CLI + Python SDK 的产品化参考
- [Textual](https://github.com/Textualize/textual) - Python TUI 框架
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP 规范
