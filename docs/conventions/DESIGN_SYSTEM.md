# Selgetabel 设计系统

适用范围：`apps/web` 前端应用

---

## 1. 品牌标识

Selgetabel 品牌视觉融合两个核心概念：

- **Excel / 数据** → 绿色系（Emerald）- 代表数据、表格、准确性
- **AI / 智能** → 蓝色系（Blue）- 代表智能、科技、创新

### Logo 色彩

| 元素           | 渐变方向 | 起点色    | 终点色    | 用途             |
| -------------- | -------- | --------- | --------- | ---------------- |
| **AI 大脑**    | ↘ 对角   | `#1E40AF` | `#3B82F6` | 代表智能处理能力 |
| **Excel 表格** | ↘ 对角   | `#059669` | `#10B981` | 代表数据与表格   |
| **数据流**     | ↓ 垂直   | `#3B82F6` | `#10B981` | AI 与数据的连接  |

### Logo 组件

- 动态版本：`<Logo size={100} />`（带动画）
- 静态版本：`<LogoStatic size={100} />`
- 带文字版本：`<LogoWithText size={40} />`
- 路径：`~/components/logo.tsx`

### 品牌名称样式

渐变色：`from-emerald-700 via-teal-700 to-blue-700`

---

## 2. 颜色系统

### 2.1 品牌色（Brand Colors）

#### 主品牌色（Excel Green）

| 名称             | CSS 变量         | 色值      | 用途               |
| ---------------- | ---------------- | --------- | ------------------ |
| **Brand**        | `--brand`        | `#059669` | 主要按钮、强调元素 |
| **Brand Light**  | `--brand-light`  | `#10B981` | 悬停状态、渐变终点 |
| **Brand Dark**   | `--brand-dark`   | `#047857` | 深色变体、边框     |
| **Brand Darker** | `--brand-darker` | `#065F46` | 深色背景文字       |

#### 辅助品牌色（AI Blue）

| 名称                     | CSS 变量                 | 色值      | 用途        |
| ------------------------ | ------------------------ | --------- | ----------- |
| **Brand Secondary**      | `--brand-secondary`      | `#3B82F6` | AI 相关元素 |
| **Brand Secondary Dark** | `--brand-secondary-dark` | `#1E40AF` | 深色变体    |

#### 强调色

| 名称             | CSS 变量         | 色值      | 用途         |
| ---------------- | ---------------- | --------- | ------------ |
| **Brand Accent** | `--brand-accent` | `#22D3EE` | 数据流、动画 |
| **Brand Teal**   | `--brand-teal`   | `#14B8A6` | 渐变过渡色   |

### 2.2 功能色（Semantic Colors）

| 名称        | CSS 变量          | 色值      | 用途               |
| ----------- | ----------------- | --------- | ------------------ |
| **Success** | `--color-success` | `#10B981` | 成功状态、完成提示 |
| **Warning** | `--color-warning` | `#F59E0B` | 警告状态、注意提示 |
| **Error**   | `--color-error`   | `#EF4444` | 错误状态、失败提示 |
| **Info**    | `--color-info`    | `#3B82F6` | 信息提示、帮助说明 |

### 2.3 中性色（Neutral Colors）

基于 shadcn/UI 的中性灰色系，使用 OKLCH 色彩空间。

| 用途                 | CSS 变量             | 亮色模式            | 深色模式              |
| -------------------- | -------------------- | ------------------- | --------------------- |
| **Background**       | `--background`       | `oklch(1 0 0)`      | `oklch(0.145 0 0)`   |
| **Foreground**       | `--foreground`       | `oklch(0.145 0 0)`  | `oklch(0.985 0 0)`   |
| **Card**             | `--card`             | `oklch(1 0 0)`      | `oklch(0.205 0 0)`   |
| **Muted**            | `--muted`            | `oklch(0.97 0 0)`   | `oklch(0.269 0 0)`   |
| **Muted Foreground** | `--muted-foreground` | `oklch(0.556 0 0)`  | `oklch(0.708 0 0)`   |
| **Border**           | `--border`           | `oklch(0.922 0 0)`  | `oklch(1 0 0 / 10%)` |
| **Input**            | `--input`            | `oklch(0.922 0 0)`  | —                     |
| **Ring**             | `--ring`             | `oklch(0.708 0 0)`  | —                     |

### 2.4 图表色

| 名称    | 亮色模式                    | 深色模式                     |
| ------- | --------------------------- | ---------------------------- |
| Chart 1 | `oklch(0.646 0.222 41.116)` | `oklch(0.488 0.243 264.376)` |
| Chart 2 | `oklch(0.6 0.118 184.704)`  | `oklch(0.696 0.17 162.48)`   |
| Chart 3 | `oklch(0.398 0.07 227.392)` | `oklch(0.769 0.188 70.08)`   |
| Chart 4 | `oklch(0.828 0.189 84.429)` | `oklch(0.627 0.265 303.9)`   |
| Chart 5 | `oklch(0.769 0.188 70.08)`  | `oklch(0.645 0.246 16.439)`  |

### 2.5 业务语义色

#### 步骤状态色

| 状态        | Tailwind 类                                              |
| ----------- | -------------------------------------------------------- |
| **Pending** | `text-gray-400` `bg-gray-50`                             |
| **Running** | `text-emerald-600` `bg-emerald-50` `ring-emerald-500/20` |
| **Done**    | `text-emerald-600` `bg-emerald-100`                      |
| **Error**   | `text-red-600` `bg-red-50` `border-red-200`              |

#### 内容块颜色

| 内容类型     | 背景            | 边框               | 文字               |
| ------------ | --------------- | ------------------ | ------------------ |
| **思路解读** | `bg-blue-50`    | `border-blue-200`  | `text-blue-700`    |
| **快捷复现** | `bg-amber-50`   | `border-amber-200` | `text-amber-700`   |
| **文件下载** | `bg-emerald-50` | -                  | `text-emerald-700` |

---

## 3. 字体系统

```css
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif,
  "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

| 用途         | 类名                            | 字重 | 大小            |
| ------------ | ------------------------------- | ---- | --------------- |
| **页面标题** | `text-2xl font-bold`            | 700  | 1.5rem (24px)   |
| **卡片标题** | `text-lg font-semibold`         | 600  | 1.125rem (18px) |
| **正文**     | `text-sm`                       | 400  | 0.875rem (14px) |
| **辅助文字** | `text-xs text-muted-foreground` | 400  | 0.75rem (12px)  |
| **按钮文字** | `text-sm font-medium`           | 500  | 0.875rem (14px) |

---

## 4. 间距系统

基于 Tailwind CSS 默认间距系统（4px 基准）。

| Token     | 值   | 用途         |
| --------- | ---- | ------------ |
| `space-1` | 4px  | 紧凑元素间距 |
| `space-2` | 8px  | 相关元素间距 |
| `space-3` | 12px | 组件内部间距 |
| `space-4` | 16px | 标准间距     |
| `space-6` | 24px | 区块间距     |
| `space-8` | 32px | 大区块间距   |

**组件内间距：**

| 组件               | Padding       |
| ------------------ | ------------- |
| **按钮 (default)** | `px-4 py-2`   |
| **按钮 (sm)**      | `px-3 py-1.5` |
| **卡片**           | `p-6`         |
| **输入框**         | `px-3 py-2`   |
| **侧边栏项**       | `p-3`         |

---

## 5. 圆角系统

基准值 `0.625rem` (10px)。

| Token          | 计算值 | 用途               |
| -------------- | ------ | ------------------ |
| `rounded-sm`   | 6px    | 小型元素（徽章）   |
| `rounded-md`   | 8px    | 中型元素（输入框） |
| `rounded-lg`   | 10px   | 标准元素（按钮）   |
| `rounded-xl`   | 14px   | 大型元素（卡片）   |
| `rounded-2xl`  | 18px   | 特大元素（模态框） |
| `rounded-full` | 9999px | 圆形元素（头像）   |

**组件圆角：**

| 组件       | 圆角                           |
| ---------- | ------------------------------ |
| **按钮**   | `rounded-md`                   |
| **输入框** | `rounded-md`                   |
| **卡片**   | `rounded-xl`                   |
| **对话框** | `rounded-2xl`                  |
| **头像**   | `rounded-full`                 |
| **徽章**   | `rounded-sm` 或 `rounded-full` |

---

## 6. 阴影系统

| Token       | 用途       |
| ----------- | ---------- |
| `shadow-sm` | 卡片、Header |
| `shadow-md` | 下拉菜单   |
| `shadow-lg` | 模态框     |

---

## 7. 组件规范

### 按钮

| 变体            | 样式           | 用途       |
| --------------- | -------------- | ---------- |
| **default**     | 实心深色背景   | 主要操作   |
| **secondary**   | 浅色背景       | 次要操作   |
| **outline**     | 带边框透明背景 | 可选操作   |
| **ghost**       | 无边框透明背景 | 工具栏按钮 |
| **destructive** | 红色背景       | 危险操作   |
| **link**        | 下划线文字     | 链接样式   |

| 尺寸        | 高度 | Padding |
| ----------- | ---- | ------- |
| **sm**      | 32px | `px-3`  |
| **default** | 36px | `px-4`  |
| **lg**      | 40px | `px-6`  |
| **icon**    | 36px | -       |

品牌渐变按钮：`bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700`

---

## 8. 深色模式

通过 `<html class="dark">` 启用，CSS 变量在 `.dark` 选择器中覆盖。

品牌色深色模式适配：

| 颜色            | 亮色模式  | 深色模式         |
| --------------- | --------- | ---------------- |
| Brand           | `#059669` | `#10B981` (更亮) |
| Brand Secondary | `#3B82F6` | `#60A5FA` (更亮) |

所有 `--brand-*` / `--color-*` 变量支持深色模式自动适配。

---

## 9. 颜色迁移映射

硬编码 Tailwind 颜色迁移为变量类：

| 旧写法（硬编码）      | 新写法（变量）         |
| --------------------- | ---------------------- |
| `bg-emerald-600`      | `bg-brand`             |
| `bg-emerald-500`      | `bg-brand-light`       |
| `bg-emerald-700`      | `bg-brand-dark`        |
| `bg-emerald-50`       | `bg-brand-muted`       |
| `text-emerald-600`    | `text-brand`           |
| `text-emerald-700`    | `text-brand-dark`      |
| `border-emerald-500`  | `border-brand`         |
| `border-emerald-200`  | `border-brand/30`      |
| `ring-emerald-500/20` | `ring-brand/20`        |
| `bg-blue-500`         | `bg-brand-secondary`   |
| `text-blue-600`       | `text-brand-secondary` |
| `bg-red-50`           | `bg-error/10`          |
| `text-red-600`        | `text-error`           |

渐变色仍使用原生 Tailwind 颜色（CSS 变量暂不支持渐变中的单个颜色）。

---

## 10. 滚动条系统

| 属性     | 值            |
| -------- | ------------- |
| **宽度** | 8px           |
| **圆角** | 9999px (full) |
| **轨道** | transparent   |
| **激活** | 品牌色        |

### 颜色

| 状态 | 亮色模式        | 深色模式        |
| ---- | --------------- | --------------- |
| 默认 | `oklch(0.8 0)`  | `oklch(0.35 0)` |
| 悬停 | `oklch(0.65 0)` | `oklch(0.45 0)` |
| 激活 | 品牌色          | 品牌色          |

### 变体

| 类名              | 用途             |
| ----------------- | ---------------- |
| `scrollbar-thin`  | 侧边栏（6px）   |
| `scrollbar-none`  | 隐藏滚动条       |
| `scrollbar-hover` | 悬停时显示       |
| `scrollbar-brand` | 品牌色滚动条     |

Firefox 仅支持 `scrollbar-width: thin` 和 `scrollbar-color`，无法自定义圆角。

---

## 相关文件

| 文件                               | 说明           |
| ---------------------------------- | -------------- |
| `apps/web/app/app.css`             | CSS 变量定义   |
| `apps/web/components.json`         | shadcn/UI 配置 |
| `apps/web/app/components/logo.tsx` | Logo 组件      |
| `apps/web/app/components/ui/`      | UI 组件库      |
