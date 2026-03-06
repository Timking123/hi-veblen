/**
 * useScrollAnimation Composable
 * 
 * 滚动动画 Composable，为元素提供进入视口时的入场动画效果。
 * 
 * 功能：
 * - 使用 Intersection Observer API 检测元素进入视口
 * - 支持多种动画类型（淡入、滑入、缩放等）
 * - 支持配置动画延迟时间和触发阈值
 * - 支持 prefers-reduced-motion 媒体查询，尊重用户的动画偏好
 * - 支持一次性动画或重复动画
 * 
 * 验证需求：
 * - 需求 2.7: 元素进入视口时触发入场动画
 * - 需求 2.8: 支持配置动画类型（淡入、滑入、缩放等）和延迟时间
 * - 需求 2.9: 当用户启用"减少动画"系统设置时所有动画被禁用或简化
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 动画类型枚举
 * 
 * - fade-in: 淡入效果
 * - slide-up: 从下方滑入
 * - slide-left: 从右方滑入
 * - scale-in: 缩放进入
 */
export type AnimationType = 'fade-in' | 'slide-up' | 'slide-left' | 'scale-in'

/**
 * 所有支持的动画类型列表
 */
export const ANIMATION_TYPES: AnimationType[] = ['fade-in', 'slide-up', 'slide-left', 'scale-in']

/**
 * 默认动画类型
 */
export const DEFAULT_ANIMATION_TYPE: AnimationType = 'fade-in'

/**
 * 默认动画延迟（毫秒）
 */
export const DEFAULT_DELAY = 0

/**
 * 默认触发阈值（0-1）
 */
export const DEFAULT_THRESHOLD = 0.1

/**
 * 默认是否只触发一次
 */
export const DEFAULT_ONCE = true

/**
 * 滚动动画配置选项接口
 */
export interface ScrollAnimationOptions {
  /** 动画类型，默认为 'fade-in' */
  type?: AnimationType
  /** 动画延迟时间（毫秒），默认为 0 */
  delay?: number
  /** 元素进入视口的阈值（0-1），默认为 0.1 */
  threshold?: number
  /** 是否只触发一次动画，默认为 true */
  once?: boolean
}

/**
 * 动画类名对象接口
 */
export interface AnimationClassObject {
  'scroll-animate': boolean
  'scroll-animate--visible': boolean
  [key: string]: boolean
}

/**
 * 动画样式对象接口
 */
export interface AnimationStyleObject {
  transitionDelay: string
}

/**
 * 生成动画类名对象
 * 
 * @param type - 动画类型
 * @param isVisible - 元素是否可见
 * @returns 动画类名对象
 * 
 * 验证: 需求 2.8 - 支持配置动画类型
 */
export function generateAnimationClass(
  type: AnimationType,
  isVisible: boolean
): AnimationClassObject {
  return {
    'scroll-animate': true,
    [`scroll-animate--${type}`]: true,
    'scroll-animate--visible': isVisible,
  }
}

/**
 * 生成动画样式对象
 * 
 * @param delay - 动画延迟时间（毫秒）
 * @returns 动画样式对象
 * 
 * 验证: 需求 2.8 - 支持配置延迟时间
 */
export function generateAnimationStyle(delay: number): AnimationStyleObject {
  return {
    transitionDelay: `${delay}ms`,
  }
}

/**
 * 检查用户是否启用了减少动画设置
 * 
 * @returns 如果用户启用了减少动画设置则返回 true
 * 
 * 验证: 需求 2.9 - 当用户启用"减少动画"系统设置时所有动画被禁用或简化
 */
export function checkPrefersReducedMotion(): boolean {
  // 在服务端渲染或测试环境中，window 可能不存在
  if (typeof window === 'undefined') {
    return false
  }
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 验证动画类型是否有效
 * 
 * @param type - 要验证的动画类型
 * @returns 如果动画类型有效则返回 true
 */
export function isValidAnimationType(type: string): type is AnimationType {
  return ANIMATION_TYPES.includes(type as AnimationType)
}

/**
 * 规范化滚动动画选项
 * 
 * @param options - 用户提供的选项
 * @returns 规范化后的选项，包含所有默认值
 */
export function normalizeOptions(options: ScrollAnimationOptions = {}): Required<ScrollAnimationOptions> {
  return {
    type: options.type ?? DEFAULT_ANIMATION_TYPE,
    delay: options.delay ?? DEFAULT_DELAY,
    threshold: options.threshold ?? DEFAULT_THRESHOLD,
    once: options.once ?? DEFAULT_ONCE,
  }
}

/**
 * 滚动动画 Composable
 * 
 * @param options - 滚动动画配置选项
 * @returns 滚动动画相关的响应式状态和方法
 * 
 * @example
 * ```vue
 * <template>
 *   <div
 *     ref="elementRef"
 *     :class="animationClass"
 *     :style="animationStyle"
 *   >
 *     动画内容
 *   </div>
 * </template>
 * 
 * <script setup lang="ts">
 * import { useScrollAnimation } from '@/composables/useScrollAnimation'
 * 
 * const { elementRef, animationClass, animationStyle } = useScrollAnimation({
 *   type: 'slide-up',
 *   delay: 200,
 *   threshold: 0.2,
 * })
 * </script>
 * 
 * <style>
 * .scroll-animate {
 *   opacity: 0;
 *   transition: opacity 0.6s ease, transform 0.6s ease;
 * }
 * 
 * .scroll-animate--slide-up {
 *   transform: translateY(30px);
 * }
 * 
 * .scroll-animate--visible {
 *   opacity: 1;
 *   transform: translateY(0);
 * }
 * </style>
 * ```
 * 
 * 验证: 需求 2.7 - 元素进入视口时触发入场动画
 * 验证: 需求 2.8 - 支持配置动画类型和延迟时间
 * 验证: 需求 2.9 - 当用户启用"减少动画"系统设置时所有动画被禁用或简化
 */
export function useScrollAnimation(options: ScrollAnimationOptions = {}) {
  // 规范化选项
  const normalizedOptions = normalizeOptions(options)
  const { type, delay, threshold, once } = normalizedOptions
  
  /** 要观察的元素引用 */
  const elementRef = ref<HTMLElement | null>(null)
  
  /** 元素是否可见（进入视口） */
  const isVisible = ref(false)
  
  /** Intersection Observer 实例 */
  let observer: IntersectionObserver | null = null
  
  /**
   * 动画类名对象
   * 
   * 验证: 需求 2.8 - 支持配置动画类型
   */
  const animationClass = computed<AnimationClassObject>(() => {
    return generateAnimationClass(type, isVisible.value)
  })
  
  /**
   * 动画样式对象
   * 
   * 验证: 需求 2.8 - 支持配置延迟时间
   */
  const animationStyle = computed<AnimationStyleObject>(() => {
    return generateAnimationStyle(delay)
  })
  
  /**
   * 开始观察元素
   * 
   * 验证: 需求 2.7 - 元素进入视口时触发入场动画
   * 验证: 需求 2.9 - 当用户启用"减少动画"系统设置时所有动画被禁用或简化
   */
  const startObserving = (): void => {
    if (!elementRef.value) return
    
    // 检查用户是否启用了减少动画设置
    // 验证: 需求 2.9
    const prefersReducedMotion = checkPrefersReducedMotion()
    if (prefersReducedMotion) {
      // 如果用户启用了减少动画，直接设置为可见，跳过动画
      isVisible.value = true
      return
    }
    
    // 创建 Intersection Observer
    // 验证: 需求 2.7 - 使用 Intersection Observer API 检测元素进入视口
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 元素进入视口，触发动画
            isVisible.value = true
            
            // 如果只触发一次，停止观察
            if (once && observer) {
              observer.unobserve(entry.target)
            }
          } else if (!once) {
            // 如果不是只触发一次，元素离开视口时重置状态
            isVisible.value = false
          }
        })
      },
      { threshold }
    )
    
    observer.observe(elementRef.value)
  }
  
  /**
   * 停止观察元素
   */
  const stopObserving = (): void => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }
  
  /**
   * 重置状态（用于测试）
   */
  const reset = (): void => {
    isVisible.value = false
    stopObserving()
  }
  
  // 生命周期钩子
  onMounted(() => {
    startObserving()
  })
  
  onUnmounted(() => {
    stopObserving()
  })
  
  return {
    /** 要观察的元素引用 */
    elementRef,
    /** 元素是否可见（进入视口） */
    isVisible,
    /** 动画类名对象 */
    animationClass,
    /** 动画样式对象 */
    animationStyle,
    /** 重置状态（用于测试） */
    reset,
  }
}
