<template>
  <Transition 
    :name="effectiveTransitionName" 
    :mode="'out-in'" 
    :duration="effectiveDuration"
    @before-enter="onBeforeEnter"
    @after-leave="onAfterLeave"
  >
    <slot />
  </Transition>
</template>

<script setup lang="ts">
/**
 * 页面过渡动画组件
 * 
 * 功能：
 * - 支持前进/后退方向判断，应用不同的动画效果
 * - 前进：从右向左滑入
 * - 后退：从左向右滑入
 * - 支持淡入淡出效果
 * - 支持 prefers-reduced-motion 媒体查询
 * 
 * 验证: 需求 2.5, 2.6
 */
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import type { TransitionProps } from '@/types'

const props = withDefaults(defineProps<TransitionProps>(), {
  mode: 'fade',
  duration: 300,
})

const appStore = useAppStore()

// 检测用户是否启用了减少动画偏好
const prefersReducedMotion = ref(false)

// 监听 prefers-reduced-motion 媒体查询
let mediaQuery: MediaQueryList | null = null

onMounted(() => {
  // 检查浏览器是否支持 matchMedia
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = mediaQuery.matches
    
    // 监听变化
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.value = e.matches
    }
    
    // 使用 addEventListener 替代已废弃的 addListener
    mediaQuery.addEventListener('change', handleChange)
    
    // 清理函数
    onUnmounted(() => {
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handleChange)
      }
    })
  }
})

// 根据路由历史方向和模式计算过渡名称
// 验证: 需求 2.6 - 支持前进和后退两种方向的不同动画效果
const transitionName = computed(() => {
  const direction = appStore.routeDirection
  
  // 滑动模式：根据方向选择不同的滑动方向
  // 前进（forward）：从右向左滑入（slide-left）
  // 后退（backward）：从左向右滑入（slide-right）
  if (props.mode === 'slide') {
    return direction === 'forward' ? 'slide-left' : 'slide-right'
  }
  
  // 淡入淡出模式：使用带滑动的淡入淡出效果
  if (props.mode === 'fade') {
    return direction === 'forward' ? 'fade-slide-left' : 'fade-slide-right'
  }
  
  // 缩放模式
  return props.mode
})

// 当用户启用减少动画时，使用简单的淡入淡出或无动画
// 验证: 需求 2.9 - 当用户启用"减少动画"系统设置时所有动画被禁用或简化
const effectiveTransitionName = computed(() => {
  if (prefersReducedMotion.value) {
    return 'reduced-motion'
  }
  return transitionName.value
})

// 当用户启用减少动画时，缩短动画时长
const effectiveDuration = computed(() => {
  if (prefersReducedMotion.value) {
    return 0 // 无动画
  }
  return props.duration
})

// 动画生命周期钩子（可用于性能优化）
const onBeforeEnter = () => {
  // 可以在这里添加 will-change 优化
}

const onAfterLeave = () => {
  // 动画完成后的清理工作
}

// 导出方向信息供外部使用
defineExpose({
  direction: computed(() => appStore.routeDirection),
  prefersReducedMotion,
})
</script>

<style scoped>
/* ========== 淡入淡出过渡（带轻微滑动） ========== */
/* 验证: 需求 2.5 - 路由切换时应用滑动或淡入淡出动画 */

/* 前进方向：淡入 + 从右向左轻微滑动 */
.fade-slide-left-enter-active,
.fade-slide-left-leave-active {
  transition: opacity v-bind(duration + 'ms') ease,
              transform v-bind(duration + 'ms') ease;
}

.fade-slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 后退方向：淡入 + 从左向右轻微滑动 */
.fade-slide-right-enter-active,
.fade-slide-right-leave-active {
  transition: opacity v-bind(duration + 'ms') ease,
              transform v-bind(duration + 'ms') ease;
}

.fade-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* ========== 纯淡入淡出过渡 ========== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity v-bind(duration + 'ms') ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ========== 滑动过渡 ========== */
/* 验证: 需求 2.6 - 支持前进和后退两种方向的不同动画效果 */

/* 前进方向：从右向左滑入 */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: opacity v-bind(duration + 'ms') ease,
              transform v-bind(duration + 'ms') cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30%);
}

/* 后退方向：从左向右滑入 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: opacity v-bind(duration + 'ms') ease,
              transform v-bind(duration + 'ms') cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30%);
}

/* ========== 缩放过渡 ========== */
.zoom-enter-active,
.zoom-leave-active {
  transition: opacity v-bind(duration + 'ms') ease,
              transform v-bind(duration + 'ms') ease;
}

.zoom-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.zoom-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

/* ========== 减少动画模式 ========== */
/* 验证: 需求 2.9 - 当用户启用"减少动画"系统设置时所有动画被禁用或简化 */
.reduced-motion-enter-active,
.reduced-motion-leave-active {
  transition: none;
}

.reduced-motion-enter-from,
.reduced-motion-leave-to {
  opacity: 1;
}

/* ========== 媒体查询：减少动画偏好 ========== */
@media (prefers-reduced-motion: reduce) {
  .fade-slide-left-enter-active,
  .fade-slide-left-leave-active,
  .fade-slide-right-enter-active,
  .fade-slide-right-leave-active,
  .fade-enter-active,
  .fade-leave-active,
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active,
  .zoom-enter-active,
  .zoom-leave-active {
    transition: none !important;
  }
  
  .fade-slide-left-enter-from,
  .fade-slide-left-leave-to,
  .fade-slide-right-enter-from,
  .fade-slide-right-leave-to,
  .fade-enter-from,
  .fade-leave-to,
  .slide-left-enter-from,
  .slide-left-leave-to,
  .slide-right-enter-from,
  .slide-right-leave-to,
  .zoom-enter-from,
  .zoom-leave-to {
    opacity: 1 !important;
    transform: none !important;
  }
}

/* ========== 性能优化 ========== */
/* 使用 GPU 加速提升动画性能 */
.fade-slide-left-enter-active > *,
.fade-slide-left-leave-active > *,
.fade-slide-right-enter-active > *,
.fade-slide-right-leave-active > *,
.slide-left-enter-active > *,
.slide-left-leave-active > *,
.slide-right-enter-active > *,
.slide-right-leave-active > * {
  will-change: transform, opacity;
  backface-visibility: hidden;
}
</style>
