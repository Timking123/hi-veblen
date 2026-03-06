<!--
  ReadingProgress 组件
  
  在页面顶部显示阅读进度条，反映当前滚动位置。
  使用 useReadingProgress composable 获取进度值。
  
  功能：
  - 固定在页面顶部
  - 平滑动画更新进度
  - 支持主题切换
  - 响应式设计
  
  验证: 需求 8.2, 8.3
-->
<template>
  <div 
    class="reading-progress"
    role="progressbar"
    :aria-valuenow="Math.round(progress)"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="`阅读进度: ${Math.round(progress)}%`"
  >
    <div 
      class="reading-progress__bar"
      :style="{ width: `${progress}%` }"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * ReadingProgress 组件
 * 
 * 显示页面顶部进度条，反映当前滚动阅读进度。
 * 
 * @example
 * ```vue
 * <template>
 *   <ReadingProgress />
 *   <main>
 *     <!-- 页面内容 -->
 *   </main>
 * </template>
 * ```
 */
import { useReadingProgress } from '@/composables/useReadingProgress'

// 获取阅读进度
const { progress } = useReadingProgress()
</script>

<style scoped>
/**
 * 阅读进度条样式
 * 
 * 使用 CSS 变量支持主题切换
 * 使用 transform 和 will-change 优化动画性能
 */
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: var(--bg-secondary, rgba(0, 0, 0, 0.1));
  z-index: 9999;
  overflow: hidden;
}

.reading-progress__bar {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--primary, #00d9ff),
    var(--secondary, #7b61ff)
  );
  /* 平滑动画 - 需求 8.3 */
  transition: width 150ms ease-out;
  will-change: width;
  /* 添加发光效果 */
  box-shadow: 0 0 10px var(--primary, #00d9ff);
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
  .reading-progress__bar {
    transition: none;
  }
}
</style>
