# Excel测试自动化脚本

## 概述

这是一个用于自动化测试Excel处理功能的Python脚本。脚本可以批量处理多个Excel文件，每个文件对应`prompt.txt`文件中的一个段落，每个段落包含多个提示词。

## 功能特性

1. **单一提示词文件**：使用一个`prompt.txt`文件，包含48段提示词，每段对应一个测试样例
2. **自动顺序处理**：支持传入模式（如`1_`）自动处理从指定编号开始的所有文件
3. **灵活的chat窗口模式**：可选择同一个文件的多个提示词使用同一个chat窗口或每个提示词使用新窗口
4. **删除下载逻辑**：不再尝试下载结果文件，改为自动上传下一轮文件
5. **忽略标题行**：自动忽略`prompt.txt`中每段的第一行（标题行）

## 文件结构

```
test/
├── excel_test_automation.py    # 主脚本
├── prompt.txt                  # 提示词文件（48段，每段第一行为标题）
├── 1_AAPL.xlsx                # 示例Excel文件（命名格式：数字_名称.xlsx）
├── 2_GOOGL.xlsx               # 示例Excel文件
├── ...                        # 其他Excel文件（最多48个）
└── README.md                  # 本说明文件
```

## 安装依赖

```bash
# 确保已安装Python 3.7+
python --version

# 安装所需依赖
pip install requests
```

## 使用方法

### 基本语法

```bash
python excel_test_automation.py <文件模式> --username <用户名> --password <密码> [选项]
```

### 参数说明

#### 必需参数
- `文件模式`：可以是以下两种格式之一：
  - `1_`：从以"1_"开头的Excel文件开始顺序处理（自动查找`1_*.xlsx`文件）
  - `1_AAPL.xlsx`：处理单个具体文件
- `--username, -u`：登录用户名
- `--password, -w`：登录密码

#### 可选参数
- `--prompt-file, -p`：提示词文件名（默认：`prompt.txt`）
- `--max-files, -m`：最大处理文件数（默认：48）
- `--base-url, -b`：API基础URL（默认：`http://localhost:8000`）
- `--minio-endpoint, -e`：MinIO端点URL（默认：`http://localhost:9000`）
- `--use-minio-direct`：直接访问MinIO下载文件
- `--same-chat, -s`：同一个文件的多个提示词使用同一个chat窗口（默认：每个提示词使用新窗口）

### 使用示例

#### 示例1：从第1个文件开始顺序处理所有文件（每个提示词使用新窗口）
```bash
python excel_test_automation.py 1_ --username admin --password password123
```

#### 示例2：从第5个文件开始顺序处理10个文件（使用同一个chat窗口）
```bash
python excel_test_automation.py 5_ --username admin --password password123 --max-files 10 --same-chat
```

#### 示例3：处理单个具体文件（每个提示词使用新窗口）
```bash
python excel_test_automation.py 1_AAPL.xlsx --username admin --password password123
```

#### 示例4：处理单个文件（使用同一个chat窗口）
```bash
python excel_test_automation.py 1_AAPL.xlsx --username admin --password password123 --same-chat
```

#### 示例5：使用自定义API端点
```bash
python excel_test_automation.py 1_ --username admin --password password123 --base-url http://192.168.1.100:8000
```

## prompt.txt文件格式

`prompt.txt`文件包含48个段落，每个段落对应一个Excel文件。格式如下：

```
1：美股历史交易行情分析
"帮我计算一下 Volume 这一列的历史总和，还有每日平均成交量。"
"把收盘价（Close）这一列的所有数字四舍五入，只保留2位小数。"
"根据 Open 和 Close 列，计算每天的日收益率，并新增一列显示。"
"帮我算一下收盘价的 20天移动平均线 (MA20)。"
"检查一下有没有 Volume 为 0 或者空值的行，有的话把这些行删掉。"
"从 Date 列里提取出年份和月份，拼成一个'YYYY-MM'格式的新列。"
"把最高价（High）和最低价（Low）都加上美元符号，比如 $150.00。"
"成交量大于一千万的行，在输出时请把成交量用千分位逗号隔开显示。"

2：第二个文件的标题
"第一个提示词..."
"第二个提示词..."
...

```

**注意**：脚本会自动忽略每段的第一行（标题行），只处理后面的提示词。

## Excel文件命名规则

Excel文件应按照以下格式命名：
- `1_AAPL.xlsx`
- `2_GOOGL.xlsx`
- `3_MSFT.xlsx`
- ...

文件名格式：`数字_名称.xlsx`，其中数字对应`prompt.txt`中的段落索引。

## 日志文件

脚本运行时会生成日志文件`excel_test.log`，记录详细的处理过程和结果。

## 注意事项

1. 确保API服务正在运行（默认：`http://localhost:8000`）
2. 确保`prompt.txt`文件与脚本在同一目录下
3. 确保Excel文件与脚本在同一目录下，并按照正确的格式命名
4. 脚本不会下载处理结果文件，而是自动上传下一轮文件进行处理
5. 每个提示词处理之间会有1秒延迟，每个文件处理之间会有2秒延迟，以避免请求过快

## 故障排除

如果遇到问题，请检查：
1. 网络连接是否正常
2. API服务是否可访问
3. 用户名和密码是否正确
4. 文件路径和命名是否正确
5. 查看`excel_test.log`日志文件获取详细错误信息