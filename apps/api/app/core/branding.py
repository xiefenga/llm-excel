"""产品品牌配置"""



# 默认（英文）品牌配置
DEFAULT_BRANDING = {
    "name": "Selgetabel",
    "description": "AI 驱动的 Excel 智能处理",
    "footer": "让数据处理更简单。",
}



def get_branding() -> dict:
    """
    获取当前品牌配置

    Returns:
        dict: 包含 name, description, footer 的品牌配置
    """
    return DEFAULT_BRANDING


def get_product_name() -> str:
    """获取产品名称"""
    return get_branding()["name"]


def get_product_description() -> str:
    """获取产品描述"""
    return get_branding()["description"]


def get_product_footer() -> str:
    """获取产品页脚文案"""
    return get_branding()["footer"]
