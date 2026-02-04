# Selgetabel 设计系统文档

> **版本**: 1.0.0
> **最后更新**: 2026-02-03
> **适用范围**: `apps/web` 前端应用

本文档定义了 Selgetabel 项目的视觉设计规范，包括品牌色、主题色、字体、间距、圆角等设计 token，以确保产品视觉一致性和可维护性。

---

## 目录

1. [品牌标识](#1-品牌标识)
2. [颜色系统](#2-颜色系统)
3. [字体系统](#3-字体系统)
4. [间距系统](#4-间距系统)
5. [圆角系统](#5-圆角系统)
6. [阴影系统](#6-阴影系统)
7. [组件规范](#7-组件规范)
8. [深色模式](#8-深色模式)
9. [使用指南](#9-使用指南)

---

## 1. 品牌标识

### 1.1 品牌理念

Selgetabel 是一款 **AI 驱动的 Excel 智能处理工具**，品牌视觉融合了两个核心概念：

- **Excel / 数据** → 绿色系（Emerald）- 代表数据、表格、准确性
- **AI / 智能** → 蓝色系（Blue）- 代表智能、科技、创新

### 1.2 Logo 色彩

Logo 使用渐变色展现 AI 与 Excel 的融合：

| 元素           | 渐变方向 | 起点色    | 终点色    | 用途             |
| -------------- | -------- | --------- | --------- | ---------------- |
| **AI 大脑**    | ↘ 对角   | `#1E40AF` | `#3B82F6` | 代表智能处理能力 |
| **Excel 表格** | ↘ 对角   | `#059669` | `#10B981` | 代表数据与表格   |
| **数据流**     | ↓ 垂直   | `#3B82F6` | `#10B981` | AI 与数据的连接  |

### 1.3 Logo 组件

```tsx
// 动态版本（带动画）
import { Logo } from "~/components/logo";
<Logo size={100} />;

// 静态版本
import { LogoStatic } from "~/components/logo";
<LogoStatic size={100} />;

// 带文字版本
import { LogoWithText } from "~/components/logo";
<LogoWithText size={40} />;
```

### 1.4 品牌名称

- **完整名称**: Selgetabel
- **标题样式**: 使用渐变色 `from-emerald-700 via-teal-700 to-blue-700`
- **简称**: Selgetabel（Logo 中的文字）

---

## 2. 颜色系统

### 2.1 品牌色（Brand Colors）

这是产品的核心视觉识别色，应在关键交互元素中使用。

#### 主品牌色（Excel Green）

| 名称             | CSS 变量         | 色值      | OKLCH                        | 用途               |
| ---------------- | ---------------- | --------- | ---------------------------- | ------------------ |
| **Brand**        | `--brand`        | `#059669` | `oklch(0.596 0.145 163.225)` | 主要按钮、强调元素 |
| **Brand Light**  | `--brand-light`  | `#10B981` | `oklch(0.696 0.17 162.48)`   | 悬停状态、渐变终点 |
| **Brand Dark**   | `--brand-dark`   | `#047857` | `oklch(0.508 0.118 165.612)` | 深色变体、边框     |
| **Brand Darker** | `--brand-darker` | `#065F46` | `oklch(0.448 0.119 165.612)` | 深色背景文字       |

#### 辅助品牌色（AI Blue）

| 名称                     | CSS 变量                 | 色值      | OKLCH                        | 用途        |
| ------------------------ | ------------------------ | --------- | ---------------------------- | ----------- |
| **Brand Secondary**      | `--brand-secondary`      | `#3B82F6` | `oklch(0.623 0.214 259.815)` | AI 相关元素 |
| **Brand Secondary Dark** | `--brand-secondary-dark` | `#1E40AF` | `oklch(0.451 0.243 264.376)` | 深色变体    |

#### 强调色（Accent）

| 名称             | CSS 变量         | 色值      | OKLCH                        | 用途         |
| ---------------- | ---------------- | --------- | ---------------------------- | ------------ |
| **Brand Accent** | `--brand-accent` | `#22D3EE` | `oklch(0.789 0.154 200.723)` | 数据流、动画 |
| **Brand Teal**   | `--brand-teal`   | `#14B8A6` | `oklch(0.679 0.15 180)`      | 渐变过渡色   |

### 2.2 功能色（Semantic Colors）

用于表达状态和反馈的颜色。

| 名称        | CSS 变量          | 色值      | 用途               |
| ----------- | ----------------- | --------- | ------------------ |
| **Success** | `--color-success` | `#10B981` | 成功状态、完成提示 |
| **Warning** | `--color-warning` | `#F59E0B` | 警告状态、注意提示 |
| **Error**   | `--color-error`   | `#EF4444` | 错误状态、失败提示 |
| **Info**    | `--color-info`    | `#3B82F6` | 信息提示、帮助说明 |

### 2.3 中性色（Neutral Colors）

基于 shadcn/UI 的中性灰色系，使用 OKLCH 色彩空间。

#### 亮色模式

| 用途                 | CSS 变量             | OKLCH 值           | 说明       |
| -------------------- | -------------------- | ------------------ | ---------- |
| **Background**       | `--background`       | `oklch(1 0 0)`     | 页面背景   |
| **Foreground**       | `--foreground`       | `oklch(0.145 0 0)` | 主要文字   |
| **Card**             | `--card`             | `oklch(1 0 0)`     | 卡片背景   |
| **Muted**            | `--muted`            | `oklch(0.97 0 0)`  | 次要背景   |
| **Muted Foreground** | `--muted-foreground` | `oklch(0.556 0 0)` | 次要文字   |
| **Border**           | `--border`           | `oklch(0.922 0 0)` | 边框       |
| **Input**            | `--input`            | `oklch(0.922 0 0)` | 输入框边框 |
| **Ring**             | `--ring`             | `oklch(0.708 0 0)` | 聚焦环     |

#### 深色模式

| 用途                 | CSS 变量             | OKLCH 值             |
| -------------------- | -------------------- | -------------------- |
| **Background**       | `--background`       | `oklch(0.145 0 0)`   |
| **Foreground**       | `--foreground`       | `oklch(0.985 0 0)`   |
| **Card**             | `--card`             | `oklch(0.205 0 0)`   |
| **Muted**            | `--muted`            | `oklch(0.269 0 0)`   |
| **Muted Foreground** | `--muted-foreground` | `oklch(0.708 0 0)`   |
| **Border**           | `--border`           | `oklch(1 0 0 / 10%)` |

### 2.4 图表色（Chart Colors）

用于数据可视化的调色板。

| 名称    | 亮色模式                    | 深色模式                     |
| ------- | --------------------------- | ---------------------------- |
| Chart 1 | `oklch(0.646 0.222 41.116)` | `oklch(0.488 0.243 264.376)` |
| Chart 2 | `oklch(0.6 0.118 184.704)`  | `oklch(0.696 0.17 162.48)`   |
| Chart 3 | `oklch(0.398 0.07 227.392)` | `oklch(0.769 0.188 70.08)`   |
| Chart 4 | `oklch(0.828 0.189 84.429)` | `oklch(0.627 0.265 303.9)`   |
| Chart 5 | `oklch(0.769 0.188 70.08)`  | `oklch(0.645 0.246 16.439)`  |

### 2.5 业务语义色

针对 Selgetabel 业务场景定义的语义色。

#### 步骤状态色

| 状态        | Tailwind 类                                              | 用途         |
| ----------- | -------------------------------------------------------- | ------------ |
| **Pending** | `text-gray-400` `bg-gray-50`                             | 等待中的步骤 |
| **Running** | `text-emerald-600` `bg-emerald-50` `ring-emerald-500/20` | 执行中的步骤 |
| **Done**    | `text-emerald-600` `bg-emerald-100`                      | 已完成的步骤 |
| **Error**   | `text-red-600` `bg-red-50` `border-red-200`              | 失败的步骤   |

#### 内容块颜色

| 内容类型     | 背景            | 边框               | 文字               |
| ------------ | --------------- | ------------------ | ------------------ |
| **思路解读** | `bg-blue-50`    | `border-blue-200`  | `text-blue-700`    |
| **快捷复现** | `bg-amber-50`   | `border-amber-200` | `text-amber-700`   |
| **文件下载** | `bg-emerald-50` | -                  | `text-emerald-700` |

---

## 3. 字体系统

### 3.1 字体栈

```css
--font-sans:
  "Inter", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",
  "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

### 3.2 字体规格

| 用途         | 类名                            | 字重 | 大小            |
| ------------ | ------------------------------- | ---- | --------------- |
| **页面标题** | `text-2xl font-bold`            | 700  | 1.5rem (24px)   |
| **卡片标题** | `text-lg font-semibold`         | 600  | 1.125rem (18px) |
| **正文**     | `text-sm`                       | 400  | 0.875rem (14px) |
| **辅助文字** | `text-xs text-muted-foreground` | 400  | 0.75rem (12px)  |
| **按钮文字** | `text-sm font-medium`           | 500  | 0.875rem (14px) |

### 3.3 字体改进建议

当前使用 Inter 字体，虽然功能性强但缺乏品牌辨识度。未来可考虑：

| 用途     | 推荐字体                   | 特点           |
| -------- | -------------------------- | -------------- |
| **标题** | Geist, Outfit              | 现代感、科技感 |
| **正文** | Geist, Source Sans 3       | 可读性强       |
| **代码** | Geist Mono, JetBrains Mono | 等宽、清晰     |

---

## 4. 间距系统

基于 Tailwind CSS 默认间距系统（4px 基准）。

### 4.1 常用间距

| Token     | 值   | 用途         |
| --------- | ---- | ------------ |
| `space-1` | 4px  | 紧凑元素间距 |
| `space-2` | 8px  | 相关元素间距 |
| `space-3` | 12px | 组件内部间距 |
| `space-4` | 16px | 标准间距     |
| `space-6` | 24px | 区块间距     |
| `space-8` | 32px | 大区块间距   |

### 4.2 组件内间距规范

| 组件               | Padding       | 说明                |
| ------------------ | ------------- | ------------------- |
| **按钮 (default)** | `px-4 py-2`   | 16px 水平, 8px 垂直 |
| **按钮 (sm)**      | `px-3 py-1.5` | 12px 水平, 6px 垂直 |
| **卡片**           | `p-6`         | 24px 四周           |
| **输入框**         | `px-3 py-2`   | 12px 水平, 8px 垂直 |
| **侧边栏项**       | `p-3`         | 12px 四周           |

---

## 5. 圆角系统

基于 CSS 变量的圆角系统，基准值 `0.625rem` (10px)。

### 5.1 圆角 Token

| Token          | CSS 变量       | 计算值 | 用途               |
| -------------- | -------------- | ------ | ------------------ |
| `rounded-sm`   | `--radius-sm`  | 6px    | 小型元素（徽章）   |
| `rounded-md`   | `--radius-md`  | 8px    | 中型元素（输入框） |
| `rounded-lg`   | `--radius-lg`  | 10px   | 标准元素（按钮）   |
| `rounded-xl`   | `--radius-xl`  | 14px   | 大型元素（卡片）   |
| `rounded-2xl`  | `--radius-2xl` | 18px   | 特大元素（模态框） |
| `rounded-full` | `9999px`       | -      | 圆形元素（头像）   |

### 5.2 组件圆角规范

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

### 6.1 阴影 Token

| Token       | 用途       | 值                                  |
| ----------- | ---------- | ----------------------------------- |
| `shadow-sm` | 轻微浮起   | `0 1px 2px 0 rgb(0 0 0 / 0.05)`     |
| `shadow`    | 标准阴影   | `0 1px 3px 0 rgb(0 0 0 / 0.1)`      |
| `shadow-md` | 卡片阴影   | `0 4px 6px -1px rgb(0 0 0 / 0.1)`   |
| `shadow-lg` | 弹出层阴影 | `0 10px 15px -3px rgb(0 0 0 / 0.1)` |

### 6.2 使用场景

| 组件         | 阴影        |
| ------------ | ----------- |
| **卡片**     | `shadow-sm` |
| **下拉菜单** | `shadow-md` |
| **模态框**   | `shadow-lg` |
| **Header**   | `shadow-sm` |

---

## 7. 组件规范

### 7.1 按钮（Button）

#### 变体

| 变体            | 样式           | 用途       |
| --------------- | -------------- | ---------- |
| **default**     | 实心深色背景   | 主要操作   |
| **secondary**   | 浅色背景       | 次要操作   |
| **outline**     | 带边框透明背景 | 可选操作   |
| **ghost**       | 无边框透明背景 | 工具栏按钮 |
| **destructive** | 红色背景       | 危险操作   |
| **link**        | 下划线文字     | 链接样式   |

#### 尺寸

| 尺寸        | 高度 | Padding |
| ----------- | ---- | ------- |
| **sm**      | 32px | `px-3`  |
| **default** | 36px | `px-4`  |
| **lg**      | 40px | `px-6`  |
| **icon**    | 36px | -       |

#### 品牌按钮样式

```tsx
// 主操作按钮（渐变）
<Button className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
  新对话
</Button>

// 发送按钮
<Button className="bg-emerald-600 hover:bg-emerald-700 rounded-full">
  <Send />
</Button>
```

### 7.2 输入框（Input/Textarea）

```tsx
// 聊天输入框
<div className="bg-white border-2 border-emerald-500 rounded-xl">
  <Textarea className="border-0 focus:ring-0" />
</div>
```

### 7.3 卡片（Card）

```tsx
<Card className="rounded-xl border shadow-sm">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### 7.4 步骤指示器

```tsx
// 运行中
<div className="border rounded-lg ring-2 ring-emerald-500/20">
  <Loader2 className="text-emerald-600 animate-spin" />
</div>

// 已完成
<div className="bg-emerald-100 text-emerald-700 rounded-full">
  <CheckCircle2 />
</div>

// 错误
<div className="bg-red-100 text-red-600 rounded-full">
  <XCircle />
</div>
```

---

## 8. 深色模式

### 8.1 启用方式

```tsx
// 在 html 标签添加 .dark 类
<html className="dark">
```

### 8.2 CSS 变量覆盖

深色模式通过 `.dark` 选择器覆盖 CSS 变量：

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  /* ... */
}
```

### 8.3 品牌色适配（待实现）

深色模式下的品牌色需要调整亮度以保持可访问性：

| 颜色            | 亮色模式  | 深色模式         |
| --------------- | --------- | ---------------- |
| Brand           | `#059669` | `#10B981` (更亮) |
| Brand Secondary | `#3B82F6` | `#60A5FA` (更亮) |

---

## 9. 使用指南

### 9.1 颜色使用原则

1. **品牌一致性**: 主要交互元素使用品牌色（`brand` 系）
2. **功能明确**: 状态反馈使用功能色（`success`/`warning`/`error`/`info`）
3. **层次分明**: 使用中性色建立视觉层次
4. **可访问性**: 确保文字与背景对比度 ≥ 4.5:1

### 9.2 新增 Tailwind 类（推荐使用）

以下是新增的品牌色和功能色 Tailwind 类，**推荐在新代码中使用**：

#### 品牌色类

```tsx
// ✅ 主品牌色（Excel 绿色系）
<Button className="bg-brand text-brand-foreground">           // 主按钮
<Button className="bg-brand hover:bg-brand-dark">             // 带悬停效果
<div className="bg-brand-muted">                              // 柔和背景
<div className="border-brand">                                // 品牌边框
<span className="text-brand">                                 // 品牌文字
<div className="ring-brand/20">                               // 聚焦环

// ✅ 辅助品牌色（AI 蓝色系）
<div className="bg-brand-secondary text-brand-secondary-foreground">
<span className="text-brand-secondary">

// ✅ 强调色
<div className="bg-brand-accent">                             // 强调背景
<div className="bg-brand-teal">                               // 过渡色
```

#### 功能色类

```tsx
// ✅ 成功状态
<div className="bg-success text-success-foreground">
<span className="text-success">
<div className="border-success">

// ✅ 警告状态
<div className="bg-warning text-warning-foreground">
<span className="text-warning">

// ✅ 错误状态
<div className="bg-error text-error-foreground">
<span className="text-error">

// ✅ 信息提示
<div className="bg-info text-info-foreground">
<span className="text-info">
```

### 9.3 迁移指南（硬编码 → 变量）

将现有的硬编码颜色迁移为新的变量类：

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

#### 渐变迁移

渐变仍需使用原生 Tailwind 颜色，暂未支持变量渐变：

```tsx
// 品牌渐变（标题）- 保持原样
<h1 className="bg-linear-to-r from-emerald-700 via-teal-700 to-blue-700 bg-clip-text text-transparent">

// 品牌渐变（按钮）- 保持原样
<Button className="bg-linear-to-r from-emerald-600 to-teal-600">
```

### 9.4 完整示例

```tsx
// 主操作按钮
<Button className="bg-brand hover:bg-brand-dark text-brand-foreground">
  新对话
</Button>

// 发送按钮
<Button className="bg-brand hover:bg-brand-dark rounded-full">
  <Send />
</Button>

// 聊天输入框
<div className="bg-white border-2 border-brand rounded-xl">
  <Textarea />
</div>

// 步骤状态 - 运行中
<div className="border rounded-lg ring-2 ring-brand/20">
  <Loader2 className="text-brand animate-spin" />
</div>

// 步骤状态 - 完成
<div className="bg-brand-muted text-brand-dark rounded-full">
  <CheckCircle2 />
</div>

// 错误提示
<div className="bg-error/10 border-error/30 text-error">
  发生错误
</div>

// 成功提示
<div className="bg-success/10 border-success/30 text-success">
  处理完成
</div>
```

### 9.5 深色模式支持

所有新增的变量都支持深色模式自动适配：

```tsx
// 自动适配深色模式 - 无需额外处理
<div className="bg-brand text-brand-foreground">
  在亮色模式下是 emerald-600，深色模式下是 emerald-500
</div>
```

### 9.6 改进计划

- [x] ~~添加 `--brand-*` 系列变量到 Tailwind 主题~~
- [x] ~~完善深色模式品牌色适配~~
- [x] ~~将组件中的硬编码颜色迁移为变量~~
- [ ] 考虑更换为更具辨识度的字体
- [ ] 添加动画/过渡规范
- [ ] 迁移 fixtures 测试页面的颜色（低优先级）

### 9.7 已迁移的组件列表

| 组件                 | 文件路径                                                            | 状态      |
| -------------------- | ------------------------------------------------------------------- | --------- |
| AppHeader            | `components/app-header.tsx`                                         | ✅ 已迁移 |
| ThreadSidebar        | `components/thread-sidebar.tsx`                                     | ✅ 已迁移 |
| ChatInput            | `components/chat-input.tsx`                                         | ✅ 已迁移 |
| AssistantMessage     | `components/llm-chat/message-list/components/assistant-message.tsx` | ✅ 已迁移 |
| FileItemBadge        | `components/file-item-badge.tsx`                                    | ✅ 已迁移 |
| FileItemBadge (chat) | `components/llm-chat/message-list/components/file-item-badge.tsx`   | ✅ 已迁移 |
| UserMenu             | `components/user-menu.tsx`                                          | ✅ 已迁移 |
| UserAvatarField      | `components/user-avatar-field.tsx`                                  | ✅ 已迁移 |
| UserProfileForm      | `components/user-profile-form.tsx`                                  | ✅ 已迁移 |
| CircularProgress     | `components/ui/circular-progress.tsx`                               | ✅ 已迁移 |
| AppLayout            | `components/layout/app-layout.tsx`                                  | ✅ 已迁移 |
| AuthLayout           | `components/layout/auth-layout.tsx`                                 | ✅ 已迁移 |
| RightPreview         | `components/right-preview.tsx`                                      | ✅ 已迁移 |
| ThreadChat           | `features/thread/thread-chat.tsx`                                   | ✅ 已迁移 |
| Login Page           | `routes/_public.login.tsx`                                          | ✅ 已迁移 |
| Register Page        | `routes/_public.register.tsx`                                       | ✅ 已迁移 |
| Auth Layout          | `routes/_auth.tsx`                                                  | ✅ 已迁移 |
| Thread Page          | `routes/_auth._app.threads.($id).tsx`                               | ✅ 已迁移 |

**注意**: 渐变色（如标题、按钮渐变）仍使用原生 Tailwind 颜色，因为 CSS 变量暂不支持渐变中的单个颜色。

---

## 10. 滚动条系统

### 10.1 基础样式

滚动条采用现代简约设计，使用圆角、半透明效果，与整体设计风格保持一致。

| 属性     | 值            | 说明                 |
| -------- | ------------- | -------------------- |
| **宽度** | 8px           | 默认滚动条宽度       |
| **圆角** | 9999px (full) | 完全圆角             |
| **轨道** | transparent   | 透明轨道             |
| **滑块** | 中性灰色      | 默认状态             |
| **悬停** | 深灰色        | 鼠标悬停时加深       |
| **激活** | 品牌色        | 点击拖动时显示品牌色 |

### 10.2 颜色规范

#### 亮色模式

| 状态 | 颜色                 | OKLCH 值                     |
| ---- | -------------------- | ---------------------------- |
| 默认 | 浅灰色               | `oklch(0.8 0 0)`             |
| 悬停 | 深灰色               | `oklch(0.65 0 0)`            |
| 激活 | 品牌色 (emerald-600) | `oklch(0.596 0.145 163.225)` |

#### 深色模式

| 状态 | 颜色                 | OKLCH 值                   |
| ---- | -------------------- | -------------------------- |
| 默认 | 深灰色               | `oklch(0.35 0 0)`          |
| 悬停 | 中灰色               | `oklch(0.45 0 0)`          |
| 激活 | 品牌色 (emerald-500) | `oklch(0.696 0.17 162.48)` |

### 10.3 变体类

提供多种滚动条变体，适用于不同场景：

| 类名              | 用途             | 说明                     |
| ----------------- | ---------------- | ------------------------ |
| （默认）          | 通用滚动区域     | 8px 宽度，圆角滑块       |
| `scrollbar-thin`  | 侧边栏、紧凑区域 | 6px 宽度，更细的滑块     |
| `scrollbar-none`  | 隐藏滚动条       | 保留滚动功能，隐藏滚动条 |
| `scrollbar-hover` | 悬停显示         | 默认隐藏，悬停时显示     |
| `scrollbar-brand` | 强调区域         | 使用品牌色（半透明）     |

### 10.4 使用示例

```tsx
// 默认滚动条（自动应用于所有可滚动元素）
<div className="overflow-auto h-64">
  {/* 内容 */}
</div>

// 细滚动条 - 适用于侧边栏
<aside className="scrollbar-thin overflow-y-auto">
  {/* 侧边栏内容 */}
</aside>

// 隐藏滚动条 - 适用于横向滚动列表
<div className="scrollbar-none overflow-x-auto">
  {/* 横向内容 */}
</div>

// 悬停显示滚动条 - 适用于预览面板
<div className="scrollbar-hover overflow-y-auto">
  {/* 内容 */}
</div>

// 品牌色滚动条 - 适用于主要内容区
<main className="scrollbar-brand overflow-y-auto">
  {/* 主要内容 */}
</main>
```

### 10.5 浏览器兼容性

| 浏览器  | 支持情况                |
| ------- | ----------------------- |
| Chrome  | ✅ 完整支持 (webkit)    |
| Safari  | ✅ 完整支持 (webkit)    |
| Firefox | ⚠️ 部分支持 (thin/auto) |
| Edge    | ✅ 完整支持 (webkit)    |

**注意**: Firefox 仅支持 `scrollbar-width` 和 `scrollbar-color` 属性，无法自定义圆角等样式。系统已通过 `scrollbar-width: thin` 和 `scrollbar-color` 提供基础支持。

---

## 附录

### A. 颜色快速参考

```
主品牌色（Excel 绿）:
  50:  #ECFDF5    100: #D1FAE5    200: #A7F3D0
  300: #6EE7B7    400: #34D399    500: #10B981
  600: #059669    700: #047857    800: #065F46
  900: #064E3B

辅助品牌色（AI 蓝）:
  50:  #EFF6FF    100: #DBEAFE    200: #BFDBFE
  300: #93C5FD    400: #60A5FA    500: #3B82F6
  600: #2563EB    700: #1D4ED8    800: #1E40AF
  900: #1E3A8A

过渡色（Teal）:
  50:  #F0FDFA    100: #CCFBF1    200: #99F6E4
  300: #5EEAD4    400: #2DD4BF    500: #14B8A6
  600: #0D9488    700: #0F766E    800: #115E59
  900: #134E4A
```

### B. 相关文件

| 文件                               | 说明           |
| ---------------------------------- | -------------- |
| `apps/web/app/app.css`             | CSS 变量定义   |
| `apps/web/components.json`         | shadcn/UI 配置 |
| `apps/web/app/components/logo.tsx` | Logo 组件      |
| `apps/web/app/components/ui/`      | UI 组件库      |
