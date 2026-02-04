"""输出生成器 - 生成思路解读和快捷复现"""

from typing import List, Dict, Any, Optional
from app.engine.models import (
    FileCollection,
    AggregateOperation,
    AddColumnOperation,
    UpdateColumnOperation,
    ComputeOperation,
    FilterOperation,
    SortOperation,
    GroupByOperation,
    CreateSheetOperation,
    TakeOperation,
    SelectColumnsOperation,
    DropColumnsOperation,
)
from app.engine.excel_generator import ExcelFormulaGenerator


# ==================== 常量定义 ====================

# 操作类型中文名映射
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
    "select_columns": "选择列",
    "drop_columns": "删除列",
}

# 高级操作（需要区分 365 / 非 365）
ADVANCED_OPERATIONS = {"filter", "sort", "group_by", "take", "select_columns", "drop_columns"}

# 聚合函数中文名
AGGREGATE_FUNCTION_NAMES = {
    "SUM": "求和",
    "COUNT": "计数",
    "COUNTA": "非空计数",
    "AVERAGE": "平均值",
    "MIN": "最小值",
    "MAX": "最大值",
    "MEDIAN": "中位数",
    "SUMIF": "条件求和",
    "COUNTIF": "条件计数",
    "AVERAGEIF": "条件平均值",
}


# ==================== 思路解读生成 ====================

def generate_strategy(operations: List, tables: FileCollection) -> str:
    """
    生成思路解读

    Args:
        operations: 操作列表（包含 description）
        tables: 文件集合（用于获取文件名）

    Returns:
        思路解读文本
    """
    if not operations:
        return ""

    lines = ["📋 处理思路", ""]
    lines.append(f"本次处理共 {len(operations)} 步：")
    lines.append("")

    # 记录创建的新 sheet，用于后续步骤的引用说明
    created_sheets: Dict[str, int] = {}  # sheet_name -> step_num

    for i, op in enumerate(operations, 1):
        step_lines = _generate_strategy_step(op, tables, i, created_sheets)
        lines.extend(step_lines)
        lines.append("")

    # 添加最终结果说明
    final_result = _generate_final_result_summary(operations, tables)
    if final_result:
        lines.append(f"→ 最终结果：{final_result}")

    return "\n".join(lines)


def _generate_strategy_step(
    op,
    tables: FileCollection,
    step_num: int,
    created_sheets: Dict[str, int]
) -> List[str]:
    """生成单个步骤的思路解读"""
    lines = []

    # 获取描述
    description = _get_description(op)
    lines.append(f"步骤 {step_num}：{description}")

    # 获取操作类型
    op_type = _get_operation_type(op)
    op_type_name = OPERATION_TYPE_NAMES.get(op_type, op_type)
    lines.append(f"├─ 操作：{op_type_name}")

    # 获取目标（文件/工作表）
    target = _get_target_info(op, tables, created_sheets)
    if target:
        lines.append(f"├─ 目标：{target}")

    # 获取详细信息（条件、分组列等）
    details = _get_operation_details(op)
    for detail in details:
        lines.append(f"├─ {detail}")

    # 获取方法
    method = _get_method_info(op)
    lines.append(f"└─ 方法：{method}")

    # 记录创建的新 sheet
    if op_type in ("filter", "group_by", "create_sheet"):
        output = getattr(op, 'output', None) or {}
        if isinstance(output, dict) and output.get("type") == "new_sheet":
            created_sheets[output.get("name", "")] = step_num

    return lines


def _get_description(op) -> str:
    """获取操作描述"""
    if hasattr(op, 'description') and op.description:
        return op.description
    # 兜底描述
    return _generate_fallback_description(op)


def _generate_fallback_description(op) -> str:
    """生成兜底描述"""
    op_type = _get_operation_type(op)

    if isinstance(op, AggregateOperation):
        func_name = AGGREGATE_FUNCTION_NAMES.get(op.function, op.function)
        return f"计算 {op.table} 表「{op.column}」列的{func_name}"

    if isinstance(op, AddColumnOperation):
        return f"在 {op.table} 表中新增「{op.name}」列"

    if isinstance(op, UpdateColumnOperation):
        return f"更新 {op.table} 表中「{op.column}」列的值"

    if isinstance(op, ComputeOperation):
        return f"计算得到 {op.as_var}"

    if isinstance(op, FilterOperation):
        return f"筛选 {op.table} 表中符合条件的数据"

    if isinstance(op, SortOperation):
        return f"对 {op.table} 表进行排序"

    if isinstance(op, GroupByOperation):
        cols = ", ".join(op.group_columns)
        return f"按 {cols} 分组统计 {op.table} 表"

    if isinstance(op, TakeOperation):
        if op.rows > 0:
            return f"从 {op.table} 表取前 {op.rows} 行"
        else:
            return f"从 {op.table} 表取后 {abs(op.rows)} 行"

    if isinstance(op, SelectColumnsOperation):
        cols = ", ".join(op.columns)
        return f"从 {op.table} 表中选择列：{cols}"

    if isinstance(op, DropColumnsOperation):
        cols = ", ".join(op.columns)
        return f"从 {op.table} 表中删除列：{cols}"

    if isinstance(op, CreateSheetOperation):
        return f"创建新工作表「{op.name}」"

    return "执行操作"


def _get_operation_type(op) -> str:
    """获取操作类型"""
    if isinstance(op, AggregateOperation):
        return "aggregate"
    if isinstance(op, AddColumnOperation):
        return "add_column"
    if isinstance(op, UpdateColumnOperation):
        return "update_column"
    if isinstance(op, ComputeOperation):
        return "compute"
    if isinstance(op, FilterOperation):
        return "filter"
    if isinstance(op, SortOperation):
        return "sort"
    if isinstance(op, GroupByOperation):
        return "group_by"
    if isinstance(op, TakeOperation):
        return "take"
    if isinstance(op, SelectColumnsOperation):
        return "select_columns"
    if isinstance(op, DropColumnsOperation):
        return "drop_columns"
    if isinstance(op, CreateSheetOperation):
        return "create_sheet"
    return "unknown"


def _get_target_info(op, tables: FileCollection, created_sheets: Dict[str, int]) -> str:
    """获取目标信息（文件/工作表）"""
    file_id = getattr(op, 'file_id', None)
    table_name = getattr(op, 'table', None) or getattr(op, 'name', None)

    if not file_id:
        return ""

    try:
        excel_file = tables.get_file(file_id)
        filename = excel_file.filename
    except Exception:
        filename = file_id

    target = f"{filename} / {table_name}"

    # 如果是引用之前创建的 sheet，添加说明
    if table_name in created_sheets:
        target += f"（步骤 {created_sheets[table_name]} 创建）"

    return target


def _get_operation_details(op) -> List[str]:
    """获取操作的详细信息"""
    details = []

    if isinstance(op, FilterOperation):
        # 筛选条件
        conditions = []
        for cond in op.conditions:
            col = cond.get("column", "")
            operator = cond.get("op", "=")
            value = cond.get("value", "")
            if isinstance(value, str):
                conditions.append(f'{col} {operator} "{value}"')
            else:
                conditions.append(f'{col} {operator} {value}')

        logic = op.logic or "AND"
        logic_cn = "且" if logic == "AND" else "或"
        details.append(f"条件：{f' {logic_cn} '.join(conditions)}")

    elif isinstance(op, SortOperation):
        # 排序规则
        rules = []
        for rule in op.by:
            col = rule.get("column", "")
            order = rule.get("order", "asc")
            order_cn = "升序" if order == "asc" else "降序"
            rules.append(f"{col}（{order_cn}）")
        details.append(f"排序列：{', '.join(rules)}")

    elif isinstance(op, GroupByOperation):
        # 分组列和聚合
        details.append(f"分组列：{', '.join(op.group_columns)}")
        aggs = []
        for agg in op.aggregations:
            func = AGGREGATE_FUNCTION_NAMES.get(agg["function"], agg["function"])
            aggs.append(f"{agg['column']} 的{func}")
        details.append(f"计算：{', '.join(aggs)}")

    elif isinstance(op, SelectColumnsOperation):
        details.append(f"保留列：{', '.join(op.columns)}")

    elif isinstance(op, DropColumnsOperation):
        details.append(f"删除列：{', '.join(op.columns)}")

    elif isinstance(op, AggregateOperation):
        # 条件聚合的条件
        if op.condition_column and op.condition is not None:
            details.append(f"条件：{op.condition_column} = {op.condition}")

    return details


def _get_method_info(op) -> str:
    """获取使用的方法/函数"""
    if isinstance(op, AggregateOperation):
        return f"{op.function} 函数"

    if isinstance(op, AddColumnOperation) or isinstance(op, UpdateColumnOperation):
        # 从 formula 中提取使用的函数
        formula = getattr(op, 'formula', None)
        if formula:
            funcs = _extract_functions_from_formula(formula)
            if funcs:
                return f"{', '.join(funcs)} 函数"
        return "公式计算"

    if isinstance(op, ComputeOperation):
        return "标量运算"

    if isinstance(op, FilterOperation):
        logic = op.logic or "AND"
        logic_desc = "AND 逻辑" if logic == "AND" else "OR 逻辑"
        return f"FILTER 函数（{logic_desc}）"

    if isinstance(op, SortOperation):
        if len(op.by) > 1:
            return "SORT 函数（多列排序）"
        order = op.by[0].get("order", "asc") if op.by else "asc"
        order_desc = "升序" if order == "asc" else "降序"
        return f"SORT 函数（{order_desc}）"

    if isinstance(op, GroupByOperation):
        return "GROUPBY 函数"

    if isinstance(op, TakeOperation):
        return "TAKE 函数"

    if isinstance(op, SelectColumnsOperation):
        return "CHOOSECOLS 函数"

    if isinstance(op, DropColumnsOperation):
        return "CHOOSECOLS 函数"

    if isinstance(op, CreateSheetOperation):
        source_type = (op.source or {}).get("type", "empty")
        if source_type == "copy":
            return "复制工作表"
        return "新建工作表"

    return "Excel 操作"


def _extract_functions_from_formula(formula: Dict) -> List[str]:
    """从公式中提取使用的函数"""
    funcs = set()
    _collect_functions(formula, funcs)
    return list(funcs)


def _collect_functions(expr: Any, funcs: set):
    """递归收集表达式中的函数"""
    if not isinstance(expr, dict):
        return

    if "func" in expr:
        funcs.add(expr["func"])
        for arg in expr.get("args", []):
            _collect_functions(arg, funcs)

    if "op" in expr:
        _collect_functions(expr.get("left"), funcs)
        _collect_functions(expr.get("right"), funcs)


def _generate_final_result_summary(operations: List, tables: FileCollection) -> str:
    """生成最终结果说明"""
    # 检查是否有新建的 sheet
    new_sheets = []
    for op in operations:
        if isinstance(op, FilterOperation) or isinstance(op, GroupByOperation):
            output = getattr(op, 'output', None) or {}
            if isinstance(output, dict) and output.get("type") == "new_sheet":
                new_sheets.append(output.get("name", ""))
        elif isinstance(op, CreateSheetOperation):
            new_sheets.append(op.name)
        elif isinstance(op, (SelectColumnsOperation, DropColumnsOperation, SortOperation, TakeOperation)):
            output = getattr(op, 'output', None) or {}
            if isinstance(output, dict) and output.get("type") == "new_sheet":
                new_sheets.append(output.get("name", ""))

    # 检查是否有新增的列
    new_columns = []
    for op in operations:
        if isinstance(op, AddColumnOperation):
            new_columns.append(f"「{op.name}」")

    parts = []
    if new_sheets:
        parts.append(f"新建工作表 {', '.join(new_sheets)}")
    if new_columns:
        parts.append(f"新增列 {', '.join(new_columns)}")

    if parts:
        return "；".join(parts)

    return "处理完成"


# ==================== 快捷复现生成 ====================

def generate_manual_steps(operations: List, tables: FileCollection) -> str:
    """
    生成快捷复现步骤

    Args:
        operations: 操作列表
        tables: 文件集合

    Returns:
        手动操作步骤文本
    """
    if not operations:
        return ""

    lines = ["🔧 手动操作步骤", ""]

    # 创建公式生成器
    formula_generator = ExcelFormulaGenerator(tables)

    # 收集高级操作的公式（用于 365 提示）
    advanced_formulas = []

    for i, op in enumerate(operations, 1):
        step_lines, formula_info = _generate_manual_step(op, tables, i, formula_generator)
        lines.extend(step_lines)
        lines.append("")

        if formula_info:
            advanced_formulas.append(formula_info)

    # 如果有高级操作，添加 Excel 365 提示
    if advanced_formulas:
        lines.append("---")
        lines.append("💡 Excel 365 用户提示")
        lines.append("如果你使用 Excel 365，可以用以下公式替代部分操作：")
        lines.append("")
        for formula in advanced_formulas:
            lines.append(f"步骤 {formula['step']}（{formula['description']}）：")
            lines.append(f"   {formula['formula']}")
            lines.append("")

    return "\n".join(lines)


def _generate_manual_step(
    op,
    tables: FileCollection,
    step_num: int,
    formula_generator: ExcelFormulaGenerator
) -> tuple:
    """
    生成单个步骤的手动操作说明

    Returns:
        (步骤文本列表, 高级操作公式信息 or None)
    """
    op_type = _get_operation_type(op)
    description = _get_description(op)

    lines = [f"步骤 {step_num}：{description}"]
    formula_info = None

    if isinstance(op, FilterOperation):
        step_lines, formula = _generate_filter_manual_steps(op, tables)
        lines.extend(step_lines)
        formula_info = {
            "step": step_num,
            "description": description,
            "formula": formula
        }

    elif isinstance(op, SortOperation):
        step_lines, formula = _generate_sort_manual_steps(op, tables)
        lines.extend(step_lines)
        formula_info = {
            "step": step_num,
            "description": description,
            "formula": formula
        }

    elif isinstance(op, GroupByOperation):
        step_lines, formula = _generate_groupby_manual_steps(op, tables)
        lines.extend(step_lines)
        formula_info = {
            "step": step_num,
            "description": description,
            "formula": formula
        }

    elif isinstance(op, TakeOperation):
        step_lines, formula = _generate_take_manual_steps(op, tables)
        lines.extend(step_lines)
        formula_info = {
            "step": step_num,
            "description": description,
            "formula": formula
        }

    elif isinstance(op, SelectColumnsOperation):
        step_lines, formula = _generate_select_columns_manual_steps(op, tables)
        lines.extend(step_lines)
        formula_info = {
            "step": step_num,
            "description": description,
            "formula": formula
        }

    elif isinstance(op, DropColumnsOperation):
        step_lines, formula = _generate_drop_columns_manual_steps(op, tables)
        lines.extend(step_lines)
        formula_info = {
            "step": step_num,
            "description": description,
            "formula": formula
        }

    elif isinstance(op, AddColumnOperation):
        step_lines = _generate_add_column_manual_steps(op, tables, formula_generator)
        lines.extend(step_lines)

    elif isinstance(op, UpdateColumnOperation):
        step_lines = _generate_update_column_manual_steps(op, tables, formula_generator)
        lines.extend(step_lines)

    elif isinstance(op, AggregateOperation):
        step_lines = _generate_aggregate_manual_steps(op, tables, formula_generator)
        lines.extend(step_lines)

    elif isinstance(op, CreateSheetOperation):
        step_lines = _generate_create_sheet_manual_steps(op, tables)
        lines.extend(step_lines)

    elif isinstance(op, ComputeOperation):
        step_lines = _generate_compute_manual_steps(op, tables, formula_generator)
        lines.extend(step_lines)

    else:
        lines.append("   （此操作类型暂不支持手动复现）")

    return lines, formula_info


def _generate_filter_manual_steps(op: FilterOperation, tables: FileCollection) -> tuple:
    """生成 filter 操作的手动步骤"""
    try:
        excel_file = tables.get_file(op.file_id)
        filename = excel_file.filename
    except Exception:
        filename = "Excel 文件"

    output_name = (op.output or {}).get("name", "筛选结果")

    # 构建条件描述
    condition_steps = []
    for cond in op.conditions:
        col = cond.get("column", "")
        operator = cond.get("op", "=")
        value = cond.get("value", "")

        if operator == "=":
            condition_steps.append(f"   - 在「{col}」列下拉菜单中，只勾选 \"{value}\"")
        elif operator == "contains":
            condition_steps.append(f"   - 在「{col}」列中筛选包含 \"{value}\" 的数据")
        else:
            condition_steps.append(f"   - 在「{col}」列中设置条件：{operator} {value}")

    lines = [
        f"   1. 打开 {filename}，切换到「{op.table}」工作表",
        f"   2. 选中数据区域（包含表头）",
        f"   3. 点击「数据」→「筛选」",
    ]

    for i, cond_step in enumerate(condition_steps, 4):
        lines.append(f"   {i}. {cond_step[5:]}")  # 去掉前面的 "   - "

    next_num = 4 + len(condition_steps)
    lines.extend([
        f"   {next_num}. 选中筛选后的所有数据（包含表头），按 Ctrl+C 复制",
        f"   {next_num + 1}. 新建工作表，命名为「{output_name}」",
        f"   {next_num + 2}. 在 A1 单元格按 Ctrl+V 粘贴",
        f"   {next_num + 3}. 返回「{op.table}」工作表，点击「数据」→「清除」取消筛选",
    ])

    # 生成 Excel 365 公式
    formula = _generate_filter_365_formula(op, tables)

    return lines, formula


def _generate_filter_365_formula(op: FilterOperation, tables: FileCollection) -> str:
    """生成 filter 的 Excel 365 公式"""
    table_name = op.table

    # 构建条件
    conditions = []
    for cond in op.conditions:
        col = cond.get("column", "")
        operator = cond.get("op", "=")
        value = cond.get("value", "")

        # 简化：假设列名就是列引用
        if isinstance(value, str):
            conditions.append(f'({table_name}![{col}]="{value}")')
        else:
            conditions.append(f'({table_name}![{col}]{operator}{value})')

    logic = op.logic or "AND"
    if logic == "AND":
        condition_str = "*".join(conditions)
    else:
        condition_str = "+".join(conditions)

    return f"=FILTER({table_name}!A:Z, {condition_str})"


def _generate_sort_manual_steps(op: SortOperation, tables: FileCollection) -> tuple:
    """生成 sort 操作的手动步骤"""
    try:
        excel_file = tables.get_file(op.file_id)
        filename = excel_file.filename
    except Exception:
        filename = "Excel 文件"

    # 构建排序规则描述
    sort_rules = []
    for rule in op.by:
        col = rule.get("column", "")
        order = rule.get("order", "asc")
        order_cn = "升序（A→Z）" if order == "asc" else "降序（Z→A）"
        sort_rules.append(f"「{col}」列，次序选择「{order_cn}」")

    lines = [
        f"   1. 打开 {filename}，切换到「{op.table}」工作表",
        f"   2. 选中所有数据（包含表头）",
        f"   3. 点击「数据」→「排序」",
    ]

    if len(sort_rules) == 1:
        lines.append(f"   4. 主要关键字选择 {sort_rules[0]}")
    else:
        for i, rule in enumerate(sort_rules):
            level = "主要" if i == 0 else f"次要{i}"
            lines.append(f"   {4 + i}. {level}关键字选择 {rule}")

    lines.append(f"   {4 + len(sort_rules)}. 点击「确定」")

    # 生成 Excel 365 公式
    formula = _generate_sort_365_formula(op, tables)

    return lines, formula


def _generate_sort_365_formula(op: SortOperation, tables: FileCollection) -> str:
    """生成 sort 的 Excel 365 公式"""
    table_name = op.table

    # 简化：假设第一个排序列
    if op.by:
        col = op.by[0].get("column", "A")
        order = op.by[0].get("order", "asc")
        order_num = "1" if order == "asc" else "-1"
        return f"=SORT({table_name}!A:Z, MATCH(\"{col}\", {table_name}!1:1, 0), {order_num})"

    return f"=SORT({table_name}!A:Z)"


def _generate_groupby_manual_steps(op: GroupByOperation, tables: FileCollection) -> tuple:
    """生成 group_by 操作的手动步骤"""
    try:
        excel_file = tables.get_file(op.file_id)
        filename = excel_file.filename
    except Exception:
        filename = "Excel 文件"

    output_name = op.output.get("name", "分组统计")
    group_cols = ", ".join([f"「{c}」" for c in op.group_columns])

    # 聚合描述
    agg_desc = []
    for agg in op.aggregations:
        func = AGGREGATE_FUNCTION_NAMES.get(agg["function"], agg["function"])
        agg_desc.append(f"「{agg['column']}」的{func}")

    lines = [
        f"   1. 打开 {filename}，切换到「{op.table}」工作表",
        f"   2. 选中所有数据（包含表头）",
        f"   3. 点击「插入」→「数据透视表」",
        f"   4. 选择「新工作表」，点击「确定」",
        f"   5. 在右侧「数据透视表字段」面板中：",
        f"      - 将 {group_cols} 拖到「行」区域",
    ]

    for i, agg in enumerate(op.aggregations):
        func = agg["function"]
        col = agg["column"]
        lines.append(f"      - 将「{col}」拖到「值」区域，右键选择「值汇总方式」→「{func}」")

    lines.extend([
        f"   6. 将工作表重命名为「{output_name}」",
    ])

    # 生成 Excel 365 公式
    formula = _generate_groupby_365_formula(op, tables)

    return lines, formula


def _generate_groupby_365_formula(op: GroupByOperation, tables: FileCollection) -> str:
    """生成 group_by 的 Excel 365 公式"""
    table_name = op.table
    group_col = op.group_columns[0] if op.group_columns else "A"

    if op.aggregations:
        agg = op.aggregations[0]
        agg_col = agg["column"]
        agg_func = agg["function"]
        return f"=GROUPBY({table_name}![{group_col}], {table_name}![{agg_col}], {agg_func})"

    return f"=GROUPBY({table_name}!A:A, {table_name}!B:B, COUNT)"


def _generate_take_manual_steps(op: TakeOperation, tables: FileCollection) -> tuple:
    """生成 take 操作的手动步骤"""
    try:
        excel_file = tables.get_file(op.file_id)
        filename = excel_file.filename
    except Exception:
        filename = "Excel 文件"

    if op.rows > 0:
        # 取前 N 行
        keep_rows = op.rows + 1  # 包含表头
        lines = [
            f"   1. 打开 {filename}，切换到「{op.table}」工作表",
            f"   2. 点击第 {keep_rows + 1} 行的行号",
            f"   3. 按 Ctrl+Shift+End 选中到最后一行",
            f"   4. 右键 →「删除」",
        ]
    else:
        # 取后 N 行
        keep_rows = abs(op.rows)
        lines = [
            f"   1. 打开 {filename}，切换到「{op.table}」工作表",
            f"   2. 找到最后一行数据的行号（假设为 N）",
            f"   3. 点击第 2 行的行号",
            f"   4. 按住 Shift，点击第 N-{keep_rows} 行的行号（选中要删除的行）",
            f"   5. 右键 →「删除」",
        ]

    # 生成 Excel 365 公式
    formula = f"=TAKE({op.table}!A:Z, {op.rows})"

    return lines, formula


def _generate_select_columns_manual_steps(op: SelectColumnsOperation, tables: FileCollection) -> tuple:
    """生成 select_columns 操作的手动步骤"""
    try:
        excel_file = tables.get_file(op.file_id)
        filename = excel_file.filename
    except Exception:
        filename = "Excel 文件"

    output_type = op.output.get("type", "in_place") if op.output else "in_place"
    output_name = op.output.get("name", "结果") if op.output else "结果"
    cols = "、".join([f"「{c}」" for c in op.columns])

    if output_type == "new_sheet":
        lines = [
            f"   1. 打开 {filename}，切换到「{op.table}」工作表",
            f"   2. 按住 Ctrl（或 Cmd）依次点击列标题，选中 {cols}",
            f"   3. 按 Ctrl+C 复制选中列",
            f"   4. 新建工作表，命名为「{output_name}」",
            f"   5. 在 A1 单元格按 Ctrl+V 粘贴",
        ]
    else:
        lines = [
            f"   1. 打开 {filename}，切换到「{op.table}」工作表",
            f"   2. 按住 Ctrl（或 Cmd）依次点击列标题，选中 {cols}",
            f"   3. 右键选中列 →「复制」",
            f"   4. 新建工作表，将 A1 作为粘贴起点粘贴",
            f"   5. 删除原工作表，重命名新工作表为「{op.table}」",
        ]

    formula = _generate_select_columns_365_formula(op, tables)
    return lines, formula


def _generate_drop_columns_manual_steps(op: DropColumnsOperation, tables: FileCollection) -> tuple:
    """生成 drop_columns 操作的手动步骤"""
    try:
        excel_file = tables.get_file(op.file_id)
        filename = excel_file.filename
    except Exception:
        filename = "Excel 文件"

    output_type = op.output.get("type", "in_place") if op.output else "in_place"
    output_name = op.output.get("name", "结果") if op.output else "结果"
    cols = "、".join([f"「{c}」" for c in op.columns])

    if output_type == "new_sheet":
        lines = [
            f"   1. 打开 {filename}，切换到「{op.table}」工作表",
            f"   2. 选中除 {cols} 外的所有列（可按住 Ctrl 逐列选择）",
            f"   3. 按 Ctrl+C 复制选中列",
            f"   4. 新建工作表，命名为「{output_name}」",
            f"   5. 在 A1 单元格按 Ctrl+V 粘贴",
        ]
    else:
        lines = [
            f"   1. 打开 {filename}，切换到「{op.table}」工作表",
            f"   2. 按住 Ctrl（或 Cmd）依次点击列标题，选中要删除的列：{cols}",
            f"   3. 右键 →「删除」",
        ]

    formula = _generate_drop_columns_365_formula(op, tables)
    return lines, formula


def _generate_select_columns_365_formula(op: SelectColumnsOperation, tables: FileCollection) -> str:
    """生成 select_columns 的 Excel 365 公式"""
    table_name = op.table
    try:
        table = tables.get_table(op.file_id, table_name)
        all_cols = table.get_columns()
        indices = [str(all_cols.index(col) + 1) for col in op.columns]
        return f"=CHOOSECOLS({table_name}!A:Z, {', '.join(indices)})"
    except Exception:
        if not op.columns:
            return f"=CHOOSECOLS({table_name}!A:Z, ...)"
        indices = [f'MATCH("{col}", {table_name}!1:1, 0)' for col in op.columns]
        return f"=CHOOSECOLS({table_name}!A:Z, {', '.join(indices)})"


def _generate_drop_columns_365_formula(op: DropColumnsOperation, tables: FileCollection) -> str:
    """生成 drop_columns 的 Excel 365 公式"""
    table_name = op.table
    try:
        table = tables.get_table(op.file_id, table_name)
        all_cols = table.get_columns()
        keep_cols = [col for col in all_cols if col not in op.columns]
        indices = [str(all_cols.index(col) + 1) for col in keep_cols]
        return f"=CHOOSECOLS({table_name}!A:Z, {', '.join(indices)})"
    except Exception:
        if not op.columns:
            return f"=CHOOSECOLS({table_name}!A:Z, ...)"
        drop_part = ", ".join([f'"{col}"' for col in op.columns])
        return (
            f"=CHOOSECOLS({table_name}!A:Z, "
            f"FILTER(SEQUENCE(1, COLUMNS({table_name}!A:Z)), "
            f"ISNA(MATCH({table_name}!1:1, {{{drop_part}}}, 0))))"
        )


def _generate_add_column_manual_steps(
    op: AddColumnOperation,
    tables: FileCollection,
    formula_generator: ExcelFormulaGenerator
) -> List[str]:
    """生成 add_column 操作的手动步骤"""
    try:
        excel_file = tables.get_file(op.file_id)
        filename = excel_file.filename
    except Exception:
        filename = "Excel 文件"

    # 生成公式
    formula = ""
    if isinstance(op.formula, dict):
        formula_template = formula_generator.generate_formula(
            op.formula, op.file_id, op.table
        )
        formula = f"={formula_template}".replace("{row}", "2")  # 用第 2 行作为示例

    lines = [
        f"   1. 打开 {filename}，切换到「{op.table}」工作表",
        f"   2. 在最后一列的右边空白列的表头单元格输入「{op.name}」",
    ]

    if formula:
        lines.append(f"   3. 在该列的第一个数据单元格（第 2 行）输入公式：")
        lines.append(f"      {formula}")
        lines.append(f"   4. 选中该单元格，双击右下角的填充柄（或按 Ctrl+D）向下填充到所有数据行")
    else:
        lines.append(f"   3. 根据业务逻辑在该列输入相应的公式或数据")

    return lines


def _generate_update_column_manual_steps(
    op: UpdateColumnOperation,
    tables: FileCollection,
    formula_generator: ExcelFormulaGenerator
) -> List[str]:
    """生成 update_column 操作的手动步骤"""
    try:
        excel_file = tables.get_file(op.file_id)
        filename = excel_file.filename
    except Exception:
        filename = "Excel 文件"

    # 生成公式
    formula = ""
    if isinstance(op.formula, dict):
        formula_template = formula_generator.generate_formula(
            op.formula, op.file_id, op.table
        )
        formula = f"={formula_template}".replace("{row}", "2")

    lines = [
        f"   1. 打开 {filename}，切换到「{op.table}」工作表",
        f"   2. 在「{op.column}」列旁边插入一个临时列",
    ]

    if formula:
        lines.append(f"   3. 在临时列的第一个数据单元格（第 2 行）输入公式：")
        lines.append(f"      {formula}")
    else:
        lines.append(f"   3. 在临时列的第一个数据单元格输入相应公式")

    lines.extend([
        f"   4. 向下填充公式到所有数据行",
        f"   5. 选中临时列的所有数据，按 Ctrl+C 复制",
        f"   6. 选中「{op.column}」列的数据区域，右键 →「选择性粘贴」→「值」",
        f"   7. 删除临时列",
    ])

    return lines


def _generate_aggregate_manual_steps(
    op: AggregateOperation,
    tables: FileCollection,
    formula_generator: ExcelFormulaGenerator
) -> List[str]:
    """生成 aggregate 操作的手动步骤"""
    try:
        excel_file = tables.get_file(op.file_id)
        filename = excel_file.filename
    except Exception:
        filename = "Excel 文件"

    func_name = AGGREGATE_FUNCTION_NAMES.get(op.function, op.function)

    # 生成聚合公式
    col_letter = formula_generator._find_column_letter(op.file_id, op.table, op.column)
    col_range = f"{op.table}!{col_letter}:{col_letter}"

    if op.function in ("SUMIF", "COUNTIF", "AVERAGEIF") and op.condition_column:
        # 条件聚合
        cond_letter = formula_generator._find_column_letter(op.file_id, op.table, op.condition_column)
        cond_range = f"{op.table}!{cond_letter}:{cond_letter}"
        if isinstance(op.condition, str):
            formula = f"={op.function}({cond_range}, \"{op.condition}\", {col_range})"
        else:
            formula = f"={op.function}({cond_range}, {op.condition}, {col_range})"
    else:
        # 简单聚合
        formula = f"={op.function}({col_range})"

    lines = [
        f"   1. 打开 {filename}，切换到「{op.table}」工作表",
        f"   2. 在空白单元格输入公式：",
        f"      {formula}",
        f"   3. 结果即为「{op.column}」列的{func_name}",
    ]

    if op.as_var:
        lines.append(f"   4. 此结果将用于后续计算（记录为 {op.as_var}）")

    return lines


def _generate_create_sheet_manual_steps(op: CreateSheetOperation, tables: FileCollection) -> List[str]:
    """生成 create_sheet 操作的手动步骤"""
    source_type = (op.source or {}).get("type", "empty")

    if source_type == "copy":
        source_table = op.source.get("table", "")
        lines = [
            f"   1. 右键点击「{source_table}」工作表标签",
            f"   2. 选择「移动或复制」",
            f"   3. 勾选「建立副本」，点击「确定」",
            f"   4. 将新工作表重命名为「{op.name}」",
        ]
    else:
        lines = [
            f"   1. 右键点击任意工作表标签",
            f"   2. 选择「插入」→「工作表」",
            f"   3. 将新工作表重命名为「{op.name}」",
        ]

    return lines


def _generate_compute_manual_steps(
    op: ComputeOperation,
    tables: FileCollection,
    formula_generator: ExcelFormulaGenerator
) -> List[str]:
    """生成 compute 操作的手动步骤"""
    # compute 通常是基于前面 aggregate 结果的计算
    # 这里生成一个说明性的步骤

    lines = [
        f"   1. 此步骤基于前面聚合结果进行计算",
    ]

    if op.expression:
        # 尝试生成公式（可能包含变量引用）
        formula_str = _describe_compute_formula(op.expression)
        lines.append(f"   2. 计算公式：{formula_str}")

    lines.append(f"   3. 结果记录为变量 {op.as_var}，供后续步骤使用")

    return lines


def _describe_compute_formula(formula: Dict) -> str:
    """描述 compute 公式（简化版，用于手动步骤说明）"""
    if not isinstance(formula, dict):
        return str(formula)

    if "value" in formula:
        return str(formula["value"])

    if "var" in formula:
        return f"${{{formula['var']}}}"

    if "op" in formula:
        left = _describe_compute_formula(formula.get("left", {}))
        right = _describe_compute_formula(formula.get("right", {}))
        return f"({left} {formula['op']} {right})"

    if "func" in formula:
        args = [_describe_compute_formula(arg) for arg in formula.get("args", [])]
        return f"{formula['func']}({', '.join(args)})"

    return "..."
