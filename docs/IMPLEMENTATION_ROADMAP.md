# 实施路线图

> 详细的功能实现计划与技术方案

## 🚀 快速启动任务

以下是可以立即开始的高价值任务：

---

## 任务 1：浅色主题支持

### 目标
为网站添加浅色主题，支持用户切换

### 技术方案

**1. 创建主题变量文件**

```css
/* src/styles/themes/light.css */
:root[data-theme="light"] {
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --bg-card: rgba(255, 255, 255, 0.9);
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border: rgba(0, 0, 0, 0.1);
  --primary: #0ea5e9;
  --secondary: #8b5cf6;
  --accent: #f43f5e;
}
```

**2. 创建主题切换 Composable**

```typescript
// src/composables/useTheme.ts
import { ref, watch } from 'vue'

type Theme = 'dark' | 'light' | 'system'

export function useTheme() {
  const theme = ref<Theme>(
    (localStorage.getItem('theme') as Theme) || 'system'
  )

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', newTheme)
    }
  }

  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }, { immediate: true })

  return { theme, applyTheme }
}
```

**3. 添加主题切换按钮到导航栏**

### 预计工时
4 小时

### 验收标准
- [ ] 浅色主题视觉效果良好
- [ ] 主题切换平滑过渡
- [ ] 用户偏好持久化存储
- [ ] 支持跟随系统主题

---

## 任务 2：微交互动画增强

### 目标
为按钮、卡片等元素添加丰富的交互动画

### 技术方案

**1. 按钮涟漪效果**

```vue
<!-- src/components/common/RippleButton.vue -->
<template>
  <button class="ripple-btn" @click="createRipple">
    <span class="ripple-container">
      <span
        v-for="ripple in ripples"
        :key="ripple.id"
        class="ripple"
        :style="ripple.style"
      />
    </span>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Ripple {
  id: number
  style: Record<string, string>
}

const ripples = ref<Ripple[]>([])
let rippleId = 0

const createRipple = (e: MouseEvent) => {
  const btn = e.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2

  const ripple: Ripple = {
    id: rippleId++,
    style: {
      width: `${size}px`,
      height: `${size}px`,
      left: `${x}px`,
      top: `${y}px`,
    },
  }

  ripples.value.push(ripple)
  setTimeout(() => {
    ripples.value = ripples.value.filter((r) => r.id !== ripple.id)
  }, 600)
}
</script>
```

**2. 卡片 3D 悬停效果**

```css
.card-3d {
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
}

.card-3d:hover {
  transform: perspective(1000px) rotateX(5deg) rotateY(-5deg) translateZ(10px);
}
```

### 预计工时
5 小时

### 验收标准
- [ ] 按钮点击有涟漪效果
- [ ] 卡片悬停有 3D 效果
- [ ] 动画流畅无卡顿
- [ ] 支持 `prefers-reduced-motion`

---

## 任务 3：项目详情页

### 目标
为每个项目创建独立的详情展示页面

### 技术方案

**1. 数据结构扩展**

```typescript
// src/types/index.ts
interface Project {
  id: string
  name: string
  description: string
  period: string
  role: string
  technologies: string[]
  highlights: string[]
  screenshots: string[]
  demoUrl?: string
  sourceUrl?: string
}
```

**2. 路由配置**

```typescript
// src/router/index.ts
{
  path: '/projects/:id',
  name: 'ProjectDetail',
  component: () => import('@/views/ProjectDetail.vue'),
  props: true,
}
```

**3. 页面组件结构**

```vue
<!-- src/views/ProjectDetail.vue -->
<template>
  <div class="project-detail">
    <header class="project-header">
      <h1>{{ project.name }}</h1>
      <div class="project-meta">
        <span class="period">{{ project.period }}</span>
        <span class="role">{{ project.role }}</span>
      </div>
    </header>

    <section class="project-gallery">
      <ImageCarousel :images="project.screenshots" />
    </section>

    <section class="project-description">
      <h2>项目介绍</h2>
      <p>{{ project.description }}</p>
    </section>

    <section class="project-tech">
      <h2>技术栈</h2>
      <div class="tech-tags">
        <Tag v-for="tech in project.technologies" :key="tech">
          {{ tech }}
        </Tag>
      </div>
    </section>

    <section class="project-highlights">
      <h2>项目亮点</h2>
      <ul>
        <li v-for="highlight in project.highlights" :key="highlight">
          {{ highlight }}
        </li>
      </ul>
    </section>
  </div>
</template>
```

### 预计工时
6 小时

### 验收标准
- [ ] 项目详情页正常显示
- [ ] 图片轮播功能正常
- [ ] 技术栈标签可点击筛选
- [ ] 响应式布局适配

---

## 任务 4：技能树可视化

### 目标
用树状图展示技能之间的关系和层级

### 技术方案

**1. 数据结构**

```typescript
interface SkillNode {
  id: string
  name: string
  level: number
  children?: SkillNode[]
}

const skillTree: SkillNode = {
  id: 'root',
  name: '技术栈',
  level: 100,
  children: [
    {
      id: 'frontend',
      name: '前端开发',
      level: 95,
      children: [
        { id: 'vue', name: 'Vue.js', level: 95 },
        { id: 'ts', name: 'TypeScript', level: 90 },
        // ...
      ],
    },
    // ...
  ],
}
```

**2. ECharts 树图配置**

```typescript
const option = {
  series: [
    {
      type: 'tree',
      data: [skillTree],
      layout: 'radial',
      symbol: 'circle',
      symbolSize: (value: number) => value / 5,
      label: {
        position: 'inside',
        formatter: '{b}',
      },
      leaves: {
        label: {
          position: 'outside',
        },
      },
      emphasis: {
        focus: 'descendant',
      },
      expandAndCollapse: true,
      animationDuration: 550,
      animationDurationUpdate: 750,
    },
  ],
}
```

### 预计工时
6 小时

### 验收标准
- [ ] 技能树正确展示
- [ ] 支持展开/折叠
- [ ] 悬停显示详情
- [ ] 动画效果流畅

---

## 任务 5：游戏排行榜

### 目标
为彩蛋游戏添加本地排行榜功能

### 技术方案

**1. 数据存储**

```typescript
// src/game/LeaderboardManager.ts
interface ScoreEntry {
  score: number
  stage: number
  timestamp: number
  playerName: string
}

class LeaderboardManager {
  private readonly STORAGE_KEY = 'game_leaderboard'
  private readonly MAX_ENTRIES = 10

  getScores(): ScoreEntry[] {
    const data = localStorage.getItem(this.STORAGE_KEY)
    return data ? JSON.parse(data) : []
  }

  addScore(entry: ScoreEntry): number {
    const scores = this.getScores()
    scores.push(entry)
    scores.sort((a, b) => b.score - a.score)
    const trimmed = scores.slice(0, this.MAX_ENTRIES)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed))
    return trimmed.findIndex((s) => s.timestamp === entry.timestamp) + 1
  }

  isHighScore(score: number): boolean {
    const scores = this.getScores()
    return scores.length < this.MAX_ENTRIES || score > scores[scores.length - 1].score
  }
}
```

**2. 排行榜 UI 组件**

```vue
<!-- src/components/game/Leaderboard.vue -->
<template>
  <div class="leaderboard">
    <h2>🏆 排行榜</h2>
    <div class="leaderboard-list">
      <div
        v-for="(entry, index) in scores"
        :key="entry.timestamp"
        class="leaderboard-entry"
        :class="{ highlight: isCurrentScore(entry) }"
      >
        <span class="rank">{{ getRankEmoji(index + 1) }}</span>
        <span class="name">{{ entry.playerName }}</span>
        <span class="score">{{ entry.score.toLocaleString() }}</span>
        <span class="stage">第 {{ entry.stage }} 关</span>
      </div>
    </div>
  </div>
</template>
```

### 预计工时
4 小时

### 验收标准
- [ ] 分数正确保存
- [ ] 排行榜正确排序
- [ ] 新纪录高亮显示
- [ ] 数据持久化存储

---

## 任务 6：PWA 支持

### 目标
将网站转换为渐进式 Web 应用

### 技术方案

**1. 安装 vite-plugin-pwa**

```bash
npm install vite-plugin-pwa -D
```

**2. Vite 配置**

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'images/*.png'],
      manifest: {
        name: '黄彦杰 - 个人求职网站',
        short_name: '黄彦杰',
        description: '前端开发工程师个人求职网站',
        theme_color: '#0a0e27',
        background_color: '#0a0e27',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
```

### 预计工时
3 小时

### 验收标准
- [ ] 可添加到主屏幕
- [ ] 离线访问基本功能
- [ ] Service Worker 正常工作
- [ ] 应用图标正确显示

---

## 📊 进度跟踪

| 任务 | 状态 | 开始时间 | 完成时间 |
|------|------|----------|----------|
| 浅色主题支持 | ⬜ 未开始 | - | - |
| 微交互动画 | ⬜ 未开始 | - | - |
| 项目详情页 | ⬜ 未开始 | - | - |
| 技能树可视化 | ⬜ 未开始 | - | - |
| 游戏排行榜 | ⬜ 未开始 | - | - |
| PWA 支持 | ⬜ 未开始 | - | - |

**状态说明**:
- ⬜ 未开始
- 🔄 进行中
- ✅ 已完成
- ⏸️ 暂停

---

## 📝 注意事项

1. **代码规范**: 遵循现有的 ESLint 和 Prettier 配置
2. **测试覆盖**: 新功能需要添加相应的单元测试
3. **文档更新**: 完成功能后更新相关文档
4. **性能监控**: 关注新功能对性能的影响
5. **兼容性**: 确保在主流浏览器中正常工作

---

*文档创建时间: 2026-01-30*
