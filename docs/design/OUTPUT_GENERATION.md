# 输出生成设计文档

## 概述

本文档描述 Selgetabel 系统的输出生成模块设计。该模块负责将执行结果转换为用户友好的两种输出格式：

1. **思路解读**（Strategy Explanation）：让用户理解系统"准备怎么操作"
2. **快捷复现**（Manual Steps）：用户手动操作 Excel 的步骤指南

## 设计目标

### 核心价值

> **让用户能验证系统的思路是否正确，思路对则结果可信任。**

这是本系统相比其他技术方案的核心优势。

### 目标用户

- 懂 Excel 操作的业务人员
- 日常工作是根据需求处理 Excel 表格
- 需要能看懂系统的处理逻辑，判断是否正确

### 两种输出的定位

| 输出         | 面向人群         | 目的             | 内容                              |
| ------------ | ---------------- | ---------------- | --------------------------------- |
| **思路解读** | 所有用户         | 验证思路是否正确 | 做什么 + 怎么做（概要）           |
| **快捷复现** | 想手动操作的用户 | 在 Excel 中复现  | 具体操作步骤（含 Excel 365 公式） |

---

## 数据流设计

```
┌─────────────────────┐
│  LLM Generate       │
│  operations +       │
│  description        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Execute Stage      │
│  执行操作            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│           Output Generator                       │
├─────────────────────────────────────────────────┤
│  generate_strategy()     → 思路解读              │
│  generate_manual_steps() → 快捷复现              │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│   ProcessResult     │
│   - strategy        │
│   - manual_steps    │
└─────────────────────┘
```

---

## 输出格式设计

### 1. 思路解读（Strategy Explanation）

#### 设计原则

- **内容来源**：
  - `description`：LLM 生成，描述"做什么"（语义层面）
  - 技术细节：系统从 operation 结构解析，描述"怎么做"

- **详细程度**：中等，让用户能快速理解整体思路

#### 输出格式

```
📋 处理思路

本次处理共 {N} 步：

步骤 1：{description}
├─ 操作：{操作类型中文名}
├─ 目标：{filename} / {sheet_name}
├─ {条件/公式/分组等细节}
└─ 方法：{使用的函数或操作}

步骤 2：{description}
├─ 操作：{操作类型中文名}
├─ 目标：{filename} / {sheet_name}（由步骤 1 创建）
└─ 方法：{使用的函数或操作}

→ 最终结果：{输出描述}
```

#### 示例

需求：在泰坦尼克数据中，找出生还的女性乘客，按年龄降序排列，取前10名

```
📋 处理思路

本次处理共 3 步：

步骤 1：筛选出生还的女性乘客
├─ 操作：筛选数据
├─ 目标：titanic.xlsx / train
├─ 条件：Sex = "female" 且 Survived = 1
└─ 方法：FILTER 函数（多条件 AND 筛选）

步骤 2：按年龄从大到小排序
├─ 操作：排序
├─ 目标：titanic.xlsx / 生还女性（步骤 1 创建）
└─ 方法：SORT 函数（降序）

步骤 3：只保留前 10 行
├─ 操作：取前 N 行
├─ 目标：titanic.xlsx / 生还女性
└─ 方法：TAKE 函数

→ 最终结果：新工作表「生还女性」，包含年龄最大的 10 位生还女性
```

---

### 2. 快捷复现（Manual Steps）

#### 设计原则

- **Excel 版本适配**：
  - 高级操作（filter, sort, group_by, take, pivot）：同时提供非 365 和 365 两种方式
  - 基础操作（add_column, aggregate 等）：公式方式，版本通用

- **优先级**：非 365 方式优先展示（大部分用户使用非 365 版本）

- **内容**：具体的菜单操作步骤，面向实际操作

#### 操作类型分类

| 操作类型        | 分类 | 非 365 方式  | 365 方式           |
| --------------- | ---- | ------------ | ------------------ |
| `add_column`    | 基础 | 公式         | 公式（相同）       |
| `update_column` | 基础 | 公式         | 公式（相同）       |
| `aggregate`     | 基础 | 公式         | 公式（相同）       |
| `compute`       | 基础 | 公式         | 公式（相同）       |
| `filter`        | 高级 | 数据筛选功能 | FILTER 函数        |
| `sort`          | 高级 | 排序功能     | SORT 函数          |
| `group_by`      | 高级 | 数据透视表   | GROUPBY 函数       |
| `take`          | 高级 | 手动删除行   | TAKE 函数          |
| `pivot`         | 高级 | 数据透视表   | PIVOTBY 函数       |
| `create_sheet`  | 内部 | 新建工作表   | 新建工作表（相同） |

#### 输出格式

```
🔧 手动操作步骤

步骤 1：{操作标题}
   {具体操作指引}

步骤 2：{操作标题}
   {具体操作指引}

---
💡 Excel 365 用户提示
如果你使用 Excel 365，可以用公式替代部分操作：
{高级操作的公式方式}
```

#### 示例

```
🔧 手动操作步骤

步骤 1：筛选数据
   1. 打开 titanic.xlsx，切换到 train 工作表
   2. 选中数据区域（包含表头）
   3. 点击「数据」→「筛选」
   4. 在 Sex 列下拉菜单中，只勾选 "female"
   5. 在 Survived 列下拉菜单中，只勾选 "1"
   6. 选中筛选后的所有数据（包含表头），按 Ctrl+C 复制
   7. 新建工作表，命名为「生还女性」
   8. 在 A1 单元格按 Ctrl+V 粘贴
   9. 返回 train 工作表，点击「数据」→「筛选」取消筛选

步骤 2：排序
   1. 切换到「生还女性」工作表
   2. 选中所有数据（包含表头）
   3. 点击「数据」→「排序」
   4. 主要关键字选择「Age」，排序依据选择「数值」，次序选择「降序」
   5. 点击「确定」

步骤 3：保留前 10 行
   1. 点击第 12 行的行号
   2. 按住 Shift，滚动到最后一行数据，点击该行号（选中所有多余行）
   3. 右键 →「删除」

---
💡 Excel 365 用户提示
如果你使用 Excel 365，可以用以下公式一步完成：

在新工作表的 A1 单元格输入：
=TAKE(SORT(FILTER(train!A:L, (train!E:E="female")*(train!B:B=1)), 6, -1), 10)

公式说明：
• FILTER(...) - 筛选 Sex="female" 且 Survived=1 的行
• SORT(..., 6, -1) - 按第 6 列（Age）降序排序
• TAKE(..., 10) - 取前 10 行
```

---

## 实现设计

### 数据结构变更

#### ProcessResult 字段

```python
@dataclass
class ProcessResult:
    # 各阶段输出
    operations: Optional[List] = None     # 操作列表（JSON 序列化后的操作对象）
    strategy: Optional[str] = None        # 思路解读
    manual_steps: Optional[str] = None    # 快捷复现

    # 执行结果
    variables: Dict[str, Any] = field(default_factory=dict)
    new_columns: Dict[str, Dict[str, Dict[str, List]]] = field(default_factory=dict)
    updated_columns: Dict[str, Dict[str, Dict[str, List]]] = field(default_factory=dict)
    new_sheets: Dict[str, Dict[str, Dict]] = field(default_factory=dict)
    modified_tables: Optional["FileCollection"] = None
    errors: List[str] = field(default_factory=list)
```

### 新模块：output_generator.py

```python
# apps/api/app/engine/output_generator.py

def generate_strategy(operations: List, tables: FileCollection) -> str:
    """
    生成思路解读

    Args:
        operations: 操作列表（包含 description）
        tables: 文件集合（用于获取文件名）

    Returns:
        思路解读文本
    """

def generate_manual_steps(operations: List, tables: FileCollection) -> str:
    """
    生成快捷复现步骤

    Args:
        operations: 操作列表
        tables: 文件集合

    Returns:
        手动操作步骤文本
    """

def _get_operation_type_name(op_type: str) -> str:
    """获取操作类型的中文名"""

def _extract_method_from_operation(op) -> str:
    """从操作中提取使用的方法/函数"""

def _generate_filter_manual_steps(op, tables, step_num) -> str:
    """生成 filter 操作的手动步骤"""

def _generate_sort_manual_steps(op, tables, step_num) -> str:
    """生成 sort 操作的手动步骤"""

# ... 其他操作类型的步骤生成函数
```

### 操作类型映射表

```python
OPERATION_TYPE_NAMES = {
    "aggregate": "聚合计算",
    "add_column": "新增列",
    "update_column": "更新列",
    "compute": "标量计算",
    "filter": "筛选数据",
    "sort": "排序",
    "group_by": "分组统计",
    "take": "取前/后 N 行",
    "create_sheet": "创建工作表",
}

# 高级操作（需要区分 365 / 非 365）
ADVANCED_OPERATIONS = {"filter", "sort", "group_by", "take", "pivot"}
```

### 集成位置

在 `ExecuteStage` 完成后，调用输出生成函数：

```python
# apps/api/app/processor/stages/execute.py

from app.engine.output_generator import generate_strategy, generate_manual_steps

class ExecuteStage:
    def run(self, ...):
        # ... 执行操作 ...

        # 生成输出
        strategy = generate_strategy(operations, tables)
        manual_steps = generate_manual_steps(operations, tables)

        return {
            "strategy": strategy,
            "manual_steps": manual_steps,
            # ... 其他字段 ...
        }
```

---

## description 字段规范

### 设计原则

采用**分工合作**模式：

- **LLM 负责**：生成自然语言描述，说明这一步的**目的**
- **系统负责**：从操作结构中解析**技术细节**（条件、函数、公式等）

### Prompt 要求

```
**重要**：每个操作都必须包含 `description` 字段，用自然语言描述这一步操作的目的。
- 描述应说明"做什么"，而不是"怎么做"
- 长度控制在 1-2 句话
- 可以包含关键的业务语义（如"生还的女性"而不是"Survived=1 且 Sex=female"）
```

### 示例

| 操作类型   | description 示例              |
| ---------- | ----------------------------- |
| filter     | "筛选出生还的女性乘客"        |
| sort       | "按年龄从大到小排序"          |
| add_column | "计算每件商品打 9 折后的价格" |
| group_by   | "按船舱等级统计平均票价"      |
| aggregate  | "计算所有乘客的平均年龄"      |

---

## 文件结构

```
apps/api/app/engine/
├── output_generator.py    # 输出生成器（思路解读 + 快捷复现）
├── excel_generator.py     # Excel 公式生成器（供 output_generator 使用）
├── ...
```

---

## 注意事项

### 异常处理

`generate_strategy()` 和 `generate_manual_steps()` 在 `execute.py` 中分别用独立的 try 块调用，确保一个失败不影响另一个。

### 操作对象属性

- `ComputeOperation` 使用 `expression` 字段（不是 `formula`）
- `AggregateOperation` 使用 `as_var` 字段存储变量名

---

## 更新日志

- **2026-02-03**：实现完善
  - 移除 formulas 字段（Excel 公式复现），合并到 manual_steps 中
  - 修复 ComputeOperation 属性名（expression，非 formula）
  - 分离 strategy 和 manual_steps 的异常处理
  - operations 存储为列表格式

- **2026-02-02**：初始设计
  - 新增思路解读（strategy）输出
  - 新增快捷复现（manual_steps）输出
  - 高级操作支持 365 / 非 365 两种复现方式
