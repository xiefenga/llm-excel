# LLM 多 Provider 设计方案（全局配置 + 阶段路由）

## 1. 背景与现状

目前后端 LLM 调用完全依赖 OpenAI SDK，配置通过 `.env` 提供 `OPENAI_*`，无法做到多厂商或按阶段选择模型。`LLMClient` 中直接创建 OpenAI 客户端并调用 `chat.completions`，其他模块（如线程标题）直接调用私有方法 `_call_llm`。这导致：

- 只能接 OpenAI 或 OpenAI 兼容 API
- 无法动态选择 provider 或模型
- 配置无法在运行期变更（依赖 `.env`）
- 对扩展厂商与运维管理不友好

本方案将 LLM 调用抽象为 Provider 层，把配置迁移到数据库，并引入全局阶段级路由。

## 2. 目标与范围

### 2.1 目标

- 支持主流厂商：OpenAI、Anthropic、Google、Azure OpenAI、DeepSeek、Qwen、Zhipu、OpenAI 兼容
- 配置与密钥全部落库（`.env` 仅保留 DB 与加密密钥）
- 调用时由 **provider_id + model_id** 决定最终调用
- 支持 **阶段级路由**（analyze / generate / title）
- 保持现有业务流程不变（ExcelProcessor、Stage 等无感）

### 2.2 非目标（暂不实现）

- 自定义 Provider 的实现（通过新增 adapter 实现，当前不提供通用模板）
- 用户级、线程级、租户级路由（先全局）
- 自动负载均衡或多模型并行融合

## 3. 术语

- **Provider**：LLM 厂商或兼容 API 服务（OpenAI、Anthropic 等）
- **Model**：具体模型标识（如 gpt-4o、claude-3-5-sonnet）
- **Stage**：业务处理阶段（analyze / generate / title / default）
- **Route**：阶段路由规则（stage → provider + model）

## 4. 目标架构

```
业务流程
  └─ LLMClient
       └─ LLMRouter（按阶段选择 provider/model）
            └─ ProviderRegistry（provider_type -> adapter）
                 └─ ProviderAdapter（OpenAI/Anthropic/...）
```

关键点：

- `LLMClient` 只负责 prompt 组织与调用接口，不关心具体厂商
- `LLMRouter` 从数据库读取阶段路由
- `ProviderAdapter` 负责具体 SDK/HTTP 调用

## 5. 数据库设计

### 5.1 表：llm_providers

| 字段         | 类型          | 说明                          |
| ------------ | ------------- | ----------------------------- |
| id           | UUID / BIGINT | 主键                          |
| name         | varchar       | 显示名称                      |
| type         | varchar       | provider 类型（见 7.1）       |
| base_url     | varchar       | 可选，兼容 API 或自建         |
| status       | smallint      | 0=disabled / 1=enabled        |
| capabilities | jsonb         | streaming/json_mode/vision 等 |
| created_at   | timestamp     | 创建时间                      |
| updated_at   | timestamp     | 更新时间                      |

约束/索引：

- `type` 索引
- `status` 索引

### 5.2 表：llm_models

| 字段        | 类型          | 说明                                |
| ----------- | ------------- | ----------------------------------- |
| id          | UUID / BIGINT | 主键                                |
| provider_id | FK            | 关联 provider                       |
| name        | varchar       | 显示名                              |
| model_id    | varchar       | 厂商真实模型 ID                     |
| limits      | jsonb         | max_tokens/rpm/tpm 等               |
| defaults    | jsonb         | temperature/top_p/extra_body 默认值 |
| status      | smallint      | 0=disabled / 1=enabled / 2=deprecated |
| created_at  | timestamp     | 创建时间                            |
| updated_at  | timestamp     | 更新时间                            |

约束/索引：

- `(provider_id, model_id)` 唯一
- `status` 索引

说明：
- `llm_models.id` 是内部主键
- `llm_models.model_id` 是厂商模型标识（如 gpt-4o）

### 5.3 表：llm_credentials

| 字段         | 类型          | 说明                              |
| ------------ | ------------- | --------------------------------- |
| id           | UUID / BIGINT | 主键                              |
| provider_id  | FK            | 关联 provider                     |
| secret_type  | varchar       | api_key / oauth / service_account |
| secret_value | text          | 加密存储                          |
| meta         | jsonb         | 额外字段（如 org_id）             |
| status       | smallint      | 0=disabled / 1=enabled          |
| created_at   | timestamp     | 创建时间                          |
| updated_at   | timestamp     | 更新时间                          |

约束/索引：

- `(provider_id, status)` 索引

### 5.4 表：llm_stage_routes（全局阶段路由）

| 字段        | 类型      | 说明                                 |
| ----------- | --------- | ------------------------------------ |
| stage       | varchar   | analyze / generate / title / default |
| provider_id | FK        | 目标 provider                        |
| model_id    | FK        | 目标 model                           |
| is_active   | bool      | 是否启用                             |
| created_at  | timestamp | 创建时间                             |
| updated_at  | timestamp | 更新时间                             |

约束/索引：

- `stage` 唯一（全局只有一条生效路由）

## 6. 路由策略（全局 + 阶段级）

优先级：

1. 选择与当前 stage 匹配的 route（如 analyze）
2. 若不存在或 inactive，回退到 `default`
3. 若 provider/model 被禁用，直接报错（推荐）或再回退 default

说明：

- 目前只支持全局路由
- 未来可扩展为 user/thread/org scope，但不影响当前结构

## 7. Provider 类型与适配

### 7.1 Provider 类型（当前计划支持）

- `openai`
- `openai_compatible`
- `anthropic`
- `google`
- `azure_openai`
- `deepseek`
- `qwen`
- `zhipu`
  说明：
- `type` 本质上是 adapter 的标识
- 新增 provider 只需新增 adapter，并使用新的 `type` 值

### 7.2 适配器职责

- 读取 provider 配置与 credential
- 组织请求（messages、model_id、参数）
- 执行调用（SDK 或 HTTP）
- 统一输出格式（非流式 + 流式）

### 7.3 扩展机制（新增 Provider）

当需要接入内部或非主流 Provider：

1. 新增一个 adapter 实现（内部可通过 SDK 或 HTTP 调用）
2. 在 `llm_providers.type` 中使用该 adapter 的标识
3. 按正常流程配置 provider/model/credential 与 stage route

### 7.4 新增 Adapter 的落地步骤

1. **确定适配方式**
   选择 SDK 或 HTTP 方式，并确认认证方式（API Key / OAuth / 账号密码等）。

2. **定义 adapter 标识**
   例如 `internal_mass`，作为 `llm_providers.type` 的值。

3. **实现 Adapter**
   - 实现统一接口：`complete()` / `stream()`
   - 输入使用统一请求结构（model_id、messages、参数）  
   - 输出转换为统一响应结构（content / delta）

4. **注册 Adapter**
   在 ProviderRegistry 中把 `type -> adapter` 建立映射。

5. **声明能力与限制**
   在 `llm_providers.capabilities` 中写明是否支持 streaming/json_mode/vision 等，
   在 `llm_models.limits` 中填 max_tokens/rpm/tpm 等。

6. **录入配置**
   在数据库中新增 provider/model/credential 记录，填入 base_url、model_id、secret。

7. **配置路由**
   在 `llm_stage_routes` 指定阶段使用该 provider + model。

8. **验证与回退**
   - 用分析/生成阶段跑一次完整流程
   - 失败时可回退到 `default` 路由

## 8. 统一请求/响应结构

### 8.1 LLMRequest（抽象）

- `model_id`
- `messages`
- `temperature`
- `max_tokens`
- `response_format`
- `extra_params`（json，可承载 `extra_body`）

### 8.2 LLMResponse（抽象）

- `content`（最终文本）
- `usage`（可选）
- `raw`（可选）

### 8.3 LLMStreamChunk（抽象）

- `delta`
- `full_content`
- `raw`（可选）

说明：
现有 `LLMClient` 流式逻辑依然可以沿用，只是数据源换为 ProviderAdapter。

## 9. 运行时调用流程

1. 业务代码调用 LLM（analyze / generate / title）
2. Router 读取 `llm_stage_routes`（stage → provider_id + model_id）
3. 加载 provider + model + credential
4. Registry 选取 Adapter
5. Adapter 调用 SDK/HTTP
6. 返回统一结果给 `LLMClient`

## 10. 配置管理与后台能力

管理接口（或后台）应提供：

- provider CRUD
- model CRUD
- credential CRUD（加密）
- stage route 配置

默认初始化：
在部署或迁移时写入一组 OpenAI provider 与默认模型，并配置 `default` 路由。

## 11. 安全与运维

- `secret_value` 加密存储（对称加密密钥仅放 `.env`）
- provider/model/route 加缓存（TTL 1~5 分钟）
- 审计日志：记录 provider_id / model_id / 时延 / 错误码
- prompt/密钥不入日志

## 12. 迁移计划

1. 新建数据库表
2. 在管理后台配置 provider/model/credential
3. 配置 `llm_stage_routes`（default + analyze/generate/title 可选）
4. `LLMClient` 走 Router + ProviderAdapter，DB 无路由时直接报错

## 13. 风险与应对

- **路由未配置**：首次 LLM 调用时抛出明确错误，提示在管理后台配置
- **密钥丢失/过期**：监控调用失败 + 后台提示
- **厂商接口差异**：适配器内统一处理响应结构，避免上层感知

## 14. 后续扩展（预留）

- 新增 adapter 以支持内部/非主流 provider（SDK 或 HTTP 方式均可）
- 如需配置化 HTTP 适配，可在后续增加“模板型 adapter”
- user/thread 级路由：增加 `scope` 字段即可扩展

## 15. 与现有模块的衔接点

改造目标模块：

- `apps/api/app/engine/llm_client.py`：解耦 OpenAI SDK，接入 Router
- `apps/api/app/api/deps.py`：注入 LLMClient，从 DB 加载配置
- `apps/api/app/core/config.py`：仅保留 DB + 加密相关配置
- `apps/api/app/services/thread.py`：改为调用公开 LLMClient 方法

核心业务流程（ExcelProcessor / Stage）不改动，仅替换 LLM 调用实现。
