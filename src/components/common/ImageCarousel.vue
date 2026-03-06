<template>
  <div 
    ref="carouselRef"
    class="image-carousel"
    :class="{ 'is-swiping': isSwiping }"
    @keydown="handleKeydown"
    tabindex="0"
    role="region"
    aria-label="图片轮播"
    :aria-roledescription="ariaRoleDescription"
  >
    <!-- 图片容器 -->
    <div 
      class="carousel-track"
      :style="trackStyle"
    >
      <div
        v-for="(image, index) in images"
        :key="index"
        class="carousel-slide"
        :class="{ 'is-active': index === currentIndex }"
        :aria-hidden="index !== currentIndex"
      >
        <LazyImage
          :src="image"
          :alt="`轮播图片 ${index + 1}`"
          class="carousel-image"
          object-fit="cover"
          width="100%"
          height="100%"
        />
      </div>
    </div>

    <!-- 左箭头 -->
    <button
      v-if="showArrows && images.length > 1"
      class="carousel-arrow carousel-arrow--prev"
      @click="prev"
      :aria-label="prevAriaLabel"
      type="button"
    >
      <span class="arrow-icon">‹</span>
    </button>

    <!-- 右箭头 -->
    <button
      v-if="showArrows && images.length > 1"
      class="carousel-arrow carousel-arrow--next"
      @click="next"
      :aria-label="nextAriaLabel"
      type="button"
    >
      <span class="arrow-icon">›</span>
    </button>

    <!-- 指示器 -->
    <div 
      v-if="showIndicators && images.length > 1"
      class="carousel-indicators"
      role="tablist"
      aria-label="轮播指示器"
    >
      <button
        v-for="(_, index) in images"
        :key="index"
        class="carousel-indicator"
        :class="{ 'is-active': index === currentIndex }"
        @click="goTo(index)"
        role="tab"
        :aria-selected="index === currentIndex"
        :aria-label="`跳转到第 ${index + 1} 张图片`"
        type="button"
      />
    </div>
  </div>
</template>

<script lang="ts">
/**
 * 计算下一个索引（循环）
 * 
 * @param current - 当前索引
 * @param total - 总数量
 * @returns 下一个索引
 * 
 * 验证: 需求 5.3 - 向右切换应该使索引加 1（循环到开头）
 */
export function calculateNextIndex(current: number, total: number): number {
  if (total <= 0) return 0
  return (current + 1) % total
}

/**
 * 计算上一个索引（循环）
 * 
 * @param current - 当前索引
 * @param total - 总数量
 * @returns 上一个索引
 * 
 * 验证: 需求 5.3 - 向左切换应该使索引减 1（循环到末尾）
 */
export function calculatePrevIndex(current: number, total: number): number {
  if (total <= 0) return 0
  return (current - 1 + total) % total
}
</script>

<script setup lang="ts">
/**
 * ImageCarousel 组件
 * 
 * 图片轮播组件，支持左右切换、自动播放、指示器和箭头控件。
 * 
 * 功能：
 * - 支持图片数组作为输入
 * - 实现左右切换功能（循环切换）
 * - 支持自动播放模式（可配置间隔时间）
 * - 显示指示器（小圆点）
 * - 显示左右箭头控件
 * - 支持键盘导航（左右方向键）
 * - 支持触摸滑动切换
 * - 添加过渡动画效果
 * 
 * 验证需求：
 * - 需求 5.3: Image_Carousel 支持左右滑动或点击箭头切换项目截图
 * - 需求 5.4: Image_Carousel 支持自动播放和手动控制两种模式
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import LazyImage from './LazyImage.vue'
import { useGesture } from '@/composables/useGesture'

/**
 * ImageCarousel 组件属性接口
 */
export interface ImageCarouselProps {
  /** 图片 URL 数组 */
  images: string[]
  /** 是否自动播放，默认 false */
  autoPlay?: boolean
  /** 自动播放间隔时间（毫秒），默认 3000 */
  interval?: number
  /** 是否显示指示器，默认 true */
  showIndicators?: boolean
  /** 是否显示箭头，默认 true */
  showArrows?: boolean
}

/**
 * ImageCarousel 组件事件接口
 */
export interface ImageCarouselEmits {
  (e: 'change', index: number): void
}

const props = withDefaults(defineProps<ImageCarouselProps>(), {
  autoPlay: false,
  interval: 3000,
  showIndicators: true,
  showArrows: true,
})

const emit = defineEmits<ImageCarouselEmits>()

// 当前显示的图片索引
const currentIndex = ref(0)

// 轮播容器引用
const carouselRef = ref<HTMLElement | null>(null)

// 自动播放定时器
let autoPlayTimer: ReturnType<typeof setInterval> | null = null

// 是否正在滑动
const isSwiping = ref(false)

/**
 * 计算轮播轨道样式
 * 使用 transform 实现平滑滑动效果
 */
const trackStyle = computed(() => ({
  transform: `translateX(-${currentIndex.value * 100}%)`,
}))

/**
 * 无障碍访问：角色描述
 */
const ariaRoleDescription = computed(() => 
  `轮播，共 ${props.images.length} 张图片`
)

/**
 * 无障碍访问：上一张按钮标签
 */
const prevAriaLabel = computed(() => {
  const prevIndex = (currentIndex.value - 1 + props.images.length) % props.images.length
  return `上一张，跳转到第 ${prevIndex + 1} 张图片`
})

/**
 * 无障碍访问：下一张按钮标签
 */
const nextAriaLabel = computed(() => {
  const nextIndex = (currentIndex.value + 1) % props.images.length
  return `下一张，跳转到第 ${nextIndex + 1} 张图片`
})

/**
 * 切换到下一张图片
 * 
 * 验证: 需求 5.3 - 支持点击箭头切换项目截图
 */
const next = (): void => {
  if (props.images.length <= 1) return
  currentIndex.value = calculateNextIndex(currentIndex.value, props.images.length)
  emit('change', currentIndex.value)
}

/**
 * 切换到上一张图片
 * 
 * 验证: 需求 5.3 - 支持点击箭头切换项目截图
 */
const prev = (): void => {
  if (props.images.length <= 1) return
  currentIndex.value = calculatePrevIndex(currentIndex.value, props.images.length)
  emit('change', currentIndex.value)
}

/**
 * 跳转到指定索引的图片
 * 
 * @param index - 目标索引
 */
const goTo = (index: number): void => {
  if (index < 0 || index >= props.images.length) return
  currentIndex.value = index
  emit('change', currentIndex.value)
}

/**
 * 处理键盘导航
 * 
 * @param e - 键盘事件
 * 
 * 支持：
 * - 左方向键：上一张
 * - 右方向键：下一张
 * - Home：第一张
 * - End：最后一张
 */
const handleKeydown = (e: KeyboardEvent): void => {
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      prev()
      break
    case 'ArrowRight':
      e.preventDefault()
      next()
      break
    case 'Home':
      e.preventDefault()
      goTo(0)
      break
    case 'End':
      e.preventDefault()
      goTo(props.images.length - 1)
      break
  }
}

/**
 * 启动自动播放
 * 
 * 验证: 需求 5.4 - 支持自动播放模式
 */
const startAutoPlay = (): void => {
  if (!props.autoPlay || props.images.length <= 1) return
  stopAutoPlay()
  autoPlayTimer = setInterval(() => {
    next()
  }, props.interval)
}

/**
 * 停止自动播放
 */
const stopAutoPlay = (): void => {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

/**
 * 暂停自动播放（鼠标悬停时）
 */
const pauseAutoPlay = (): void => {
  stopAutoPlay()
}

/**
 * 恢复自动播放（鼠标离开时）
 */
const resumeAutoPlay = (): void => {
  if (props.autoPlay) {
    startAutoPlay()
  }
}

// 使用手势处理 Composable 实现触摸滑动
// 验证: 需求 5.3 - 支持左右滑动切换项目截图
const { elementRef: gestureRef, isSwiping: gestureSwiping } = useGesture({
  onSwipeLeft: () => {
    next()
    // 滑动后重置自动播放计时器
    if (props.autoPlay) {
      startAutoPlay()
    }
  },
  onSwipeRight: () => {
    prev()
    // 滑动后重置自动播放计时器
    if (props.autoPlay) {
      startAutoPlay()
    }
  },
})

// 同步滑动状态（使用 getter 函数避免 watch 警告）
watch(() => gestureSwiping.value, (value) => {
  isSwiping.value = value
})

// 监听 autoPlay 属性变化
watch(() => props.autoPlay, (newValue) => {
  if (newValue) {
    startAutoPlay()
  } else {
    stopAutoPlay()
  }
})

// 监听 interval 属性变化
watch(() => props.interval, () => {
  if (props.autoPlay) {
    startAutoPlay()
  }
})

// 监听 images 属性变化，重置索引
watch(() => props.images, () => {
  if (currentIndex.value >= props.images.length) {
    currentIndex.value = 0
    emit('change', currentIndex.value)
  }
})

// 组件挂载时
onMounted(() => {
  // 将手势绑定到轮播容器
  if (carouselRef.value) {
    gestureRef.value = carouselRef.value
  }
  
  // 启动自动播放
  if (props.autoPlay) {
    startAutoPlay()
  }
  
  // 添加鼠标悬停事件监听（暂停/恢复自动播放）
  if (carouselRef.value) {
    carouselRef.value.addEventListener('mouseenter', pauseAutoPlay)
    carouselRef.value.addEventListener('mouseleave', resumeAutoPlay)
  }
})

// 组件卸载时
onUnmounted(() => {
  stopAutoPlay()
  
  // 移除鼠标悬停事件监听
  if (carouselRef.value) {
    carouselRef.value.removeEventListener('mouseenter', pauseAutoPlay)
    carouselRef.value.removeEventListener('mouseleave', resumeAutoPlay)
  }
})

// 暴露方法供外部使用
defineExpose({
  /** 当前索引 */
  currentIndex,
  /** 切换到下一张 */
  next,
  /** 切换到上一张 */
  prev,
  /** 跳转到指定索引 */
  goTo,
  /** 启动自动播放 */
  startAutoPlay,
  /** 停止自动播放 */
  stopAutoPlay,
})
</script>

<style scoped>
.image-carousel {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: var(--border-radius, 8px);
  background-color: var(--bg-secondary, #151932);
  outline: none;
}

/* 聚焦时显示轮廓 */
.image-carousel:focus-visible {
  outline: 2px solid var(--primary, #00D9FF);
  outline-offset: 2px;
}

/* 轮播轨道 */
.carousel-track {
  display: flex;
  transition: transform 0.3s ease-in-out;
  will-change: transform;
}

/* 滑动时禁用过渡动画 */
.image-carousel.is-swiping .carousel-track {
  transition: none;
}

/* 单个幻灯片 */
.carousel-slide {
  flex: 0 0 100%;
  width: 100%;
  aspect-ratio: 16 / 9;
  position: relative;
}

/* 图片样式 */
.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 箭头按钮基础样式 */
.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, opacity 0.2s ease;
  z-index: 10;
  opacity: 0.7;
}

.carousel-arrow:hover {
  background-color: rgba(0, 0, 0, 0.7);
  opacity: 1;
}

.carousel-arrow:focus-visible {
  outline: 2px solid var(--primary, #00D9FF);
  outline-offset: 2px;
}

.carousel-arrow--prev {
  left: 12px;
}

.carousel-arrow--next {
  right: 12px;
}

.arrow-icon {
  font-size: 24px;
  line-height: 1;
  font-weight: bold;
}

/* 指示器容器 */
.carousel-indicators {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
}

/* 单个指示器 */
.carousel-indicator {
  width: 8px;
  height: 8px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.carousel-indicator:hover {
  background-color: rgba(255, 255, 255, 0.8);
}

.carousel-indicator.is-active {
  background-color: var(--primary, #00D9FF);
  transform: scale(1.2);
}

.carousel-indicator:focus-visible {
  outline: 2px solid var(--primary, #00D9FF);
  outline-offset: 2px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .carousel-arrow {
    width: 32px;
    height: 32px;
  }
  
  .arrow-icon {
    font-size: 20px;
  }
  
  .carousel-arrow--prev {
    left: 8px;
  }
  
  .carousel-arrow--next {
    right: 8px;
  }
  
  .carousel-indicators {
    bottom: 8px;
  }
  
  .carousel-indicator {
    width: 6px;
    height: 6px;
  }
}

/* 支持 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .carousel-track {
    transition: none;
  }
  
  .carousel-arrow,
  .carousel-indicator {
    transition: none;
  }
}
</style>
