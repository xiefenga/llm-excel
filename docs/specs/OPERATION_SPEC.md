# 数据处理操作规范

本文档定义 Selgetabel 系统支持的所有操作类型、表达式格式、函数白名单和校验规则。系统架构和模块清单见 `CLAUDE.md`，SSE 事件协议见 [SSE_SPEC.md](./SSE_SPEC.md)。

---

## 一、操作类型总览

| 操作类型         | 说明         | 输出       | Excel 版本     |
| ---------------- | ------------ | ---------- | -------------- |
| `aggregate`      | 整列聚合     | 单个值     | 所有版本       |
| `add_column`     | 新增计算列   | 新的一列   | 所有版本       |
| `update_column`  | 更新现有列   | 更新后的列 | 所有版本       |
| `compute`        | 标量运算     | 单个值     | 所有版本       |
| `filter`         | 筛选行       | 筛选后的表 | **Excel 365+** |
| `sort`           | 排序行       | 排序后的表 | **Excel 365+** |
| `group_by`       | 分组聚合     | 聚合结果表 | **Excel 365+** |
| `take`           | 取前/后N行   | 截取后的表 | **Excel 365+** |
| `select_columns` | 选择列       | 投影后的表 | **Excel 365+** |
| `drop_columns`   | 删除列       | 剩余列表   | **Excel 365+** |
| `create_sheet`   | 创建新 Sheet | 新 Sheet   | 内部抽象       |

---

## 二、表达式对象格式

所有 `formula` / `expression` 字段使用 **JSON 对象**（不是字符串），确保无歧义解析。

### 表达式类型

| 类型       | 格式                                           | 说明                     |
| ---------- | ---------------------------------------------- | ------------------------ |
| 字面量     | `{"value": 100}` / `{"value": "已完成"}`       | 常量值                   |
| 列引用     | `{"col": "price"}`                             | 当前行某列的值           |
| 跨表引用   | `{"ref": "customers.id"}`                      | 另一张表的整列数据       |
| 变量引用   | `{"var": "total"}`                             | 引用前面 `as` 定义的变量 |
| 函数调用   | `{"func": "IF", "args": [...]}`                | 每个参数也是表达式对象   |
| 二元运算   | `{"op": "+", "left": {...}, "right": {...}}`   | 支持嵌套                 |

### 二元运算符

| 运算符 | 说明     | 运算符 | 说明     |
| ------ | -------- | ------ | -------- |
| `+`    | 加法     | `>`    | 大于     |
| `-`    | 减法     | `<`    | 小于     |
| `*`    | 乘法     | `>=`   | 大于等于 |
| `/`    | 除法     | `<=`   | 小于等于 |
| `&`    | 文本拼接 | `=`    | 等于     |
|        |          | `<>`   | 不等于   |

---

## 三、操作类型定义

### 3.1 aggregate（整列聚合）

对整列数据做聚合运算，输出**单个值**，通过 `as` 存为变量。

```json
{
  "type": "aggregate",
  "function": "聚合函数名",
  "table": "表名",
  "column": "聚合列",
  "condition_column": "条件列（条件函数需要）",
  "condition": "条件值（条件函数需要）",
  "as": "结果变量名"
}
```

**支持的聚合函数：**

| 函数        | 必需参数                                   | Excel 对应                   |
| ----------- | ------------------------------------------ | ---------------------------- |
| `SUM`       | table, column                              | `=SUM(A:A)`                  |
| `COUNT`     | table, column                              | `=COUNT(A:A)`                |
| `COUNTA`    | table, column                              | `=COUNTA(A:A)`               |
| `AVERAGE`   | table, column                              | `=AVERAGE(A:A)`              |
| `MIN`       | table, column                              | `=MIN(A:A)`                  |
| `MAX`       | table, column                              | `=MAX(A:A)`                  |
| `MEDIAN`    | table, column                              | `=MEDIAN(A:A)`               |
| `SUMIF`     | table, column, condition_column, condition | `=SUMIF(B:B,"条件",A:A)`     |
| `COUNTIF`   | table, condition_column, condition         | `=COUNTIF(B:B,"条件")`       |
| `AVERAGEIF` | table, column, condition_column, condition | `=AVERAGEIF(B:B,"条件",A:A)` |

**条件值格式：** 精确匹配（`"已完成"` / `100`）、比较（`">0"` / `"<100"` / `">=0"` / `"<=100"` / `"<>0"`）

**示例：**

```json
// SUMIF - 条件求和
{
  "type": "aggregate",
  "function": "SUMIF",
  "table": "orders",
  "column": "amount",
  "condition_column": "status",
  "condition": "已完成",
  "as": "completed_total"
}
```

---

### 3.2 add_column（新增计算列）

为表的**每一行**计算一个新值，形成**新的一列**。

```json
{
  "type": "add_column",
  "table": "表名",
  "name": "新列名",
  "formula": { "表达式对象" }
}
```

**`formula` 是 JSON 对象，不是字符串。**

**行级函数：**

| 函数         | 参数                               | Excel 对应      | 说明                     |
| ------------ | ---------------------------------- | --------------- | ------------------------ |
| `IF`         | 条件, 真值, 假值                   | `=IF()`         | 条件判断                 |
| `AND`        | 条件1, 条件2, ...                  | `=AND()`        | 逻辑与                   |
| `OR`         | 条件1, 条件2, ...                  | `=OR()`         | 逻辑或                   |
| `NOT`        | 条件                               | `=NOT()`        | 逻辑非                   |
| `ISBLANK`    | 值                                 | `=ISBLANK()`    | 判断空值                 |
| `ISNA`       | 值                                 | `=ISNA()`       | 判断#N/A                 |
| `ISNUMBER`   | 值                                 | `=ISNUMBER()`   | 判断数值                 |
| `ISERROR`    | 值                                 | `=ISERROR()`    | 判断错误                 |
| `COUNTIFS`   | 范围1, 条件1, 范围2, 条件2, ...    | `=COUNTIFS()`   | 多条件计数               |
| `VLOOKUP`    | 查找值, 查找范围, 列索引, 精确匹配 | `=VLOOKUP()`    | 跨表查找                 |
| `IFERROR`    | 表达式, 错误值                     | `=IFERROR()`    | 错误处理                 |
| `ROUND`      | 数值, 小数位                       | `=ROUND()`      | 四舍五入                 |
| `ABS`        | 数值                               | `=ABS()`        | 绝对值                   |
| `LEFT`       | 文本, 字符数                       | `=LEFT()`       | 左截取                   |
| `RIGHT`      | 文本, 字符数                       | `=RIGHT()`      | 右截取                   |
| `MID`        | 文本, 起始位, 字符数               | `=MID()`        | 中间截取                 |
| `FIND`       | 查找文本, 源文本, [起始位置]       | `=FIND()`       | 查找位置（区分大小写）   |
| `SEARCH`     | 查找文本, 源文本, [起始位置]       | `=SEARCH()`     | 查找位置（不区分大小写） |
| `SUBSTITUTE` | 文本, 旧文本, 新文本, [第N次]      | `=SUBSTITUTE()` | 替换文本                 |
| `LEN`        | 文本                               | `=LEN()`        | 文本长度                 |
| `TRIM`       | 文本                               | `=TRIM()`       | 去除空格                 |
| `UPPER`      | 文本                               | `=UPPER()`      | 转大写                   |
| `LOWER`      | 文本                               | `=LOWER()`      | 转小写                   |
| `PROPER`     | 文本                               | `=PROPER()`     | 首字母大写               |
| `TEXT`       | 数值, 格式                         | `=TEXT()`       | 数值格式化               |
| `VALUE`      | 文本                               | `=VALUE()`      | 文本转数值               |

**示例：**

```json
// 条件判断：IF(AND(amount > 500, status = "已完成"), "是", "否")
{
  "type": "add_column",
  "table": "orders",
  "name": "优质订单",
  "formula": {
    "func": "IF",
    "args": [
      {
        "func": "AND",
        "args": [
          {"op": ">", "left": {"col": "amount"}, "right": {"value": 500}},
          {"op": "=", "left": {"col": "status"}, "right": {"value": "已完成"}}
        ]
      },
      {"value": "是"},
      {"value": "否"}
    ]
  }
}

// COUNTIFS 跨表匹配
{
  "type": "add_column",
  "table": "贴现发生额明细",
  "name": "卖断",
  "formula": {
    "func": "IF",
    "args": [
      {
        "op": ">",
        "left": {
          "func": "COUNTIFS",
          "args": [
            {"ref": "卖断发生额明细.票据(包)号"},
            {"col": "票据(包)号"},
            {"ref": "卖断发生额明细.子票区间"},
            {"col": "子票区间"}
          ]
        },
        "right": {"value": 0}
      },
      {"value": "已卖断"},
      {"value": "未卖断"}
    ]
  }
}
```

---

### 3.3 update_column（更新现有列）

更新表中**已存在的列**，用于空值填充、数据修正等场景。

```json
{
  "type": "update_column",
  "file_id": "文件ID",
  "table": "表名",
  "column": "要更新的列名",
  "formula": { "表达式对象" }
}
```

| 特性     | add_column     | update_column   |
| -------- | -------------- | --------------- |
| 目标列   | 必须不存在     | 必须已存在      |
| 典型场景 | 添加"折扣价"列 | 填充 Age 列空值 |

**示例：**

```json
// 空值填充：用平均值填充 Age 列的空值
{
  "type": "update_column",
  "file_id": "xxx-xxx",
  "table": "train",
  "column": "Age",
  "formula": {
    "func": "IF",
    "args": [
      {"func": "ISBLANK", "args": [{"col": "Age"}]},
      {"var": "avg_age"},
      {"col": "Age"}
    ]
  }
}
```

---

### 3.4 compute（标量运算）

对**已有变量**做运算，输出**单个值**。用于组合多个聚合结果。

```json
{
  "type": "compute",
  "expression": { "表达式对象" },
  "as": "结果变量名"
}
```

**可用函数：** `ROUND`, `ABS`, `MAX`, `MIN`

**示例：**

```json
// 百分比计算：ROUND(completed_count / total_count * 100, 2)
{
  "type": "compute",
  "expression": {
    "func": "ROUND",
    "args": [
      {
        "op": "*",
        "left": {
          "op": "/",
          "left": {"var": "completed_count"},
          "right": {"var": "total_count"}
        },
        "right": {"value": 100}
      },
      {"value": 2}
    ]
  },
  "as": "completion_rate"
}
```

---

### 3.5 filter（筛选行）⚠️ Excel 365+

按条件筛选行。对应 Excel 365 的 `FILTER` 函数。

```json
{
  "type": "filter",
  "file_id": "文件ID",
  "table": "源表名",
  "conditions": [{ "column": "列名", "op": "运算符", "value": "值" }],
  "logic": "AND | OR",
  "output": { "type": "new_sheet | in_place", "name": "新Sheet名" }
}
```

| 字段                | 类型   | 必需 | 说明                                                |
| ------------------- | ------ | ---- | --------------------------------------------------- |
| `conditions[].op`   | string | ✅   | `=`, `<>`, `>`, `<`, `>=`, `<=`, `contains`         |
| `logic`             | string | ❌   | 多条件逻辑，默认 `"AND"`                            |
| `output.type`       | string | ✅   | `"new_sheet"` 或 `"in_place"`                       |

---

### 3.6 sort（排序行）⚠️ Excel 365+

按一列或多列排序。对应 Excel 365 的 `SORT` 函数。

```json
{
  "type": "sort",
  "file_id": "文件ID",
  "table": "表名",
  "by": [{ "column": "列名", "order": "asc | desc" }],
  "output": { "type": "in_place | new_sheet", "name": "新Sheet名" }
}
```

---

### 3.7 group_by（分组聚合）⚠️ Excel 365+

按分组列聚合计算，生成汇总表。对应 Excel 365 的 `GROUPBY` 函数（2023年9月加入）。

```json
{
  "type": "group_by",
  "file_id": "文件ID",
  "table": "源表名",
  "group_columns": ["分组列1", "分组列2"],
  "aggregations": [
    { "column": "聚合列", "function": "SUM | COUNT | AVERAGE | MIN | MAX", "as": "结果列名" }
  ],
  "output": { "type": "new_sheet", "name": "新Sheet名" }
}
```

---

### 3.8 take（取前/后 N 行）⚠️ Excel 365+

从表的开头或末尾提取指定数量的行。对应 Excel 365 的 `TAKE` 函数。

```json
{
  "type": "take",
  "file_id": "文件ID",
  "table": "表名",
  "rows": 10,
  "output": { "type": "in_place | new_sheet", "name": "新Sheet名" }
}
```

`rows` 正数取前N行，负数取后N行。

**典型用法（Top N）：** `group_by` → `sort` → `take` 组合。

---

### 3.9 select_columns / drop_columns（列操作）⚠️ Excel 365+

对应 Excel 365 的 `CHOOSECOLS` 函数。

```json
// 选择列
{ "type": "select_columns", "file_id": "文件ID", "table": "表名", "columns": ["列1", "列2"], "output": {...} }

// 删除列
{ "type": "drop_columns", "file_id": "文件ID", "table": "表名", "columns": ["列1", "列2"], "output": {...} }
```

---

### 3.10 create_sheet（创建新 Sheet）

内部抽象操作，通常由 `filter`/`sort`/`group_by` 的 output 隐式触发。

```json
{
  "type": "create_sheet",
  "file_id": "文件ID",
  "name": "新Sheet名",
  "source": { "type": "empty | copy | reference", "table": "源表名" },
  "columns": ["列名1", "列名2"]
}
```

| source.type | 说明                 |
| ----------- | -------------------- |
| `empty`     | 创建空表，可指定列头 |
| `copy`      | 复制现有表的全部数据 |
| `reference` | 创建空表但继承列结构 |

---

## 四、JSON 输出格式

### 完整结构

```json
{
  "operations": [
    { "type": "aggregate", ... },
    { "type": "compute", ... },
    { "type": "add_column", ... }
  ]
}
```

operations 数组按顺序执行：前面 `aggregate` 定义的变量可被后面的 `compute` 引用。

### 完整示例

**需求**：计算已完成订单净收入 + 给订单表新增"折扣价"和"等级"列

```json
{
  "operations": [
    {
      "type": "aggregate",
      "function": "SUMIF",
      "table": "orders",
      "column": "amount",
      "condition_column": "status",
      "condition": "已完成",
      "as": "order_total"
    },
    {
      "type": "aggregate",
      "function": "SUM",
      "table": "refunds",
      "column": "amount",
      "as": "refund_total"
    },
    {
      "type": "compute",
      "expression": {
        "func": "ROUND",
        "args": [
          {"op": "-", "left": {"var": "order_total"}, "right": {"var": "refund_total"}},
          {"value": 2}
        ]
      },
      "as": "net_income"
    },
    {
      "type": "add_column",
      "table": "orders",
      "name": "折扣价",
      "formula": {"op": "*", "left": {"col": "price"}, "right": {"value": 0.9}}
    },
    {
      "type": "add_column",
      "table": "orders",
      "name": "等级",
      "formula": {
        "func": "IF",
        "args": [
          {"op": ">", "left": {"col": "amount"}, "right": {"value": 1000}},
          {"value": "高"},
          {"value": "低"}
        ]
      }
    }
  ]
}
```

---

## 五、解析器规范

### 校验流程

```
JSON 操作描述 → 格式校验 → 操作类型校验 → 函数白名单校验 → 执行计算 → 生成 Excel 公式
```

### 操作类型白名单

```
aggregate, add_column, update_column, compute,
filter, sort, group_by, take, create_sheet,
select_columns, drop_columns
```

### 必需字段

| 操作类型                               | 必需字段                                                           |
| -------------------------------------- | ------------------------------------------------------------------ |
| aggregate (SUM/COUNT/AVERAGE/MIN/MAX…) | type, function, file_id, table, column, as                         |
| aggregate (SUMIF/AVERAGEIF)            | type, function, file_id, table, column, condition_column, condition, as |
| aggregate (COUNTIF)                    | type, function, file_id, table, condition_column, condition, as    |
| add_column                             | type, file_id, table, name, formula                                |
| update_column                          | type, file_id, table, column, formula                              |
| compute                                | type, expression, as                                               |
| filter/sort/group_by/take/select/drop  | type, file_id, table + 各操作特有字段                              |

### 函数白名单

**聚合函数**（aggregate.function）：`SUM`, `COUNT`, `COUNTA`, `AVERAGE`, `MIN`, `MAX`, `MEDIAN`, `SUMIF`, `COUNTIF`, `AVERAGEIF`

**行级函数**（add_column formula）：`IF`, `AND`, `OR`, `NOT`, `ISBLANK`, `ISNA`, `ISNUMBER`, `ISERROR`, `VLOOKUP`, `COUNTIFS`, `IFERROR`, `ROUND`, `ABS`, `LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `UPPER`, `LOWER`, `PROPER`, `CONCAT`, `TEXT`, `VALUE`, `SUBSTITUTE`, `FIND`, `SEARCH`

**标量函数**（compute expression）：`ROUND`, `ABS`, `MAX`, `MIN`

---

## 六、Excel 公式生成规则

### 列名到单元格引用映射

解析器维护每个表的列名与 Excel 列号的映射（如 `price` → `D`）。

### aggregate 公式模板

| 函数      | 公式模板                                                     |
| --------- | ------------------------------------------------------------ |
| SUM       | `=SUM(表名!列:列)`                                           |
| SUMIF     | `=SUMIF(表名!条件列:条件列, "条件", 表名!求和列:求和列)`     |
| COUNTIF   | `=COUNTIF(表名!条件列:条件列, "条件")`                       |
| AVERAGEIF | `=AVERAGEIF(表名!条件列:条件列, "条件", 表名!平均列:平均列)` |

### add_column 公式模板

为每行生成公式，用 `{row}` 占位符表示行号：

```
formula: price * 0.9  →  =D{row}*0.9
实际: =D2*0.9, =D3*0.9, =D4*0.9 ...
```

规则：
1. 列名 → 列号 + `{row}`（如 `price` → `D{row}`）
2. 字符串用双引号
3. 第 1 行为表头，数据从第 2 行开始

### compute 公式

结果放在汇总区域，引用其他计算结果的单元格。

---

## 七、能力总览

### 基础能力（所有 Excel 版本）

| 能力           | 实现方式                           |
| -------------- | ---------------------------------- |
| 整列聚合       | aggregate 操作                     |
| 条件聚合       | SUMIF/COUNTIF/AVERAGEIF            |
| 新增计算列     | add_column 操作                    |
| 更新现有列     | update_column 操作                 |
| 标量运算       | compute 操作                       |
| 条件判断       | IF/AND/OR/NOT 函数                 |
| 空值判断与填充 | ISBLANK + update_column            |
| 跨表查找       | VLOOKUP 函数                       |
| 跨表多条件匹配 | COUNTIFS 函数                      |
| 文本处理       | LEFT/RIGHT/MID 等 + & 运算符       |
| 错误处理       | IFERROR 函数                       |

### 高级能力（Excel 365+）

| 能力         | 操作类型       | Excel 函数     |
| ------------ | -------------- | -------------- |
| 多条件筛选   | filter         | FILTER()       |
| 排序         | sort           | SORT()         |
| 分组聚合     | group_by       | GROUPBY()      |
| 取前/后 N 行 | take           | TAKE()         |
| 选择/删除列  | select/drop    | CHOOSECOLS()   |

> ⚠️ GROUPBY 函数需要 2023年9月更新版本的 Excel 365。

### 不支持的能力

| 能力       | 替代方案                |
| ---------- | ----------------------- |
| 自由 JOIN  | 用 VLOOKUP 替代         |
| 自定义函数 | 不支持                  |
| 删除行     | 用 filter 筛选替代      |
| 透视表     | 用 group_by 替代        |
