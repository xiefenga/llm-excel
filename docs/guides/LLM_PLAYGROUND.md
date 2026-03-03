# LLM Playground

## 概述

LLM Playground 是一个用于测试 Provider 连通性和模型调用的调试页面，主要用于内网环境验证 Provider是否正常工作。重点是完整展示错误信息，方便定位问题。

## 访问入口

- 管理控制台 → LLM Playground 卡片 → `/admin/llm-test`
- Provider 详情页 → 顶部 Playground 按钮 → `/admin/llm-test?provider={id}`

## 架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                             │
│                                                                     │
│  /admin/llm-test                                                    │
│  ┌──────────────────┐  ┌──────────────────────────────────────────┐ │
│  │   ConfigPanel     │  │           ChatPanel                     │ │
│  │                   │  │                                         │ │
│  │  ▸ Provider 选择  │  │  ┌─────────────────────────────────┐   │ │
│  │  ▸ Model 选择     │  │  │  user: 你好                     │   │ │
│  │  ▸ Temperature    │  │  │  assistant: 你好！有什么...      │   │ │
│  │  ▸ Max Tokens     │  │  │  ┌─ error ──────────────────┐   │   │ │
│  │                   │  │  │  │ ⚠ HTTP 502: connect...   │   │   │ │
│  │                   │  │  │  └──────────────────────────┘   │   │ │
│  │                   │  │  └─────────────────────────────────┘   │ │
│  │                   │  │  ┌─────────────────────────────────┐   │ │
│  │                   │  │  │  输入消息...          [■] [➤]   │   │ │
│  │                   │  │  └─────────────────────────────────┘   │ │
│  └──────────────────┘  └──────────────────────────────────────────┘ │
│           │                           │                             │
└───────────┼───────────────────────────┼─────────────────────────────┘
            │  useProviders()           │  fetch SSE
            │  useModels()              │
            ▼                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                                │
│                                                                     │
│  POST /api/llm/providers/{provider_id}/test                         │
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────────┐ │
│  │  查询 DB     │───▸│ 构造 Config  │───▸│   ProviderRegistry     │ │
│  │             │    │              │    │                        │ │
│  │ • Provider  │    │ LLMProvider  │    │  get_adapter(config)   │ │
│  │ • Credential│    │   Config     │    │    │                   │ │
│  │ • decrypt   │    │              │    │    ├▸ OpenAIProvider    │ │
│  │             │    │              │    │    └▸ Unsupported...   │ │
│  └─────────────┘    └──────────────┘    └──────────┬─────────────┘ │
│                                                     │               │
│                                          adapter.stream(request)    │
│                                          adapter.complete(request)  │
│                                                     │               │
│                                                     ▼               │
│                                         SSE events:                 │
│                                           event: delta  → 增量内容  │
│                                           event: done   → 完整内容  │
│                                           event: error  → 错误信息  │
└─────────────────────────────────────────────────────────────────────┘
```

## Playground vs 系统内部调用

Playground 和系统 Excel 处理流程**共享同一套 Provider 适配器**，区别仅在配置来源：

```
                    ┌──────────────────────────┐
                    │    ProviderRegistry       │
                    │                          │
                    │  get_adapter(config)      │
                    │    ├─ OpenAIProvider      │
                    │    └─ UnsupportedProvider │
                    └────────────▲─────────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
         Playground 调用    Excel 处理流程       │
                  │              │              │
    ┌─────────────┴───┐  ┌──────┴──────────┐   │
    │ test_provider() │  │ llm_client.py   │   │
    │                 │  │                 │   │
    │ DB 查 Provider  │  │ DB 查 StageRoute│   │
    │ DB 查 Credential│  │ → Provider      │   │
    │ 解密 api_key    │  │ → Credential    │   │
    │ 组装 Config     │  │ 解密 → Config   │   │
    └─────────────────┘  └─────────────────┘   │
                                               │
    ┌──────────────────────────────────────────┘
    │
    │  共享部分：
    │    • LLMProviderConfig  — 统一配置结构
    │    • LLMRequest         — 统一请求结构
    │    • LLMResponse        — 统一响应结构
    │    • LLMStreamChunk     — 统一流式块结构
    │    • Provider 适配器实例缓存 (_cache)
```

## 涉及文件

### Backend — `apps/api/app/engine/llm_providers/`

```
llm_providers/
├── __init__.py            # 公共导出
├── base.py                # 抽象接口 LLMProvider
├── types.py               # 数据类型 (LLMProviderConfig, LLMRequest, ...)
├── registry.py            # ProviderRegistry — 按 type 分发并缓存 adapter
└── adapters/              # 具体适配器实现
    ├── __init__.py
    ├── openai.py           # OpenAIProvider
    └── unsupported.py      # UnsupportedProvider
```

> `engine/llm_types.py` 保留为 re-export shim，外部消费者 import 不受影响。

| 文件 | 说明 |
|------|------|
| `apps/api/app/api/routes/llm.py` | 后端测试端点 `POST /providers/{id}/test` |
| `apps/api/app/engine/llm_providers/registry.py` | Provider 注册表（共享） |
| `apps/api/app/engine/llm_providers/base.py` | Provider 抽象接口（共享） |
| `apps/api/app/engine/llm_providers/types.py` | 类型定义（共享） |
| `apps/api/app/engine/llm_providers/adapters/openai.py` | OpenAI 适配器 |

### Frontend

| 文件 | 说明 |
|------|------|
| `apps/web/app/routes/_auth._app.admin.llm-test.tsx` | 路由入口 |
| `apps/web/app/features/admin/llm/playground/index.tsx` | 主页面组件 |
| `apps/web/app/features/admin/llm/playground/config-panel.tsx` | 配置面板 |
| `apps/web/app/features/admin/llm/playground/chat-panel.tsx` | 对话面板 |
| `apps/web/app/features/admin/llm/provider-header.tsx` | Provider 详情页跳转按钮 |
| `apps/web/app/features/admin/admin-page.tsx` | 管理控制台入口卡片 |
