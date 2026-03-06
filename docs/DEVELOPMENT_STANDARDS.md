# 开发标准与规范文档

> 本文档遵循阿里巴巴前端开发规范，为项目提供统一的开发标准和最佳实践指南。

## 目录

- [一、项目概述](#一项目概述)
- [二、技术栈规范](#二技术栈规范)
- [三、目录结构规范](#三目录结构规范)
- [四、命名规范](#四命名规范)
- [五、代码风格规范](#五代码风格规范)
- [六、组件开发规范](#六组件开发规范)
- [七、TypeScript 规范](#七typescript-规范)
- [八、CSS/样式规范](#八css样式规范)
- [九、Git 提交规范](#九git-提交规范)
- [十、测试规范](#十测试规范)
- [十一、性能优化规范](#十一性能优化规范)
- [十二、安全规范](#十二安全规范)
- [十三、文档规范](#十三文档规范)

---

## 一、项目概述

### 1.1 项目信息

| 项目属性 | 说明 |
|---------|------|
| 项目名称 | Vue3 个人作品集网站（Vue3 Portfolio Website） |
| 项目类型 | 单页应用（SPA） |
| 主要功能 | 个人简历展示、技能展示、彩蛋游戏 |
| 目标用户 | 招聘方、HR、技术面试官 |

### 1.2 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端应用层                            │
├─────────────────────────────────────────────────────────┤
│  Vue 3 (Composition API) + TypeScript + Vite           │
├─────────────────────────────────────────────────────────┤
│  状态管理: Pinia    路由: Vue Router    样式: TailwindCSS │
├─────────────────────────────────────────────────────────┤
│  游戏引擎: Canvas 2D + Web Audio API                    │
├─────────────────────────────────────────────────────────┤
│  构建工具: Vite    测试: Vitest + Playwright            │
└─────────────────────────────────────────────────────────┘
```

---

## 二、技术栈规范

### 2.1 核心依赖版本要求

| 依赖项 | 最低版本 | 推荐版本 | 说明 |
|-------|---------|---------|------|
| Node.js | 18.0.0 | 20.x | 运行环境 |
| Vue | 3.4.0 | 3.4+ | 前端框架 |
| TypeScript | 5.0.0 | 5.3+ | 类型系统 |
| Vite | 5.0.0 | 5.0+ | 构建工具 |
| Pinia | 2.0.0 | 2.1+ | 状态管理 |
| Vue Router | 4.0.0 | 4.2+ | 路由管理 |
| TailwindCSS | 3.0.0 | 3.4+ | CSS 框架 |

### 2.2 开发工具要求

| 工具 | 用途 | 配置文件 |
|-----|------|---------|
| ESLint（代码检查） | 代码质量检查 | `.eslintrc.cjs` |
| Prettier（代码格式化） | 代码格式化 | `.prettierrc.json` |
| TypeScript（类型检查） | 类型检查 | `tsconfig.json` |
| Vitest（单元测试） | 单元测试 | `vite.config.ts` |
| Playwright（端到端测试） | E2E 测试 | `playwright.config.ts` |

---

## 三、目录结构规范

### 3.1 项目根目录结构

```
项目根目录/
├── .github/                 # GitHub 配置（CI/CD 工作流）
├── .kiro/                   # Kiro 配置（规格文档）
│   └── specs/               # 功能规格文档
├── docs/                    # 项目文档
├── e2e/                     # 端到端测试
├── public/                  # 静态资源（不经过构建）
│   ├── audio/               # 音频资源
│   ├── images/              # 图片资源
│   └── resume.pdf           # 简历文件
├── scripts/                 # 构建脚本
├── src/                     # 源代码
├── .env.development         # 开发环境变量
├── .env.production          # 生产环境变量
├── index.html               # 入口 HTML
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite 配置
└── tailwind.config.js       # TailwindCSS 配置
```

### 3.2 源代码目录结构

```
src/
├── assets/                  # 静态资源（经过构建处理）
│   ├── icons/               # 图标资源
│   └── images/              # 图片资源
├── components/              # 可复用组件
│   ├── common/              # 通用组件（Button、Card 等）
│   │   └── __tests__/       # 组件测试
│   ├── effects/             # 特效组件（粒子背景等）
│   ├── game/                # 游戏组件
│   └── layout/              # 布局组件（导航、页脚等）
├── composables/             # 组合式函数（Composables）
│   └── __tests__/           # Composables 测试
├── data/                    # 静态数据配置
├── game/                    # 游戏引擎代码
│   ├── entities/            # 游戏实体（玩家、敌人等）
│   ├── weapons/             # 武器系统
│   ├── utils/               # 游戏工具函数
│   └── __tests__/           # 游戏测试
├── router/                  # 路由配置
├── stores/                  # Pinia 状态管理
├── styles/                  # 全局样式
├── test/                    # 测试配置
├── types/                   # TypeScript 类型定义
├── utils/                   # 工具函数
│   └── __tests__/           # 工具函数测试
├── views/                   # 页面组件
│   └── __tests__/           # 页面测试
├── App.vue                  # 根组件
├── main.ts                  # 入口文件
└── style.css                # 全局样式入口
```

### 3.3 目录命名规则

| 目录类型 | 命名规则 | 示例 |
|---------|---------|------|
| 组件目录 | kebab-case（短横线） | `common/`, `game/` |
| 测试目录 | `__tests__` | `__tests__/` |
| 类型目录 | 小写 | `types/` |
| 工具目录 | 小写 | `utils/` |

---

## 四、命名规范

### 4.1 文件命名规范

| 文件类型 | 命名规则 | 示例 |
|---------|---------|------|
| Vue 组件 | PascalCase（大驼峰） | `UserProfile.vue`, `GameContainer.vue` |
| TypeScript 文件 | camelCase（小驼峰） | `useScroll.ts`, `helpers.ts` |
| TypeScript 类文件 | PascalCase | `GameEngine.ts`, `AudioSystem.ts` |
| 测试文件 | `*.test.ts` 或 `*.spec.ts` | `Button.test.ts`, `navigation.spec.ts` |
| 属性测试文件 | `*.property.test.ts` | `Timeline.property.test.ts` |
| 样式文件 | kebab-case | `variables.css`, `animations.css` |
| 配置文件 | 小写或 kebab-case | `vite.config.ts`, `tailwind.config.js` |

### 4.2 变量命名规范

```typescript
// ✅ 正确示例

// 常量：UPPER_SNAKE_CASE（大写下划线）
const MAX_RETRY_COUNT = 3
const API_BASE_URL = 'https://api.example.com'
const GAME_CONFIG = { width: 800, height: 600 }

// 变量：camelCase（小驼峰）
const userName = '黄彦杰'
const isLoading = false
const currentPage = 1

// 函数：camelCase（小驼峰），动词开头
function getUserInfo() { }
function handleClick() { }
function validateEmail() { }

// 布尔值：is/has/can/should 开头
const isVisible = true
const hasPermission = false
const canEdit = true
const shouldUpdate = false

// 私有属性：下划线前缀（类内部）
class GameEngine {
  private _isRunning = false
  private _frameCount = 0
}
```

### 4.3 组件命名规范

```typescript
// ✅ 正确示例

// 组件名：PascalCase，至少两个单词
// 文件名与组件名一致
export default defineComponent({
  name: 'UserProfile',  // 组件名
})

// 组件使用：PascalCase 或 kebab-case
<UserProfile />
<user-profile />

// 基础组件：Base/App/V 前缀
BaseButton.vue
BaseCard.vue
AppHeader.vue

// 单例组件：The 前缀
TheNavigation.vue
TheFooter.vue
TheSidebar.vue

// 紧密耦合组件：父组件名前缀
TodoList.vue
TodoListItem.vue
TodoListItemButton.vue
```

### 4.4 类型命名规范

```typescript
// ✅ 正确示例

// 接口：PascalCase，I 前缀可选
interface User { }
interface IUserService { }  // 服务接口可加 I 前缀

// 类型别名：PascalCase
type UserId = string
type UserRole = 'admin' | 'user' | 'guest'

// 枚举：PascalCase，成员 UPPER_SNAKE_CASE
enum EnemyType {
  WHITE = 'white',
  GREEN = 'green',
  BLUE = 'blue',
}

// 泛型参数：单个大写字母或描述性名称
function identity<T>(arg: T): T { }
function map<TInput, TOutput>(arr: TInput[]): TOutput[] { }
```

---

## 五、代码风格规范

### 5.1 基本格式

| 规则 | 配置 |
|-----|------|
| 缩进 | 2 空格 |
| 行宽 | 最大 100 字符 |
| 引号 | 单引号 `'` |
| 分号 | 不使用（除非必要） |
| 尾随逗号 | ES5 兼容模式 |
| 换行符 | LF（Unix 风格） |

### 5.2 ESLint 配置要点

```javascript
// .eslintrc.cjs 关键配置
module.exports = {
  rules: {
    // Vue 规则
    'vue/multi-word-component-names': 'error',      // 组件名多单词
    'vue/component-definition-name-casing': ['error', 'PascalCase'],
    'vue/prop-name-casing': ['error', 'camelCase'],
    
    // TypeScript 规则
    '@typescript-eslint/no-explicit-any': 'warn',   // 避免 any
    '@typescript-eslint/explicit-function-return-type': 'off',
    
    // 通用规则
    'no-console': 'warn',                           // 警告 console
    'no-debugger': 'error',                         // 禁止 debugger
    'prefer-const': 'error',                        // 优先 const
  }
}
```

### 5.3 代码注释规范

```typescript
/**
 * 函数/类的 JSDoc 注释
 * @description 函数功能描述
 * @param {string} name - 参数说明
 * @returns {boolean} 返回值说明
 * @example
 * validateEmail('test@example.com') // true
 */
function validateEmail(email: string): boolean {
  // 单行注释：解释复杂逻辑
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// TODO: 待办事项说明
// FIXME: 需要修复的问题
// NOTE: 重要说明
// HACK: 临时解决方案，需要优化
```

### 5.4 导入顺序规范

```typescript
// 1. Node.js 内置模块
import path from 'path'

// 2. 第三方库
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

// 3. 项目内部模块（按路径深度排序）
import { useAppStore } from '@/stores/app'
import type { User } from '@/types'
import { formatDate } from '@/utils/helpers'

// 4. 相对路径导入
import ChildComponent from './ChildComponent.vue'
import { localHelper } from './helpers'

// 5. 样式文件
import './styles.css'
```

---

## 六、组件开发规范

### 6.1 组件结构顺序

```vue
<script setup lang="ts">
// 1. 类型导入
import type { PropType } from 'vue'

// 2. 组件导入
import ChildComponent from './ChildComponent.vue'

// 3. 组合式函数导入
import { useScroll } from '@/composables/useScroll'

// 4. Props 定义
interface Props {
  title: string
  count?: number
}
const props = withDefaults(defineProps<Props>(), {
  count: 0,
})

// 5. Emits 定义
const emit = defineEmits<{
  (e: 'update', value: string): void
  (e: 'close'): void
}>()

// 6. 响应式状态
const isVisible = ref(false)
const items = ref<string[]>([])

// 7. 计算属性
const doubleCount = computed(() => props.count * 2)

// 8. 侦听器
watch(() => props.title, (newVal) => {
  console.log('Title changed:', newVal)
})

// 9. 生命周期钩子
onMounted(() => {
  // 初始化逻辑
})

// 10. 方法定义
function handleClick() {
  emit('update', 'new value')
}

// 11. 暴露给父组件的方法
defineExpose({
  reset: () => { items.value = [] }
})
</script>

<template>
  <!-- 模板内容 -->
</template>

<style scoped>
/* 组件样式 */
</style>
```

### 6.2 Props 规范

```typescript
// ✅ 推荐：使用 TypeScript 接口定义
interface Props {
  // 必填属性
  id: string
  title: string
  
  // 可选属性（带默认值）
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  items?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  disabled: false,
  items: () => [],  // 数组/对象默认值使用工厂函数
})

// ❌ 避免：直接修改 props
props.title = 'new title'  // 错误！

// ✅ 正确：通过 emit 通知父组件
emit('update:title', 'new title')
```

### 6.3 事件规范

```typescript
// 定义事件类型
const emit = defineEmits<{
  // 无参数事件
  (e: 'close'): void
  // 带参数事件
  (e: 'update', value: string): void
  // v-model 事件
  (e: 'update:modelValue', value: boolean): void
}>()

// 事件命名：kebab-case
// 在模板中使用
<ChildComponent @update-value="handleUpdate" />

// 事件处理函数命名：handle + 事件名
function handleClose() { }
function handleUpdateValue(value: string) { }
```

### 6.4 插槽规范

```vue
<!-- 默认插槽 -->
<slot />

<!-- 具名插槽 -->
<slot name="header" />
<slot name="footer" />

<!-- 作用域插槽 -->
<slot name="item" :item="item" :index="index" />

<!-- 使用插槽 -->
<MyComponent>
  <template #header>
    <h1>标题</h1>
  </template>
  
  <template #item="{ item, index }">
    <div>{{ index }}: {{ item.name }}</div>
  </template>
</MyComponent>
```

---

## 七、TypeScript 规范

### 7.1 类型定义规范

```typescript
// ✅ 优先使用 interface 定义对象类型
interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: Date
}

// ✅ 使用 type 定义联合类型、交叉类型
type UserRole = 'admin' | 'user' | 'guest'
type UserWithProfile = User & { profile: Profile }

// ✅ 使用枚举定义固定值集合
enum Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// ✅ 使用泛型提高复用性
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// ❌ 避免使用 any
function process(data: any) { }  // 不推荐

// ✅ 使用 unknown 替代 any
function process(data: unknown) {
  if (typeof data === 'string') {
    // 类型收窄后使用
  }
}
```

### 7.2 函数类型规范

```typescript
// ✅ 明确参数和返回值类型
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ✅ 使用函数重载处理多种参数
function format(value: string): string
function format(value: number): string
function format(value: Date): string
function format(value: string | number | Date): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  return value.toISOString()
}

// ✅ 使用可选参数和默认值
function greet(name: string, greeting = 'Hello'): string {
  return `${greeting}, ${name}!`
}

// ✅ 使用剩余参数
function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0)
}
```

### 7.3 类型断言规范

```typescript
// ✅ 优先使用类型守卫
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  )
}

// ✅ 必要时使用 as 断言
const element = document.getElementById('app') as HTMLDivElement

// ❌ 避免双重断言
const value = someValue as unknown as TargetType  // 不推荐

// ✅ 使用非空断言时要确保值存在
const element = document.getElementById('app')!  // 确保元素存在
```

### 7.4 类型文件组织

```typescript
// src/types/index.ts - 统一导出类型

// 基础类型
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// 业务类型
export interface Profile extends BaseEntity {
  name: string
  title: string
  email: string
  phone: string
}

export interface Education extends BaseEntity {
  school: string
  major: string
  degree: string
  startDate: string
  endDate: string
}

// 游戏类型
export interface GameEntity {
  id: string
  x: number
  y: number
  width: number
  height: number
  isActive: boolean
}

// 枚举类型
export enum EnemyType {
  WHITE = 'white',
  GREEN = 'green',
  BLUE = 'blue',
  PURPLE = 'purple',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red',
}
```

---

## 八、CSS/样式规范

### 8.1 CSS 变量命名

```css
/* 颜色变量：--color-{用途}-{变体} */
--color-primary: #00D9FF;
--color-primary-dark: #00B8D9;
--color-primary-light: #4DE8FF;

--color-background: #0A0E27;
--color-background-secondary: #141B3D;

--color-text: #FFFFFF;
--color-text-secondary: #A0AEC0;

/* 间距变量：--spacing-{尺寸} */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;

/* 字体变量 */
--font-family-sans: 'Inter', sans-serif;
--font-size-sm: 14px;
--font-size-base: 16px;
--font-size-lg: 18px;

/* 圆角变量 */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;

/* 阴影变量 */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

### 8.2 CSS 类命名（BEM 规范）

```css
/* Block（块）：独立的组件 */
.card { }
.navigation { }
.button { }

/* Element（元素）：块的组成部分，双下划线连接 */
.card__header { }
.card__body { }
.card__footer { }

/* Modifier（修饰符）：块或元素的变体，双横线连接 */
.button--primary { }
.button--large { }
.card--highlighted { }

/* 状态类：is- 或 has- 前缀 */
.is-active { }
.is-disabled { }
.has-error { }
```

### 8.3 样式组织规范

```vue
<style scoped>
/* 1. 布局属性 */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 2. 盒模型属性 */
.box {
  width: 100%;
  max-width: 800px;
  padding: var(--spacing-md);
  margin: var(--spacing-lg) auto;
}

/* 3. 视觉属性 */
.card {
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

/* 4. 文字属性 */
.title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.5;
}

/* 5. 动画属性 */
.animated {
  transition: all 0.3s ease;
  animation: fadeIn 0.5s ease-out;
}
</style>
```

### 8.4 响应式设计规范

```css
/* 移动优先原则 */
.container {
  padding: var(--spacing-sm);
}

/* 平板 (768px+) */
@media (min-width: 768px) {
  .container {
    padding: var(--spacing-md);
  }
}

/* 桌面 (1024px+) */
@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-lg);
  }
}

/* 大屏 (1280px+) */
@media (min-width: 1280px) {
  .container {
    padding: var(--spacing-xl);
  }
}
```

---

## 九、Git 提交规范

### 9.1 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 9.2 Type 类型说明

| 类型 | 说明 | 示例 |
|-----|------|------|
| feat | 新功能 | `feat(game): 添加音频系统` |
| fix | 修复 Bug | `fix(ui): 修复导航栏闪烁问题` |
| docs | 文档更新 | `docs: 更新部署文档` |
| style | 代码格式（不影响功能） | `style: 格式化代码` |
| refactor | 重构（不是新功能或修复） | `refactor(game): 重构渲染系统` |
| perf | 性能优化 | `perf: 优化图片加载` |
| test | 测试相关 | `test: 添加组件单元测试` |
| chore | 构建/工具相关 | `chore: 更新依赖版本` |
| revert | 回滚提交 | `revert: 回滚 feat(game)` |

### 9.3 Scope 范围说明

| 范围 | 说明 |
|-----|------|
| game | 游戏相关 |
| ui | 界面组件 |
| router | 路由相关 |
| store | 状态管理 |
| utils | 工具函数 |
| styles | 样式相关 |
| config | 配置相关 |
| deps | 依赖相关 |

### 9.4 提交示例

```bash
# 新功能
git commit -m "feat(game): 添加像素艺术渲染系统

- 实现 PixelArtRenderer 类
- 添加玩家飞船像素艺术
- 添加街机边框效果

Closes #123"

# Bug 修复
git commit -m "fix(ui): 修复移动端导航菜单无法关闭的问题

在点击菜单项后添加关闭逻辑

Fixes #456"

# 文档更新
git commit -m "docs: 添加阿里云部署指南"

# 性能优化
git commit -m "perf(game): 优化渲染性能

- 添加对象池
- 实现视锥剔除
- 减少 30% 渲染调用"
```

### 9.5 分支命名规范

| 分支类型 | 命名格式 | 示例 |
|---------|---------|------|
| 主分支 | `main` | `main` |
| 开发分支 | `develop` | `develop` |
| 功能分支 | `feature/{功能名}` | `feature/audio-system` |
| 修复分支 | `fix/{问题描述}` | `fix/navigation-bug` |
| 发布分支 | `release/{版本号}` | `release/v2.0.0` |
| 热修复分支 | `hotfix/{问题描述}` | `hotfix/critical-bug` |

---

## 十、测试规范

### 10.1 测试文件组织

```
src/
├── components/
│   └── common/
│       ├── Button.vue
│       └── __tests__/
│           ├── Button.test.ts           # 单元测试
│           └── Button.property.test.ts  # 属性测试
├── game/
│   └── __tests__/
│       ├── GameEngine.test.ts           # 单元测试
│       ├── GameFlow.integration.test.ts # 集成测试
│       └── Performance.test.ts          # 性能测试
e2e/
├── navigation.spec.ts                   # E2E 测试
└── user-flow.spec.ts
```

### 10.2 单元测试规范

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../Button.vue'

describe('Button（按钮组件）', () => {
  // 测试分组：describe
  describe('渲染', () => {
    it('应该正确渲染默认按钮', () => {
      const wrapper = mount(Button, {
        props: { label: '点击' }
      })
      expect(wrapper.text()).toBe('点击')
    })

    it('应该应用正确的样式类', () => {
      const wrapper = mount(Button, {
        props: { variant: 'primary' }
      })
      expect(wrapper.classes()).toContain('btn-primary')
    })
  })

  describe('交互', () => {
    it('点击时应该触发 click 事件', async () => {
      const wrapper = mount(Button)
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeTruthy()
    })

    it('禁用状态下不应该触发 click 事件', async () => {
      const wrapper = mount(Button, {
        props: { disabled: true }
      })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeFalsy()
    })
  })
})
```

### 10.3 属性测试规范

```typescript
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('formatDate（日期格式化）- 属性测试', () => {
  /**
   * 属性 1: 格式化后的日期应该是有效字符串
   * Validates: Requirements 1.1
   */
  it('应该总是返回有效的日期字符串', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') }),
        (date) => {
          const result = formatDate(date)
          expect(typeof result).toBe('string')
          expect(result.length).toBeGreaterThan(0)
        }
      )
    )
  })

  /**
   * 属性 2: 格式化是确定性的
   * Validates: Requirements 1.2
   */
  it('相同输入应该产生相同输出', () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const result1 = formatDate(date)
        const result2 = formatDate(date)
        expect(result1).toBe(result2)
      })
    )
  })
})
```

### 10.4 E2E 测试规范

```typescript
import { test, expect } from '@playwright/test'

test.describe('导航功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('应该能够导航到所有页面', async ({ page }) => {
    // 点击导航链接
    await page.click('text=关于我')
    await expect(page).toHaveURL('/about')
    
    // 验证页面内容
    await expect(page.locator('h1')).toContainText('关于我')
  })

  test('移动端应该显示汉堡菜单', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    
    // 验证汉堡菜单可见
    await expect(page.locator('.hamburger-menu')).toBeVisible()
  })
})
```

### 10.5 测试覆盖率要求

| 类型 | 最低覆盖率 | 目标覆盖率 |
|-----|-----------|-----------|
| 语句覆盖 | 70% | 80% |
| 分支覆盖 | 60% | 70% |
| 函数覆盖 | 70% | 80% |
| 行覆盖 | 70% | 80% |

---

## 十一、性能优化规范

### 11.1 加载性能

```typescript
// ✅ 路由懒加载
const routes = [
  {
    path: '/about',
    component: () => import('@/views/About.vue'),  // 懒加载
  },
]

// ✅ 组件懒加载
const HeavyChart = defineAsyncComponent({
  loader: () => import('@/components/HeavyChart.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200,
})

// ✅ 图片懒加载
<LazyImage 
  :src="imageUrl" 
  alt="描述"
  :threshold="0.1"
/>
```

### 11.2 运行时性能

```typescript
// ✅ 使用 computed 缓存计算结果
const filteredItems = computed(() => 
  items.value.filter(item => item.active)
)

// ✅ 使用 shallowRef 优化大型对象
const largeData = shallowRef<LargeObject>(initialData)

// ✅ 使用 v-once 渲染静态内容
<div v-once>{{ staticContent }}</div>

// ✅ 使用 v-memo 缓存列表项
<div v-for="item in list" :key="item.id" v-memo="[item.id, item.selected]">
  {{ item.name }}
</div>

// ✅ 避免不必要的响应式
const staticConfig = markRaw({
  // 不需要响应式的配置
})
```

### 11.3 游戏性能优化

```typescript
// ✅ 对象池模式
class ObjectPool<T> {
  private pool: T[] = []
  
  acquire(): T {
    return this.pool.pop() || this.createNew()
  }
  
  release(obj: T): void {
    this.reset(obj)
    this.pool.push(obj)
  }
}

// ✅ 视锥剔除
function isVisible(entity: Entity, viewport: Viewport): boolean {
  return (
    entity.x + entity.width > viewport.x &&
    entity.x < viewport.x + viewport.width &&
    entity.y + entity.height > viewport.y &&
    entity.y < viewport.y + viewport.height
  )
}

// ✅ 批量渲染
function renderBatch(ctx: CanvasRenderingContext2D, entities: Entity[]): void {
  ctx.save()
  entities.forEach(entity => entity.render(ctx))
  ctx.restore()
}

// ✅ 精灵缓存
const spriteCache = new Map<string, ImageData>()
function getCachedSprite(key: string): ImageData {
  if (!spriteCache.has(key)) {
    spriteCache.set(key, renderSprite(key))
  }
  return spriteCache.get(key)!
}
```

### 11.4 性能指标目标

| 指标 | 目标值 | 说明 |
|-----|-------|------|
| FCP（首次内容绘制） | < 1.5s | 首次内容出现时间 |
| LCP（最大内容绘制） | < 2.5s | 最大内容出现时间 |
| TTI（可交互时间） | < 3.5s | 页面可交互时间 |
| CLS（累积布局偏移） | < 0.1 | 布局稳定性 |
| FPS（游戏帧率） | 60 FPS | 游戏流畅度 |
| 内存占用 | < 100MB | 游戏内存限制 |

---

## 十二、安全规范

### 12.1 XSS 防护

```typescript
// ❌ 危险：直接插入 HTML
element.innerHTML = userInput

// ✅ 安全：使用 textContent
element.textContent = userInput

// ✅ Vue 中使用 v-text 而非 v-html
<div v-text="userInput"></div>

// ✅ 必须使用 v-html 时，先进行消毒
import DOMPurify from 'dompurify'
const sanitizedHtml = DOMPurify.sanitize(userInput)
```

### 12.2 敏感信息处理

```typescript
// ❌ 禁止：在代码中硬编码敏感信息
const apiKey = 'sk-xxxxx'

// ✅ 正确：使用环境变量
const apiKey = import.meta.env.VITE_API_KEY

// ✅ 正确：敏感信息不提交到版本控制
// .gitignore
.env.local
.env.*.local
```

### 12.3 依赖安全

```bash
# 定期检查依赖安全漏洞
npm audit

# 自动修复安全问题
npm audit fix

# 更新依赖到安全版本
npm update
```

### 12.4 安全响应头

```typescript
// Nginx 或服务器配置
// X-Frame-Options: 防止点击劫持
// X-Content-Type-Options: 防止 MIME 类型嗅探
// X-XSS-Protection: XSS 过滤
// Content-Security-Policy: 内容安全策略

// vercel.json 示例
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

---

## 十三、文档规范

### 13.1 代码文档

```typescript
/**
 * 游戏引擎类
 * @description 负责游戏循环、实体管理和渲染
 * @example
 * const engine = new GameEngine(canvas)
 * engine.start()
 */
export class GameEngine {
  /**
   * 启动游戏循环
   * @returns {void}
   */
  start(): void { }
  
  /**
   * 添加游戏实体
   * @param {Entity} entity - 要添加的实体
   * @throws {Error} 如果实体无效
   */
  addEntity(entity: Entity): void { }
}
```

### 13.2 README 文档结构

```markdown
# 项目名称

## 项目简介
简要描述项目功能和目的

## 技术栈
列出主要技术和版本

## 快速开始
### 环境要求
### 安装步骤
### 运行项目

## 项目结构
目录结构说明

## 开发指南
### 开发命令
### 代码规范
### 提交规范

## 部署指南
部署步骤和配置

## 贡献指南
如何参与贡献

## 许可证
项目许可证信息
```

### 13.3 变更日志格式

```markdown
# 变更日志

## [2.0.0] - 2026-01-30

### 新增
- 像素艺术渲染系统
- 音频系统（背景音乐 + 音效）
- 效果系统（爆炸 + 屏幕震动）

### 变更
- 移动控制优化
- 武器平衡调整
- 场景扩大 50%

### 修复
- 修复移动控制不精确问题
- 修复内存泄漏问题

### 移除
- 移除旧版渲染系统

## [1.0.0] - 2026-01-15

### 新增
- 初始版本发布
```

---

## 附录

### A. 常用命令速查

```bash
# 开发
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建

# 代码质量
npm run lint         # 代码检查
npm run format       # 代码格式化
npm run type-check   # 类型检查

# 测试
npm run test         # 运行单元测试
npm run test:watch   # 监听模式测试
npm run test:e2e     # 运行 E2E 测试
npm run test:coverage # 生成覆盖率报告
```

### B. 推荐 VS Code 扩展

- Vue - Official（Vue 官方扩展）
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- GitLens

### C. 参考资源

- [Vue 3 官方文档](https://vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [阿里巴巴前端规范](https://github.com/alibaba/f2e-spec)
- [Vite 官方文档](https://vitejs.dev/)

---

**文档版本**: 1.0.0  
**最后更新**: 2026-01-30  
**维护者**: 项目开发团队
