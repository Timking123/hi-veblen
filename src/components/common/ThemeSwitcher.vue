<template>
  <button
    class="theme-switcher"
    :class="{ 'theme-switcher--active': isAnimating }"
    :aria-label="ariaLabel"
    :title="tooltipText"
    @click="handleClick"
    data-testid="theme-switcher"
  >
    <span class="theme-switcher__icon" :class="iconClass">
      <!-- 太阳图标 (浅色主题) -->
      <svg
        v-if="mode === 'light'"
        class="theme-switcher__svg theme-switcher__svg--sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>

      <!-- 月亮图标 (深色主题) -->
      <svg
        v-else-if="mode === 'dark'"
        class="theme-switcher__svg theme-switcher__svg--moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>

      <!-- 系统/电脑图标 (跟随系统) -->
      <svg
        v-else
        class="theme-switcher__svg theme-switcher__svg--system"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    </span>
    
    <!-- 当前模式文字标签（可选，用于辅助功能） -->
    <span class="theme-switcher__label sr-only">
      {{ modeLabel }}
    </span>
  </button>
</template>

<script setup lang="ts">
/**
 * ThemeSwitcher 组件
 * 
 * 主题切换按钮组件，用于在三种主题模式之间循环切换。
 * 
 * 功能：
 * - 显示当前主题对应的图标（太阳/月亮/系统）
 * - 点击时循环切换主题：dark → light → system → dark
 * - 提供无障碍支持（aria-label、键盘导航）
 * - 切换时播放动画效果
 * 
 * 验证需求：
 * - 需求 1.2: 用户点击时在三种模式之间循环切换
 * - 需求 1.8: 浅色主题激活时确保所有组件的对比度符合 WCAG AA 标准
 */

import { computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

// 使用主题 Composable
const { mode, cycleTheme } = useTheme()

// 动画状态
const isAnimating = ref(false)

/**
 * 图标类名
 * 根据当前主题模式返回对应的 CSS 类
 */
const iconClass = computed(() => ({
  'icon-sun': mode.value === 'light',
  'icon-moon': mode.value === 'dark',
  'icon-system': mode.value === 'system',
}))

/**
 * 无障碍标签
 * 描述点击后将切换到的主题
 * 
 * 验证: 需求 1.8 - WCAG AA 标准（提供清晰的无障碍标签）
 */
const ariaLabel = computed(() => {
  const labels: Record<string, string> = {
    dark: '切换到浅色主题',
    light: '切换到跟随系统',
    system: '切换到深色主题',
  }
  return labels[mode.value] || '切换主题'
})

/**
 * 工具提示文字
 * 显示当前主题模式和点击后的操作
 */
const tooltipText = computed(() => {
  const tips: Record<string, string> = {
    dark: '当前：深色主题 | 点击切换到浅色主题',
    light: '当前：浅色主题 | 点击切换到跟随系统',
    system: '当前：跟随系统 | 点击切换到深色主题',
  }
  return tips[mode.value] || '切换主题'
})

/**
 * 当前模式标签（用于屏幕阅读器）
 */
const modeLabel = computed(() => {
  const labels: Record<string, string> = {
    dark: '深色主题',
    light: '浅色主题',
    system: '跟随系统',
  }
  return labels[mode.value] || '未知主题'
})

/**
 * 处理点击事件
 * 触发主题切换并播放动画
 * 
 * 验证: 需求 1.2 - 循环切换主题
 */
const handleClick = () => {
  // 触发动画
  isAnimating.value = true
  
  // 切换主题
  cycleTheme()
  
  // 动画结束后重置状态
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}
</script>

<style scoped>
/**
 * ThemeSwitcher 样式
 * 
 * 设计原则：
 * - 简洁的圆形按钮设计
 * - 平滑的过渡动画
 * - 符合 WCAG AA 对比度标准
 * - 响应式设计，适配移动端
 */

.theme-switcher {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  background: var(--bg-button, rgba(255, 255, 255, 0.1));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.theme-switcher:hover {
  background: var(--bg-button-hover, rgba(255, 255, 255, 0.15));
  border-color: var(--primary, #00d9ff);
  transform: scale(1.05);
}

.theme-switcher:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--border-focus, rgba(0, 217, 255, 0.5));
}

.theme-switcher:focus-visible {
  outline: 2px solid var(--primary, #00d9ff);
  outline-offset: 2px;
}

.theme-switcher:active {
  transform: scale(0.95);
}

/* 点击动画状态 */
.theme-switcher--active {
  animation: theme-switch-pulse 0.3s ease;
}

@keyframes theme-switch-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}

/* 图标容器 */
.theme-switcher__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* SVG 图标通用样式 */
.theme-switcher__svg {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--text-primary, #ffffff);
  transition: all 0.3s ease;
}

/* 太阳图标动画 */
.theme-switcher__svg--sun {
  animation: sun-rotate 0.5s ease;
}

@keyframes sun-rotate {
  from {
    transform: rotate(-90deg) scale(0.5);
    opacity: 0;
  }
  to {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
}

/* 月亮图标动画 */
.theme-switcher__svg--moon {
  animation: moon-appear 0.5s ease;
}

@keyframes moon-appear {
  from {
    transform: rotate(90deg) scale(0.5);
    opacity: 0;
  }
  to {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
}

/* 系统图标动画 */
.theme-switcher__svg--system {
  animation: system-appear 0.5s ease;
}

@keyframes system-appear {
  from {
    transform: translateY(-10px) scale(0.5);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* 悬停时图标效果 */
.theme-switcher:hover .theme-switcher__svg {
  color: var(--primary, #00d9ff);
}

/* 屏幕阅读器专用文本 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .theme-switcher {
    width: 2.25rem;
    height: 2.25rem;
  }

  .theme-switcher__svg {
    width: 1.125rem;
    height: 1.125rem;
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .theme-switcher,
  .theme-switcher__svg {
    transition: none;
    animation: none;
  }

  .theme-switcher--active {
    animation: none;
  }

  .theme-switcher__svg--sun,
  .theme-switcher__svg--moon,
  .theme-switcher__svg--system {
    animation: none;
  }
}
</style>
