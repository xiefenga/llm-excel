# tablo

`tablo` 是从 `apps/api` 中抽离出的数据处理核心包。

当前阶段目标：
- 承载可复用的数据处理核心
- 被 API 直接调用
- 提供最小 CLI
- 提供独立测试

## 包边界

`tablo` 负责：
- 数据模型与处理类型
- parser / executor / formula / output 生成
- processor 与 stages
- 本地 Excel 文件读写（`tablo.io.ExcelParser`）

`tablo` **不负责**：
- FastAPI route / SSE
- Thread / Turn 持久化
- 认证 / 用户 / 权限
- MinIO / OSS / 数据库配置

这些能力仍保留在 `apps/api` 作为 adapter / orchestration 层。

## 本地使用

### 1. 从 API 工程消费

`apps/api/pyproject.toml` 已通过本地 source 声明依赖：

```toml
[tool.uv.sources]
tablo = { path = "../../packages/tablo", editable = true }
```

可直接验证：

```bash
cd apps/api
uv run python -c "import tablo; print(tablo.__file__)"
```

### 2. 运行最小 CLI

当前 CLI 是最小 smoke 版，使用静态 `--operations-json` 驱动一条本地处理链：

```bash
cd apps/api
uv run tablo run ../../fixtures/01-titanic/datasets/titanic.xlsx "删除某列" \
  --operations-json '{"operations":[]}'
```

常用参数：
- `input...`：一个或多个本地 Excel 文件
- `query`：自然语言请求
- `--operations-json`：最小 CLI 的静态操作 JSON
- `-o/--output`：导出修改后的文件
- `--stream`：启用 stream_llm 配置

## 测试

包级测试：

```bash
cd packages/tablo
uv sync --group dev
uv run pytest
```

API + 包联合回归：

```bash
cd apps/api
uv run --with pytest python -m pytest \
  tests/test_tablo_hot_path.py \
  tests/test_processor_stream_smoke.py \
  tests/test_generate_validate_stage.py \
  tests/test_stage_exports.py \
  ../../packages/tablo/tests
```

## 后续可继续做的事

- 把 CLI 从 smoke 版升级成真实 LLM 驱动版
- 继续裁剪兼容层文件
- 视后续演进再决定是否拆独立发布包
