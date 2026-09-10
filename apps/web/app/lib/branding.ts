/**
 * 产品品牌配置
 */

// 品牌配置
const BRAND = {
  default: {
    name: "Selgetabel",
    description: "AI 驱动的 Excel 智能处理",
    footer: "让数据处理更简单。",
  },
};

function getBranding() {
  return BRAND.default;
}

export function getProductName(): string {
  return getBranding().name;
}

export function getProductDescription(): string {
  return getBranding().description;
}

export function getProductFooter(): string {
  return getBranding().footer;
}

