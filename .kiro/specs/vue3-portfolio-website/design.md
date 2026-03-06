# 设计文档

## 概述

本项目是一个基于 Vue 3 全家桶构建的个人求职网站，旨在为前端开发工程师黄彦杰先生打造一个具有现代科技感、交互流畅、视觉精美的在线简历展示平台。

### 核心目标

- 全面展示求职者的教育背景、工作经历、技术能力和个人特质
- 提供流畅的用户体验和现代化的视觉设计
- 展示求职者的前端技术实力和审美能力
- 支持多设备访问和响应式布局
- 确保高性能和快速加载

### 技术栈

- **前端框架**: Vue 3 (Composition API)
- **路由管理**: Vue Router 4
- **状态管理**: Pinia
- **构建工具**: Vite
- **UI 框架**: 自定义组件 + TailwindCSS / UnoCSS
- **动画库**: GSAP / Anime.js
- **数据可视化**: ECharts
- **图标库**: IconPark / Heroicons
- **类型检查**: TypeScript
- **代码规范**: ESLint + Prettier

## 架构

### 整体架构


采用经典的 SPA (Single Page Application) 架构，通过 Vue Router 实现客户端路由。

```
┌─────────────────────────────────────────┐
│           Application Shell             │
│  ┌───────────────────────────────────┐  │
│  │      Navigation Component         │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │       Router View (Pages)         │  │
│  │  - Home                           │  │
│  │  - About                          │  │
│  │  - Education                      │  │
│  │  - Experience                     │  │
│  │  - Skills                         │  │
│  │  - Contact                        │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │      Background Effects           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 目录结构

```
src/
├── assets/              # 静态资源
│   ├── images/         # 图片资源
│   ├── icons/          # 图标
│   └── resume.pdf      # 简历文件
├── components/          # 可复用组件
│   ├── common/         # 通用组件
│   │   ├── Button.vue
│   │   ├── Card.vue
│   │   └── Loading.vue
│   ├── layout/         # 布局组件
│   │   ├── Navigation.vue
│   │   ├── Footer.vue
│   │   └── PageTransition.vue
│   └── effects/        # 特效组件
│       ├── ParticleBackground.vue
│       └── ScrollAnimation.vue
├── views/              # 页面组件
│   ├── Home.vue
│   ├── About.vue
│   ├── Education.vue
│   ├── Experience.vue
│   ├── Skills.vue
│   └── Contact.vue
├── router/             # 路由配置
│   └── index.ts
├── stores/             # 状态管理
│   └── app.ts
├── composables/        # 组合式函数
│   ├── useAnimation.ts
│   ├── useScroll.ts
│   └── useResponsive.ts
├── data/               # 数据配置
│   └── profile.ts      # 个人信息数据
├── styles/             # 样式文件
│   ├── variables.css   # CSS 变量
│   └── animations.css  # 动画样式
├── utils/              # 工具函数
│   └── helpers.ts
├── App.vue             # 根组件
└── main.ts             # 入口文件
```

## 组件和接口

### 核心组件

#### 1. Navigation 导航组件


**职责**: 提供全局导航菜单，支持路由跳转和当前页面高亮

**接口**:
```typescript
interface NavigationProps {
  fixed?: boolean;        // 是否固定定位
  transparent?: boolean;  // 是否透明背景
}

interface MenuItem {
  name: string;          // 菜单项名称
  path: string;          // 路由路径
  icon?: string;         // 图标
}
```

#### 2. PageTransition 页面过渡组件

**职责**: 为路由切换提供过渡动画效果

**接口**:
```typescript
interface TransitionProps {
  mode?: 'fade' | 'slide' | 'zoom';  // 过渡模式
  duration?: number;                  // 动画时长（毫秒）
}
```

#### 3. SkillChart 技能图表组件

**职责**: 使用 ECharts 展示技能熟练度

**接口**:
```typescript
interface Skill {
  name: string;          // 技能名称
  level: number;         // 熟练度 (0-100)
  category: string;      // 分类
  projects?: string[];   // 相关项目
}

interface SkillChartProps {
  skills: Skill[];
  type: 'bar' | 'radar';  // 图表类型
}
```

#### 4. Timeline 时间轴组件

**职责**: 展示教育经历和工作经历的时间线

**接口**:
```typescript
interface TimelineItem {
  id: string;
  title: string;         // 标题
  subtitle: string;      // 副标题
  period: string;        // 时间段
  description: string;   // 描述
  details?: string[];    // 详细信息
  expanded?: boolean;    // 是否展开
}

interface TimelineProps {
  items: TimelineItem[];
  layout: 'vertical' | 'horizontal';
}
```

#### 5. ContactForm 联系表单组件

**职责**: 提供联系表单和验证

**接口**:
```typescript
interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  message: string;
}
```

#### 6. ParticleBackground 粒子背景组件

**职责**: 渲染动态粒子背景效果

**接口**:
```typescript
interface ParticleConfig {
  count: number;         // 粒子数量
  color: string;         // 粒子颜色
  speed: number;         // 移动速度
  size: number;          // 粒子大小
}
```

### 数据模型


#### Profile 个人信息模型

```typescript
interface Profile {
  // 基本信息
  name: string;
  title: string;
  phone: string;
  email: string;
  avatar: string;
  
  // 个人简介
  summary: string;
  
  // 求职意向
  jobIntentions: string[];
  
  // 教育经历
  education: Education[];
  
  // 工作经历
  experience: Experience[];
  
  // 技能
  skills: Skill[];
  
  // 校园经历
  campusExperience: CampusExperience[];
}

interface Education {
  id: string;
  school: string;
  college: string;
  major: string;
  period: string;
  rank: string;
  honors: string[];
  courses: Course[];
}

interface Course {
  name: string;
  score: number;
}

interface Experience {
  id: string;
  company: string;
  position: string;
  period: string;
  responsibilities: string[];
  achievements?: Achievement[];
}

interface Achievement {
  metric: string;
  value: number | string;
}

interface Skill {
  name: string;
  level: number;
  category: 'frontend' | 'backend' | 'tools' | 'other';
  experience: string;
  projects: string[];
}

interface CampusExperience {
  organization: string;
  position: string;
  period: string;
}
```

## 数据模型

所有个人信息数据将存储在 `src/data/profile.ts` 配置文件中，采用 TypeScript 类型定义确保数据结构的一致性。这种设计使得内容更新变得简单，只需修改配置文件即可。

```typescript
// src/data/profile.ts
export const profileData: Profile = {
  name: '黄彦杰',
  title: '前端开发工程师 / 软件需求分析师',
  phone: '+86 14775378984',
  email: '1243222867@QQ.com',
  avatar: '/images/avatar.jpg',
  summary: '我是软件工程专业出身（年级排名前10%）...',
  // ... 其他数据
}
```


## 正确性属性

*属性是指在系统的所有有效执行中都应该成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 页面内容完整性

*对于任何*需要展示个人信息的页面（首页、教育、工作经历、技能、联系方式），渲染后的页面应当包含该页面所需的所有必要数据字段

**验证需求**: 1.2, 2.1, 3.1, 5.1, 9.1

### 属性 2: 导航路由一致性

*对于任何*导航菜单项，点击后当前路由路径应当与该菜单项的目标路径匹配，且该菜单项应当处于激活状态

**验证需求**: 1.5, 6.2, 6.5

### 属性 3: 路由历史管理正确性

*对于任何*路由导航序列，使用浏览器后退按钮应当按相反顺序返回之前访问的路由

**验证需求**: 6.4

### 属性 4: 数据可视化准确性

*对于任何*技能数据集合，图表组件渲染的数据点数量应当等于输入数据的数量，且每个数据点的值应当与输入数据对应

**验证需求**: 2.2, 3.4, 4.2

### 属性 5: 技能分类正确性

*对于任何*技能列表，按类别分组后，每个分组中的所有技能的 category 字段应当与该分组的类别名称一致

**验证需求**: 4.1

### 属性 6: 技能筛选功能正确性

*对于任何*选中的技能标签，筛选后显示的所有项目都应当在其 skills 数组中包含该技能

**验证需求**: 4.5

### 属性 7: 交互状态切换正确性

*对于任何*可展开的工作经历卡片，点击后其展开状态应当切换（从展开变为折叠，或从折叠变为展开）

**验证需求**: 3.2

### 属性 8: 悬停状态管理正确性

*对于任何*支持悬停交互的元素（课程项、技能标签），鼠标悬停时应当显示额外信息或改变视觉状态

**验证需求**: 2.3, 4.3

### 属性 9: 时间轴排序正确性

*对于任何*教育或工作经历列表，按时间轴展示时应当按照时间顺序（从新到旧或从旧到新）排列

**验证需求**: 2.4, 3.3

### 属性 10: 响应式布局适配性

*对于任何*视口宽度变化，页面布局应当根据预设的断点（桌面、平板、移动）自动调整为对应的布局模式

**验证需求**: 2.5, 8.1, 8.2, 8.3, 8.5

### 属性 11: 表单验证有效性

*对于任何*联系表单输入，提交时应当验证所有必填字段是否填写，邮箱格式是否正确，并在验证失败时显示错误提示

**验证需求**: 5.4

### 属性 12: 下载功能可用性

*对于任何*下载按钮点击操作，应当触发简历 PDF 文件的下载行为，并更新 UI 状态以反馈下载操作

**验证需求**: 12.2, 12.3

### 属性 13: 懒加载资源延迟性

*对于任何*标记为懒加载的资源（图片、组件），应当仅在进入视口或被明确请求时才开始加载

**验证需求**: 11.4

### 属性 14: 导航菜单全局可见性

*对于任何*页面路由，导航组件应当始终存在于 DOM 中并可见

**验证需求**: 6.1


## 错误处理

### 路由错误

- **404 页面**: 当用户访问不存在的路由时，重定向到 404 页面
- **路由守卫**: 在路由切换前进行必要的验证和数据预加载

### 资源加载错误

- **图片加载失败**: 显示占位图或默认头像
- **组件加载失败**: 显示加载失败提示，提供重试按钮
- **字体加载失败**: 回退到系统默认字体

### 表单验证错误

- **实时验证**: 在用户输入时提供即时反馈
- **提交验证**: 在表单提交时进行完整验证
- **错误提示**: 清晰显示错误信息和修正建议

### 数据错误

- **数据缺失**: 使用默认值或隐藏对应模块
- **数据格式错误**: 在开发环境提供警告，生产环境优雅降级

### 浏览器兼容性

- **特性检测**: 检测浏览器是否支持关键特性
- **Polyfill**: 为旧浏览器提供必要的 polyfill
- **优雅降级**: 在不支持的浏览器中禁用高级特效，保证基本功能可用

## 测试策略

### 单元测试

使用 **Vitest** 作为单元测试框架，测试重点包括：

1. **组件测试**
   - 组件渲染是否正确
   - Props 传递是否正常
   - 事件触发是否符合预期
   - 条件渲染逻辑

2. **工具函数测试**
   - 数据格式化函数
   - 验证函数
   - 辅助函数

3. **Composables 测试**
   - 组合式函数的状态管理
   - 副作用处理
   - 返回值正确性

### 属性测试

使用 **fast-check** 作为属性测试库，每个属性测试应当运行至少 **100 次迭代**。

属性测试重点：

1. **路由和导航属性**
   - 测试属性 2: 导航路由一致性
   - 测试属性 3: 路由历史管理正确性
   - 测试属性 14: 导航菜单全局可见性

2. **数据处理属性**
   - 测试属性 4: 数据可视化准确性
   - 测试属性 5: 技能分类正确性
   - 测试属性 9: 时间轴排序正确性

3. **交互行为属性**
   - 测试属性 6: 技能筛选功能正确性
   - 测试属性 7: 交互状态切换正确性
   - 测试属性 8: 悬停状态管理正确性

4. **响应式和布局属性**
   - 测试属性 10: 响应式布局适配性

5. **表单和验证属性**
   - 测试属性 11: 表单验证有效性

**重要**: 每个属性测试必须使用注释明确标注其对应的设计文档中的属性编号，格式为：
```typescript
// Feature: vue3-portfolio-website, Property 2: 导航路由一致性
```

### 集成测试

使用 **Playwright** 或 **Cypress** 进行端到端测试：

1. **用户流程测试**
   - 完整浏览流程
   - 导航切换流程
   - 表单提交流程

2. **跨浏览器测试**
   - Chrome
   - Firefox
   - Safari
   - Edge

3. **响应式测试**
   - 桌面端 (1920x1080)
   - 平板端 (768x1024)
   - 移动端 (375x667)

### 性能测试

1. **Lighthouse 评分**
   - Performance > 90
   - Accessibility > 90
   - Best Practices > 90
   - SEO > 90

2. **关键指标**
   - FCP (First Contentful Paint) < 1.5s
   - LCP (Largest Contentful Paint) < 2.5s
   - TTI (Time to Interactive) < 3.5s
   - CLS (Cumulative Layout Shift) < 0.1


## 页面设计

### 1. 首页 (Home)

**布局**: 全屏英雄区 + 快速导航

**内容**:
- 大标题显示姓名
- 副标题显示求职意向
- 简短的个人介绍（1-2 句话）
- 核心技能标签云
- CTA 按钮（查看简历、联系我）
- 动态粒子背景或几何图形动画

**交互**:
- 滚动触发下一区域
- 技能标签悬停高亮
- 按钮悬停动画

### 2. 关于我 (About)

**布局**: 左右分栏（桌面端）/ 上下堆叠（移动端）

**内容**:
- 个人照片或插画
- 详细个人简介
- 职业理念和目标
- 个人特质标签
- 兴趣爱好图标

**交互**:
- 滚动进入动画
- 特质标签点击展开详情

### 3. 教育经历 (Education)

**布局**: 垂直时间轴

**内容**:
- 学校信息卡片
- 专业和排名
- 荣誉列表
- 主修课程成绩图表（柱状图或雷达图）

**交互**:
- 时间轴节点滚动动画
- 课程悬停显示详情
- 图表动态渲染

### 4. 工作经历 (Experience)

**布局**: 卡片式时间轴

**内容**:
- 公司和职位信息
- 工作时间段
- 职责描述
- 关键成就（可选数据可视化）

**交互**:
- 卡片点击展开/折叠
- 成就数据动画展示
- 滚动视差效果

### 5. 技能展示 (Skills)

**布局**: 分类网格 + 可视化图表

**内容**:
- 技能分类（前端、后端、工具等）
- 技能熟练度进度条或雷达图
- 技能标签和相关项目

**交互**:
- 技能标签点击筛选项目
- 悬停显示使用经验
- 图表动态绘制动画

### 6. 联系方式 (Contact)

**布局**: 居中卡片

**内容**:
- 联系信息（电话、邮箱）
- 社交媒体链接（可选）
- 联系表单（可选）
- 简历下载按钮

**交互**:
- 点击邮箱/电话触发对应操作
- 表单实时验证
- 下载按钮点击反馈

## 视觉设计规范

### 配色方案

**主题**: 深色科技风

```css
/* 主色调 */
--primary: #00D9FF;        /* 青色 - 主要强调色 */
--secondary: #7B61FF;      /* 紫色 - 次要强调色 */
--accent: #FF6B9D;         /* 粉色 - 点缀色 */

/* 背景色 */
--bg-primary: #0A0E27;     /* 深蓝黑 - 主背景 */
--bg-secondary: #151932;   /* 深蓝灰 - 次背景 */
--bg-card: rgba(21, 25, 50, 0.8);  /* 卡片背景（半透明） */

/* 文字色 */
--text-primary: #FFFFFF;   /* 主文字 */
--text-secondary: #A0AEC0; /* 次要文字 */
--text-muted: #718096;     /* 弱化文字 */

/* 边框和分割线 */
--border: rgba(255, 255, 255, 0.1);
```

### 字体

```css
/* 主字体 */
font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;

/* 标题字体 */
font-family: 'Space Grotesk', 'Inter', sans-serif;

/* 代码字体 */
font-family: 'Fira Code', 'Consolas', monospace;
```

### 间距系统

使用 8px 基准间距系统：
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### 圆角

- 小圆角: 4px (按钮、标签)
- 中圆角: 8px (卡片、输入框)
- 大圆角: 16px (大型卡片)
- 圆形: 50% (头像、图标按钮)

### 阴影

```css
/* 小阴影 */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

/* 中阴影 */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

/* 大阴影 */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

/* 发光效果 */
box-shadow: 0 0 20px rgba(0, 217, 255, 0.3);
```

## 动画设计

### 页面过渡

- **淡入淡出**: 路由切换默认动画
- **滑动**: 前进后退时的方向性动画
- **缩放**: 模态框和弹窗

### 元素动画

- **进入动画**: 滚动到视口时触发
  - 淡入 + 上移
  - 淡入 + 缩放
  - 从左/右滑入

- **悬停动画**: 
  - 轻微放大 (scale: 1.05)
  - 颜色过渡
  - 阴影增强

- **点击反馈**:
  - 按钮按下效果
  - 波纹扩散

### 背景动画

- **粒子系统**: Canvas 实现的动态粒子
- **渐变流动**: CSS 渐变动画
- **几何图形**: SVG 动画

### 性能考虑

- 使用 `transform` 和 `opacity` 实现动画（GPU 加速）
- 避免动画期间的 layout 和 paint
- 使用 `will-change` 提示浏览器优化
- 在低性能设备上降低动画复杂度

## 性能优化策略

### 代码分割

- 路由级别的代码分割
- 组件懒加载
- 第三方库按需引入

### 资源优化

- 图片压缩和格式优化（WebP）
- 使用 CDN 加载静态资源
- 字体子集化
- SVG 图标内联

### 加载优化

- 关键 CSS 内联
- 预加载关键资源
- 懒加载非首屏图片
- 骨架屏占位

### 缓存策略

- Service Worker 缓存静态资源
- HTTP 缓存头配置
- 版本化资源文件名

### 构建优化

- Tree shaking 移除未使用代码
- 压缩 JavaScript 和 CSS
- 使用 Vite 的构建优化特性
- 分析打包体积并优化

## 部署方案

### 静态托管

推荐使用以下平台之一：
- **Vercel**: 零配置部署，自动 HTTPS
- **Netlify**: 持续部署，表单处理
- **GitHub Pages**: 免费托管
- **Cloudflare Pages**: 全球 CDN

### 构建流程

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 运行测试
npm run test

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 环境变量

```env
VITE_APP_TITLE=黄彦杰的个人网站
VITE_APP_DESCRIPTION=前端开发工程师求职网站
VITE_BASE_URL=/
```

## 可访问性

- 语义化 HTML 标签
- ARIA 属性支持
- 键盘导航支持
- 合适的颜色对比度
- 图片 alt 文本
- 焦点可见性
- 屏幕阅读器友好

## SEO 优化

- 合理的页面标题和描述
- Open Graph 标签
- 结构化数据 (JSON-LD)
- Sitemap 生成
- robots.txt 配置
- 语义化 URL
