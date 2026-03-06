<template>
  <div 
    ref="target" 
    class="lazy-image-wrapper" 
    :class="wrapperClasses"
    :style="wrapperStyle"
  >
    <!-- 骨架屏占位符 - 在图片加载前显示 -->
    <Skeleton
      v-if="status === 'loading' || status === 'idle'"
      class="lazy-image-skeleton"
      :width="skeletonWidth"
      :height="skeletonHeight"
      variant="rectangular"
      :animated="true"
    />
    
    <!-- 实际图片 - 仅在进入视口后加载 -->
    <img
      v-if="isVisible"
      :src="currentSrc"
      :alt="alt"
      :class="['lazy-image', imgClass]"
      :style="imgStyle"
      @load="onImageLoad"
      @error="onImageError"
    />
    
    <!-- 错误状态显示 -->
    <div v-if="status === 'error' && showErrorState" class="lazy-image-error">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ errorText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLazyLoad } from '@/composables/useLazyLoad'
import Skeleton from './Skeleton.vue'

/**
 * 图片加载状态类型
 * - idle: 初始状态，等待进入视口
 * - loading: 图片正在加载中
 * - loaded: 图片加载成功
 * - error: 图片加载失败
 */
type ImageStatus = 'idle' | 'loading' | 'loaded' | 'error'

interface Props {
  /** 图片源地址 */
  src: string
  /** 图片替代文本 */
  alt: string
  /** 图片自定义类名 */
  imgClass?: string
  /** 图片宽度 */
  width?: string | number
  /** 图片高度 */
  height?: string | number
  /** 加载失败时的备用图片 */
  fallback?: string
  /** 是否显示错误状态 */
  showErrorState?: boolean
  /** 错误提示文本 */
  errorText?: string
  /** 图片适应方式 */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** 图片圆角 */
  borderRadius?: string | number
  /** 预加载距离（视口边距） */
  rootMargin?: string
  /** 淡入动画持续时间（毫秒） */
  fadeInDuration?: number
}

const props = withDefaults(defineProps<Props>(), {
  imgClass: '',
  width: '100%',
  height: 'auto',
  fallback: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23151932" width="400" height="400"/%3E%3Ctext fill="%23A0AEC0" font-family="sans-serif" font-size="48" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage%3C/text%3E%3C/svg%3E',
  showErrorState: false,
  errorText: '图片加载失败',
  objectFit: 'cover',
  borderRadius: '8px',
  rootMargin: '100px',
  fadeInDuration: 300,
})

const emit = defineEmits<{
  /** 图片加载成功事件 */
  load: []
  /** 图片加载失败事件 */
  error: [error: Event]
  /** 状态变化事件 */
  statusChange: [status: ImageStatus]
}>()

// 使用 Intersection Observer API 实现懒加载
// @ts-expect-error - target 通过模板 ref 使用
const { isVisible, target } = useLazyLoad({
  rootMargin: props.rootMargin,
  threshold: 0.01,
})

// 图片加载状态
const status = ref<ImageStatus>('idle')

// 当前显示的图片源（可能是原图或备用图）
const currentSrc = ref(props.src)

// 监听 src 变化，重置状态
watch(() => props.src, (newSrc) => {
  currentSrc.value = newSrc
  status.value = 'idle'
})

// 监听可见性变化，开始加载
watch(isVisible, (visible) => {
  if (visible && status.value === 'idle') {
    status.value = 'loading'
    emit('statusChange', 'loading')
  }
})

// 计算骨架屏尺寸
const skeletonWidth = computed(() => {
  return typeof props.width === 'number' ? `${props.width}px` : props.width
})

const skeletonHeight = computed(() => {
  // 如果高度是 auto，使用一个合理的默认高度
  if (props.height === 'auto') {
    return '200px'
  }
  return typeof props.height === 'number' ? `${props.height}px` : props.height
})

// 计算包装器样式
const wrapperStyle = computed(() => ({
  '--fade-duration': `${props.fadeInDuration}ms`,
  borderRadius: typeof props.borderRadius === 'number' 
    ? `${props.borderRadius}px` 
    : props.borderRadius,
}))

// 计算包装器类名
const wrapperClasses = computed(() => ({
  'is-idle': status.value === 'idle',
  'is-loading': status.value === 'loading',
  'is-loaded': status.value === 'loaded',
  'is-error': status.value === 'error',
}))

// 计算图片样式
const imgStyle = computed(() => ({
  objectFit: props.objectFit,
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
}))

/**
 * 图片加载成功处理
 */
const onImageLoad = () => {
  status.value = 'loaded'
  emit('statusChange', 'loaded')
  emit('load')
}

/**
 * 图片加载失败处理
 */
const onImageError = (e: Event) => {
  // 如果当前不是备用图，尝试加载备用图
  if (currentSrc.value !== props.fallback && props.fallback) {
    currentSrc.value = props.fallback
    // 保持 loading 状态，等待备用图加载
    return
  }
  
  // 备用图也加载失败，设置错误状态
  status.value = 'error'
  emit('statusChange', 'error')
  emit('error', e)
}

// 暴露状态供外部使用
defineExpose({
  status,
  isVisible,
})
</script>

<style scoped>
.lazy-image-wrapper {
  position: relative;
  overflow: hidden;
  display: inline-block;
  width: 100%;
  background-color: var(--bg-secondary, #151932);
}

/* 骨架屏样式 */
.lazy-image-skeleton {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* 图片样式 */
.lazy-image {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity var(--fade-duration, 300ms) ease-in-out;
}

/* 加载完成后显示图片 */
.lazy-image-wrapper.is-loaded .lazy-image {
  opacity: 1;
}

/* 加载完成后隐藏骨架屏 */
.lazy-image-wrapper.is-loaded .lazy-image-skeleton {
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--fade-duration, 300ms) ease-in-out;
}

/* 错误状态样式 */
.lazy-image-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary, #151932);
  color: var(--text-muted, #A0AEC0);
  z-index: 2;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.error-text {
  font-size: 0.875rem;
}

/* 支持 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .lazy-image,
  .lazy-image-skeleton {
    transition: none;
  }
  
  .lazy-image-wrapper.is-loaded .lazy-image {
    opacity: 1;
  }
}
</style>
