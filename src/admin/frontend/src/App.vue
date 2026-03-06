<script setup lang="ts">
/**
 * 根组件
 * 提供路由视图容器和全局样式
 * 
 * 功能：
 * - 路由视图容器
 * - 全局键盘快捷键初始化
 * - 主题系统初始化
 */
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { initKeyboardShortcuts, destroyKeyboardShortcuts } from '@/utils/keyboard'
import { useTheme } from '@/composables/useTheme'

const { initTheme, cleanup: cleanupTheme } = useTheme()

// 初始化键盘快捷键系统和主题系统
onMounted(() => {
  initKeyboardShortcuts()
  initTheme()
})

// 清理键盘快捷键系统和主题系统
onUnmounted(() => {
  destroyKeyboardShortcuts()
  cleanupTheme()
})
</script>

<template>
  <RouterView />
</template>

<style lang="scss">
/* 导入主题样式 */
@import '@/styles/themes.scss';

/* 全局样式 */
:root {
  /* 侧边栏宽度 */
  --sidebar-width: 220px;
  --sidebar-collapsed-width: 64px;
  
  /* 顶部栏高度 */
  --header-height: 60px;
}

/* 响应式布局断点 */
/* 桌面端: >= 1200px */
/* 平板端: 768px - 1199px */
/* 移动端: < 768px (不支持，但提供基础适配) */

html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
  font-size: 14px;
  color: var(--text-primary);
  background-color: var(--bg-color-page);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  height: 100%;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
  
  &:hover {
    background: #909399;
  }
}

/* 响应式工具类 */
@media screen and (max-width: 1199px) {
  /* 平板端适配 */
  :root {
    --sidebar-width: 180px;
  }
}

@media screen and (max-width: 767px) {
  /* 移动端基础适配（不完全支持） */
  :root {
    --sidebar-width: 0px;
    --sidebar-collapsed-width: 0px;
  }
}

/* Element Plus 覆盖样式 */
.el-message-box {
  max-width: 90vw;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
