# 全局样式和主题系统

本目录包含项目的全局样式系统，实现了深色科技风的视觉设计，并支持深色/浅色/跟随系统三种主题模式。

## 文件结构

```
src/styles/
├── variables.css      # CSS 变量定义（颜色、间距、字体等）
├── animations.css     # 动画样式库
├── themes/            # 主题系统
│   ├── index.css      # 主题入口文件
│   ├── dark.css       # 深色主题变量
│   └── light.css      # 浅色主题变量
├── theme-demo.html    # 主题演示页面
└── README.md          # 本文档
```

## 主题系统

### 概述

主题系统支持三种模式：
- **深色主题 (dark)**：深色背景 + 浅色文字，适合夜间使用
- **浅色主题 (light)**：浅色背景 + 深色文字，适合日间使用
- **跟随系统 (system)**：自动跟随操作系统的主题偏好

### 使用方法

1. **导入主题样式**

在主样式文件中导入主题：
```css
@import './themes/index.css';
```

2. **设置主题**

在 HTML 根元素上设置 `data-theme` 属性：
```html
<!-- 深色主题 -->
<html data-theme="dark">

<!-- 浅色主题 -->
<html data-theme="light">

<!-- 跟随系统（不设置 data-theme 或使用 JS 动态切换） -->
<html>
```

3. **启用过渡动画**

切换主题时添加 `.theme-transition` 类以启用 300ms 的平滑过渡：
```javascript
document.documentElement.classList.add('theme-transition')
document.documentElement.setAttribute('data-theme', 'light')
setTimeout(() => {
  document.documentElement.classList.remove('theme-transition')
}, 300)
```

### 主题变量

两个主题都定义了完整的 CSS 变量集：

| 变量类别 | 深色主题 | 浅色主题 |
|---------|---------|---------|
| 主色调 | 青色系 (#00d9ff) | 青色系 (#0099cc) |
| 背景色 | 深蓝黑 (#0a0e27) | 浅灰白 (#f8fafc) |
| 文字色 | 白色系 (#ffffff) | 深灰系 (#1a202c) |
| 边框色 | 白色透明 | 黑色透明 |
| 阴影 | 深色阴影 | 浅色阴影 |

### WCAG 无障碍标准

浅色主题的所有颜色对比度都符合 WCAG AA 标准：
- 主文字 (`--text-primary`): 对比度 16:1
- 次要文字 (`--text-secondary`): 对比度 7.0:1
- 弱化文字 (`--text-muted`): 对比度 4.6:1

### 减少动画支持

当用户在系统设置中启用"减少动画"时，主题过渡动画会自动禁用：
```css
@media (prefers-reduced-motion: reduce) {
  .theme-transition * {
    transition: none !important;
  }
}
```

## CSS 变量系统

### 颜色系统

#### 主色调
- `--primary`: #00d9ff (青色 - 主要强调色)
- `--secondary`: #7b61ff (紫色 - 次要强调色)
- `--accent`: #ff6b9d (粉色 - 点缀色)

每个主色都有对应的深色和浅色变体：
- `--primary-dark`, `--primary-light`
- `--secondary-dark`, `--secondary-light`
- `--accent-dark`, `--accent-light`

#### 背景色
- `--bg-primary`: #0a0e27 (深蓝黑 - 主背景)
- `--bg-secondary`: #151932 (深蓝灰 - 次背景)
- `--bg-tertiary`: #1a1f3a (第三层背景)
- `--bg-card`: rgba(21, 25, 50, 0.8) (卡片背景 - 半透明)
- `--bg-card-hover`: rgba(21, 25, 50, 0.95) (卡片悬停背景)
- `--bg-overlay`: rgba(10, 14, 39, 0.9) (覆盖层背景)

#### 文字色
- `--text-primary`: #ffffff (主文字)
- `--text-secondary`: #a0aec0 (次要文字)
- `--text-muted`: #718096 (弱化文字)
- `--text-disabled`: #4a5568 (禁用文字)

#### 边框色
- `--border`: rgba(255, 255, 255, 0.1) (标准边框)
- `--border-light`: rgba(255, 255, 255, 0.05) (浅色边框)
- `--border-strong`: rgba(255, 255, 255, 0.2) (强化边框)

### 间距系统

基于 8px 基准的间距系统：
- `--spacing-xs`: 4px
- `--spacing-sm`: 8px
- `--spacing-md`: 16px
- `--spacing-lg`: 24px
- `--spacing-xl`: 32px
- `--spacing-2xl`: 48px
- `--spacing-3xl`: 64px
- `--spacing-4xl`: 96px

### 字体系统

#### 字体族
- `--font-sans`: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif
- `--font-heading`: 'Space Grotesk', 'Inter', sans-serif
- `--font-mono`: 'Fira Code', 'Consolas', monospace

#### 字体大小
- `--text-xs`: 0.75rem (12px)
- `--text-sm`: 0.875rem (14px)
- `--text-base`: 1rem (16px)
- `--text-lg`: 1.125rem (18px)
- `--text-xl`: 1.25rem (20px)
- `--text-2xl`: 1.5rem (24px)
- `--text-3xl`: 1.875rem (30px)
- `--text-4xl`: 2.25rem (36px)
- `--text-5xl`: 3rem (48px)
- `--text-6xl`: 3.75rem (60px)

#### 字重
- `--font-light`: 300
- `--font-normal`: 400
- `--font-medium`: 500
- `--font-semibold`: 600
- `--font-bold`: 700

### 圆角系统
- `--radius-sm`: 4px (小圆角 - 按钮、标签)
- `--radius-md`: 8px (中圆角 - 卡片、输入框)
- `--radius-lg`: 16px (大圆角 - 大型卡片)
- `--radius-xl`: 24px (超大圆角)
- `--radius-full`: 50% (圆形 - 头像、图标按钮)

### 阴影系统

#### 标准阴影
- `--shadow-sm`: 小阴影
- `--shadow-md`: 中阴影
- `--shadow-lg`: 大阴影
- `--shadow-xl`: 超大阴影

#### 发光效果
- `--shadow-glow-primary`: 主色发光
- `--shadow-glow-secondary`: 次色发光
- `--shadow-glow-accent`: 强调色发光
- `--shadow-glow-strong`: 强烈发光

### 过渡和动画
- `--transition-fast`: 150ms ease (快速过渡)
- `--transition-base`: 300ms ease (标准过渡)
- `--transition-slow`: 500ms ease (慢速过渡)
- `--transition-bounce`: 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55) (弹跳效果)

### 毛玻璃效果
- `--blur-sm`: 8px
- `--blur-md`: 12px
- `--blur-lg`: 16px
- `--blur-xl`: 24px

## 动画库

### 基础动画

#### 淡入淡出
- `fadeIn` / `fadeOut`: 基础淡入淡出
- `fadeInUp` / `fadeInDown`: 淡入 + 移动
- `fadeInScale`: 淡入 + 缩放

#### 滑动
- `slideInLeft` / `slideInRight`: 从左/右滑入

#### 其他
- `pulse`: 脉冲动画
- `spin`: 旋转动画
- `bounce`: 弹跳动画
- `shake`: 摇晃动画
- `glowPulse`: 发光脉冲
- `gradientFlow`: 渐变流动
- `ripple`: 波纹扩散
- `zoomIn` / `zoomOut`: 缩放进出
- `flipIn`: 翻转进入

### 动画工具类

使用方式：
```html
<div class="animate-fadeInUp">淡入上移</div>
<div class="animate-pulse">脉冲动画</div>
<div class="animate-glowPulse">发光脉冲</div>
```

### 动画延迟类

```html
<div class="animate-fadeIn animate-delay-200">延迟 200ms</div>
<div class="animate-fadeIn animate-delay-500">延迟 500ms</div>
```

可用延迟：100ms, 200ms, 300ms, 500ms, 700ms, 1000ms

### 过渡效果类

```html
<div class="transition-all">所有属性过渡</div>
<div class="transition-colors">颜色过渡</div>
<div class="transition-transform">变换过渡</div>
<div class="transition-opacity">透明度过渡</div>
<div class="transition-shadow">阴影过渡</div>
```

### 悬停效果类

```html
<div class="hover-lift">悬停上浮</div>
<div class="hover-scale">悬停缩放</div>
<div class="hover-glow">悬停发光</div>
<div class="hover-brightness">悬停增亮</div>
```

## 特效工具类

### 毛玻璃效果

```html
<div class="glass-effect">标准毛玻璃</div>
<div class="glass-effect-light">轻量毛玻璃</div>
<div class="glass-effect-strong">强化毛玻璃</div>
<div class="glass-effect-frosted">磨砂毛玻璃</div>
```

### 发光效果

```html
<div class="glow">标准发光</div>
<div class="glow-primary">主色发光</div>
<div class="glow-secondary">次色发光</div>
<div class="glow-accent">强调色发光</div>
<div class="glow-strong">强烈发光</div>
<div class="glow-text">文字发光</div>
<div class="glow-border">边框发光</div>
```

### 阴影效果

```html
<div class="shadow-sm">小阴影</div>
<div class="shadow-md">中阴影</div>
<div class="shadow-lg">大阴影</div>
<div class="shadow-xl">超大阴影</div>
<div class="shadow-inner">内阴影</div>
```

### 渐变效果

#### 文字渐变
```html
<h1 class="text-gradient">多色渐变文字</h1>
<h1 class="text-gradient-primary">主色渐变文字</h1>
<h1 class="text-gradient-secondary">次色渐变文字</h1>
```

#### 背景渐变
```html
<div class="bg-gradient-primary">主色渐变背景</div>
<div class="bg-gradient-secondary">次色渐变背景</div>
<div class="bg-gradient-radial">径向渐变背景</div>
<div class="bg-gradient-flow animate-gradientFlow">流动渐变背景</div>
```

### 边框效果

```html
<div class="border-gradient">渐变边框</div>
<div class="border-glow">发光边框</div>
```

### 卡片效果

```html
<div class="card">标准卡片</div>
<div class="card-glass">毛玻璃卡片</div>
<div class="card card-hover">悬停卡片（上浮效果）</div>
<div class="card card-glow">发光卡片（悬停发光）</div>
```

### 按钮效果

```html
<button class="btn-gradient">渐变按钮</button>
<button class="btn-glow">发光按钮</button>
```

## 响应式工具类

### 容器
```html
<div class="container">固定宽度容器（最大 1280px）</div>
<div class="container-fluid">全宽容器</div>
```

### 间距
```html
<div class="spacing-xs">4px 间距</div>
<div class="spacing-sm">8px 间距</div>
<div class="spacing-md">16px 间距</div>
<div class="spacing-lg">24px 间距</div>
<div class="spacing-xl">32px 间距</div>
```

### 圆角
```html
<div class="rounded-sm">小圆角</div>
<div class="rounded-md">中圆角</div>
<div class="rounded-lg">大圆角</div>
<div class="rounded-xl">超大圆角</div>
<div class="rounded-full">圆形</div>
```

## 性能优化

### GPU 加速
```html
<div class="gpu-accelerated">启用 GPU 加速</div>
```

### Will-change
```html
<div class="will-change-transform">提示浏览器优化 transform</div>
<div class="will-change-opacity">提示浏览器优化 opacity</div>
```

## 使用示例

### 创建一个发光卡片
```html
<div class="card-glass glow-primary hover-lift animate-fadeInUp">
  <h3 class="text-gradient">标题</h3>
  <p class="text-secondary">内容</p>
</div>
```

### 创建一个渐变按钮
```html
<button class="btn-gradient hover-scale">
  点击我
</button>
```

### 创建一个动画文字
```html
<h1 class="text-gradient animate-fadeInScale animate-delay-300">
  欢迎来到我的网站
</h1>
```

## 浏览器兼容性

- 现代浏览器（Chrome, Firefox, Safari, Edge）完全支持
- 毛玻璃效果需要 `backdrop-filter` 支持
- 部分动画使用 CSS Grid 和 Flexbox
- 建议使用 Autoprefixer 处理浏览器前缀

## 主题定制

如需定制主题，修改 `variables.css` 中的 CSS 变量即可：

```css
:root {
  /* 修改主色调 */
  --primary: #your-color;
  --secondary: #your-color;
  
  /* 修改间距 */
  --spacing-md: 20px;
  
  /* 修改字体 */
  --font-sans: 'Your Font', sans-serif;
}
```

## 查看演示

打开 `theme-demo.html` 文件可以查看所有样式效果的实时演示。
