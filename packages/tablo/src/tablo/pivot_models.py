"""Pivot 数据透视操作的数据模型"""

from typing import List, Optional, Dict, Any, Literal
from dataclasses import dataclass


@dataclass
class PivotAggregation:
    """数据透视值区域聚合定义"""
    column: str      # 要聚合的列名
    function: str     # 聚合函数：SUM, COUNT, AVERAGE, MIN, MAX
    as_name: str      # 聚合结果列名（as 别名）

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PivotAggregation":
        return cls(
            column=data["column"],
            function=data["function"].upper(),
            as_name=data["as"]
        )


@dataclass
class PivotSort:
    """数据透视排序定义"""
    by: str           # 排序列名
    order: str = "asc"  # asc 或 desc

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PivotSort":
        return cls(
            by=data["by"],
            order=data.get("order", "asc")
        )


@dataclass
class PivotFilter:
    """数据透视前筛选条件"""
    column: str   # 列名
    op: str       # 运算符：=, <>, >, <, >=, <=, contains
    value: Any    # 筛选值

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PivotFilter":
        return cls(
            column=data["column"],
            op=data["op"],
            value=data["value"]
        )


@dataclass
class PivotOperation:
    """
    数据透视操作（Excel 365+ PIVOTBY 函数）

    按行字段和列字段进行交叉分组聚合，生成真正的二维透视表
    """
    # 必需字段（无默认值）
    file_id: str                                   # 文件 ID
    table: str                                     # 源表名
    row_fields: List[str]                          # 行区域分组列（至少1个）
    values: List[PivotAggregation]                  # 值区域聚合定义
    output: Dict[str, str]                         # {"type": "new_sheet", "name": "..."}
    # 可选字段（有默认值）
    type: Literal["pivot"] = "pivot"
    description: str = ""                           # 操作描述
    col_fields: Optional[List[str]] = None          # 列区域分组列（为空则只有行分组）
    sort: Optional[PivotSort] = None               # 排序规则
    filter: Optional[List[PivotFilter]] = None      # 透视前筛选条件

    # 有效的聚合函数
    VALID_FUNCTIONS = {"SUM", "COUNT", "AVERAGE", "MIN", "MAX"}

    def __post_init__(self):
        # 验证聚合函数
        for v in self.values:
            if v.function not in self.VALID_FUNCTIONS:
                raise ValueError(f"不支持的聚合函数: {v.function}")

        # 验证排序
        if self.sort and self.sort.order not in {"asc", "desc"}:
            raise ValueError(f"sort.order 必须是 'asc' 或 'desc'，收到: {self.sort.order}")

        # 验证输出类型
        if self.output.get("type") != "new_sheet":
            raise ValueError(f"pivot 的 output.type 必须是 'new_sheet'")
        if "name" not in self.output:
            raise ValueError("pivot 的 output 必须指定 'name'")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PivotOperation":
        """从字典创建 PivotOperation"""
        # 解析 values
        values = [PivotAggregation.from_dict(v) for v in data["values"]]

        # 解析 sort
        sort = None
        if data.get("sort"):
            sort = PivotSort.from_dict(data["sort"])

        # 解析 filter
        filter_list = None
        if data.get("filter"):
            filter_list = [PivotFilter.from_dict(f) for f in data["filter"]]

        return cls(
            file_id=data["file_id"],
            table=data["table"],
            row_fields=data["row_fields"],
            values=values,
            output=data["output"],
            type="pivot",
            description=data.get("description", ""),
            col_fields=data.get("col_fields"),
            sort=sort,
            filter=filter_list
        )

