# Pivot 数据透视功能实现方案

## 一、功能概述

数据透视（Pivot Table）是 Excel 最强大的数据分析功能之一，允许用户从多个维度对数据进行分组、聚合、交叉分析。

### 1.1 功能定义

```
原始数据 → 按行维度分组 × 按列维度分组 → 值区域聚合 → 透视结果
```

### 1.2 与现有 `group_by` 的区别

| 特性 | `group_by` | `pivot` |
|------|------------|---------|
| 行分组 | 支持 | 支持 |
| 列分组（交叉表） | 不支持 | 支持 |
| 多聚合同时展示 | 需多次操作 | 单次搞定 |
| 输出结构 | 扁平一维/二维 | 真正的行列交叉矩阵 |

### 1.3 Excel 技术方案

**Excel 365+**: 使用 `PIVOTBY()` 动态数组函数（2024年1月加入）

```
=PIVOTBY(row_fields, col_fields, values, func, [field_headers], [row_sort_order], [col_totals], [row_totals], [filter_array])
```

**回退方案**: 对于不支持 PIVOTBY 的 Excel 版本，使用 pandas 在后端计算，生成带公式的静态结果表。

---

## 二、JSON Schema 定义

### 2.1 pivot 操作

```json
{
  "type": "pivot",
  "description": "用自然语言描述这一操作的目的",
  "file_id": "文件ID",
  "table": "源表名",
  "row_fields": ["行分组列1", "行分组列2"],
  "col_fields": ["列分组列"],
  "values": [
    { "column": "聚合列", "function": "SUM", "as": "结果列名" }
  ],
  "sort": {
    "by": "列名（聚合列或分组列）",
    "order": "asc | desc"
  },
  "filter": [
    { "column": "列名", "op": "运算符", "value": "值" }
  ],
  "output": { "type": "new_sheet", "name": "透视结果表" }
}
```

### 2.2 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `row_fields` | string[] | ✅ | 行区域分组列（至少1个） |
| `col_fields` | string[] | ❌ | 列区域分组列（为空则只有行分组，无交叉） |
| `values` | object[] | ✅ | 值区域聚合定义 |
| `values[].column` | string | ✅ | 要聚合的列名 |
| `values[].function` | string | ✅ | 聚合函数：SUM/COUNT/AVERAGE/MIN/MAX |
| `values[].as` | string | ✅ | 聚合结果列名 |
| `sort.by` | string | ❌ | 排序列名 |
| `sort.order` | string | ❌ | asc 或 desc |
| `filter` | object[] | ❌ | 透视前筛选条件 |
| `output.type` | string | ✅ | 输出类型：new_sheet |
| `output.name` | string | ✅ | 输出 sheet 名称 |

### 2.3 示例

**需求**: 按月份和地区交叉统计销售额

```json
{
  "type": "pivot",
  "description": "按月份和地区交叉统计销售额和销量",
  "file_id": "abc-123",
  "table": "订单",
  "row_fields": ["月份"],
  "col_fields": ["地区"],
  "values": [
    { "column": "销售额", "function": "SUM", "as": "总销售额" },
    { "column": "销量", "function": "COUNT", "as": "订单数" }
  ],
  "sort": { "by": "总销售额", "order": "desc" },
  "output": { "type": "new_sheet", "name": "月份地区透视" }
}
```

**Excel PIVOTBY 公式**:
```
=PIVOTBY(订单!A:A, 订单!B:B, HSTACK(订单!C:C, 订单!D:D), HSTACK(SUM, COUNT), , 2, , , )
```

---

## 三、受影响的文件清单

### 3.1 新增文件

| 文件路径 | 说明 |
|---------|------|
| `apps/api/app/engine/pivot_models.py` | PivotOperation 数据模型定义 |
| `apps/api/app/engine/pivot_functions.py` | pivot 专用函数（如百分比计算、占比分析） |

### 3.2 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `docs/specs/OPERATION_SPEC.md` | 新增 3.11 pivot 操作定义 |
| `apps/api/app/engine/models.py` | Operation 联合类型加入 PivotOperation |
| `apps/api/app/engine/parser.py` | 新增 `_parse_pivot()` 解析方法，VALID_TYPES 加入 pivot |
| `apps/api/app/engine/executor.py` | 新增 `_execute_pivot()` 执行逻辑 |
| `apps/api/app/engine/excel_generator.py` | 新增 `_generate_pivot_formula()` 公式生成 |
| `apps/api/app/engine/prompt.py` | 新增 pivot 操作说明到 GENERATION_PROMPT |
| `apps/api/app/engine/output_generator.py` | 新增 pivot 的策略解读和手动步骤 |
| `apps/api/app/engine/context_builder.py` | ANALYSIS 意图下增强数据洞察上下文 |

---

## 四、任务拆分与 Agent 分配

### Agent 角色定义

| Agent | 职责 |
|-------|------|
| **spec-agent** | 规范文档更新、操作定义编写 |
| **model-agent** | 数据模型、解析器、执行器 |
| **formula-agent** | Excel 公式生成、输出格式化 |
| **prompt-agent** | LLM 提示词更新、意图分类增强 |

---

### 任务 1: 规范定义（spec-agent）

**依赖**: 无

**任务描述**:
1. 在 `docs/specs/OPERATION_SPEC.md` 新增 3.11 节 `pivot` 操作定义
2. 更新操作类型总览表格
3. 更新函数白名单说明

**交付物**: `docs/specs/OPERATION_SPEC.md` 更新

**修改文件**:
- `docs/specs/OPERATION_SPEC.md`

---

### 任务 2: 数据模型与解析器（model-agent）

**依赖**: 任务 1

**任务描述**:
1. 在 `apps/api/app/engine/models.py` 新增 `PivotOperation` dataclass
2. 在 `Operation` 联合类型中加入 `PivotOperation`
3. 在 `apps/api/app/engine/parser.py`:
   - `VALID_TYPES` 集合加入 `"pivot"`
   - `GROUPBY_FUNCTIONS` 扩展支持 pivot 所需函数
   - 新增 `_parse_pivot()` 静态方法
   - `validate_operations()` 加入 PivotOperation 处理
4. 新建 `apps/api/app/engine/pivot_models.py`，包含 `PivotAggregation` 等辅助类

**交付物**: models.py 和 parser.py 的 pivot 相关修改

**修改文件**:
- `apps/api/app/engine/models.py`
- `apps/api/app/engine/parser.py`
- `apps/api/app/engine/pivot_models.py`（新建）

---

### 任务 3: 执行器逻辑（model-agent）

**依赖**: 任务 2

**任务描述**:
1. 在 `apps/api/app/engine/executor.py`:
   - `Executor._execute_operation()` 中添加 `PivotOperation` 分支
   - 新增 `_execute_pivot()` 方法，使用 pandas `pivot_table()` 实现
   - 处理 `row_fields`、`col_fields`、`values`、`sort`、`filter`
   - 返回透视结果 DataFrame 到新 sheet

**核心逻辑**:
```python
def _execute_pivot(self, op: PivotOperation) -> OperationResult:
    table = self.tables.get_table(op.file_id, op.table)
    df = table.get_data()

    # 1. 预处理筛选
    if op.filter:
        df = self._apply_filter(df, op.filter)

    # 2. 透视计算
    if op.col_fields:
        # 交叉表模式
        pivot_df = pd.pivot_table(
            df,
            index=op.row_fields,
            columns=op.col_fields,
            values=[v["column"] for v in op.values],
            aggfunc={v["column"]: v["function"].lower() for v in op.values},
            fill_value=None
        )
    else:
        # 简单分组模式（退化为 group_by）
        pivot_df = df.groupby(op.row_fields, as_index=False).agg(...)

    # 3. 排序
    if op.sort:
        pivot_df = pivot_df.sort_values(op.sort["by"], ascending=(op.sort["order"] == "asc"))

    return OperationResult(value={...})
```

**修改文件**:
- `apps/api/app/engine/executor.py`

---

### 任务 4: Excel 公式生成（formula-agent）

**依赖**: 任务 2

**任务描述**:
1. 在 `apps/api/app/engine/excel_generator.py`:
   - `generate_formulas()` 中添加 `PivotOperation` 处理分支
   - 新增 `_generate_pivot_formula()` 方法，生成 PIVOTBY 公式
   - 新增 `_generate_pivot_manual_steps()` 方法，生成手动操作说明
2. 在 `apps/api/app/engine/output_generator.py`:
   - `OPERATION_TYPE_NAMES` 加入 `"pivot": "数据透视"`
   - `_get_operation_details()` 添加 pivot 详细信息（行字段、列字段、聚合）
   - `_generate_strategy_step()` 支持 pivot 类型
   - `_generate_manual_steps()` 支持 pivot 类型
   - 新增 `_generate_pivot_manual_steps()` 和 `_generate_pivot_365_formula()`

**PIVOTBY 公式模板**:
```python
def _generate_pivot_formula(op: PivotOperation, generator: ExcelFormulaGenerator) -> str:
    # row_fields: 转为列引用
    row_refs = [f"{op.table}![{col}]" for col in op.row_fields]

    # col_fields: 转为列引用
    col_refs = [f"{op.table}![{col}]" for col in op.col_fields] if op.col_fields else []

    # values + functions
    value_funcs = [f"{v['function']}({op.table}![{v['column']}])" for v in op.values]
    value_names = [v['as'] for v in op.values]

    # 构建 PIVOTBY
    row_part = f"HSTACK({', '.join(row_refs)})" if len(row_refs) > 1 else row_refs[0]
    col_part = f"HSTACK({', '.join(col_refs)})" if len(col_refs) > 1 else (col_refs[0] if col_refs else "")
    val_part = f"HSTACK({', '.join(value_funcs)})"

    # 排序参数
    sort_order = "2" if op.sort and op.sort.get("order") == "desc" else "1"

    if col_refs:
        return f"=PIVOTBY({row_prt}, {col_part}, {val_part}, , , {sort_order})"
    else:
        return f"=GROUPBY({row_part}, {val_part}, {op.values[0]['function']})"
```

**修改文件**:
- `apps/api/app/engine/excel_generator.py`
- `apps/api/app/engine/output_generator.py`

---

### 任务 5: LLM 提示词更新（prompt-agent）

**依赖**: 任务 1

**任务描述**:
1. 在 `apps/api/app/engine/prompt.py` 的 `GENERATION_PROMPT` 中:
   - 在"操作类型"章节新增 6. pivot - 数据透视（Excel 365+）
   - 提供完整的 JSON Schema 示例
   - 说明与 group_by 的区别（何时应该用 pivot）
   - 强调只有当用户明确需要"交叉表"或多维度分析时才生成 pivot

2. 可选：在 `apps/api/app/engine/intent_classifier.py` 中增强 ANALYSIS 意图的判断逻辑，使其更容易识别"透视"类需求

**提示词示例**:
```
### 6. pivot - 数据透视（Excel 365+）

当用户需要：
- 按行列交叉分析（行一个维度、列一个维度）
- 同时展示多个聚合指标（求和+计数+平均值）
- 生成真正的二维透视表

使用此操作：

```json
{
  "type": "pivot",
  "description": "描述透视目的",
  "file_id": "文件ID",
  "table": "sheet名称",
  "row_fields": ["行分组列"],
  "col_fields": ["列分组列（可选，为空则无交叉）"],
  "values": [
    {"column": "聚合列", "function": "SUM|COUNT|AVERAGE|MIN|MAX", "as": "结果列名"}
  ],
  "sort": {"by": "排序列", "order": "asc|desc"},
  "output": {"type": "new_sheet", "name": "输出表名"}
}
```

**注意**: 如果用户只要求简单的分组求和，用 group_by 即可；只有需要交叉表或多聚合时才用 pivot。
```

**修改文件**:
- `apps/api/app/engine/prompt.py`
- `apps/api/app/engine/intent_classifier.py`（可选增强）

---

## 五、文件依赖关系图

```
                    ┌─────────────────────────────────────────┐
                    │  docs/specs/OPERATION_SPEC.md          │
                    │  (Task 1: spec-agent)                  │
                    └───────────────┬─────────────────────────┘
                                    │
                    ┌───────────────┴─────────────────────────┐
                    ▼                                       ▼
    ┌───────────────────────────┐           ┌───────────────────────────┐
    │  apps/api/app/engine/      │           │  apps/api/app/engine/      │
    │  pivot_models.py          │           │  prompt.py                 │
    │  (Task 2: model-agent)     │           │  (Task 5: prompt-agent)    │
    └───────────────┬───────────┘           └──────────────┬──────────────┘
                    │                                      │
                    ▼                                      │
    ┌───────────────────────────┐                          │
    │  apps/api/app/engine/      │                          │
    │  models.py                │◄─────────────────────────┘
    │  parser.py                │
    └───────────────┬───────────┘
                    │
                    ▼
    ┌───────────────────────────┐
    │  apps/api/app/engine/      │
    │  executor.py               │
    │  (Task 3: model-agent)     │
    └───────────────┬───────────┘
                    │
                    ▼
    ┌───────────────────────────┐
    │  apps/api/app/engine/      │
    │  excel_generator.py        │
    │  output_generator.py       │
    │  (Task 4: formula-agent)   │
    └───────────────────────────┘
```

---

## 六、实现优先级

| 优先级 | 任务 | 说明 |
|-------|------|------|
| P0 | Task 1 + Task 2 | 规范定义 + 模型解析（核心契约） |
| P0 | Task 3 | 执行器（pandas pivot_table 实现） |
| P1 | Task 4 | 公式生成 + 输出格式化 |
| P1 | Task 5 | 提示词更新 |
| P2 | 上下文增强 | ANALYSIS 意图下的增强上下文 |

---

## 七、测试用例

### 7.1 简单透视（无列分组）

**输入**: row_fields=["月份"], col_fields=[], values=[SUM(销售额)]

**预期**: 输出一维分组表，类似 group_by

### 7.2 交叉透视（行列分组）

**输入**: row_fields=["月份"], col_fields=["地区"], values=[SUM(销售额)]

**预期**: 行列交叉矩阵，行是月份，列是地区，值是销售额求和

### 7.3 多聚合透视

**输入**: row_fields=["月份"], col_fields=["地区"], values=[SUM(销售额), COUNT(订单ID)]

**预期**: 每个交叉单元格有多个聚合列

### 7.4 带排序和筛选

**输入**: filter=[地区="华北"], sort={by:"销售额", order:"desc"}

**预期**: 先筛选华北数据，再按销售额降序排列

---

## 八、已知限制

1. **Excel 版本**: PIVOTBY 函数仅 Excel 365 (2024年1月+) 支持，旧版本用户只能获得后端计算结果
2. **列分组限制**: Excel PIVOTBY 只支持单列分组，pandas 无限制
3. **空值处理**: pivot_table 的 fill_value 行为需要对齐
4. **多层行列分组**: Excel PIVOTBY 支持多列，需要确认 HSTACK 语法正确性
