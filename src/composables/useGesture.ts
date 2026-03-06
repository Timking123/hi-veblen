/**
 * useGesture Composable
 * 
 * 手势处理 Composable，为移动端提供触摸滑动手势识别功能。
 * 
 * 功能：
 * - 检测触摸滑动方向（左、右、上、下）
 * - 基于滑动距离和速度阈值判断是否触发滑动事件
 * - 支持触觉反馈（如果设备支持 navigator.vibrate）
 * - 自动绑定和解绑触摸事件监听器
 * 
 * 验证需求：
 * - 需求 3.1: 用户在移动端左右滑动时切换到上一页或下一页
 * - 需求 3.2: 滑动距离超过 50px 且速度超过阈值才触发页面切换
 * - 需求 3.3: 用户触摸交互元素时提供触觉反馈（如果设备支持）
 */

import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 默认最小滑动距离（像素）
 * 验证: 需求 3.2 - 滑动距离超过 50px 才触发
 */
export const DEFAULT_MIN_DISTANCE = 50

/**
 * 默认最小滑动速度（像素/毫秒）
 * 验证: 需求 3.2 - 速度超过阈值才触发
 */
export const DEFAULT_MIN_VELOCITY = 0.3

/**
 * 触觉反馈振动时长（毫秒）
 * 验证: 需求 3.3 - 提供触觉反馈
 */
export const HAPTIC_FEEDBACK_DURATION = 10

/**
 * 滑动方向枚举
 */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null

/**
 * 手势配置接口
 */
export interface GestureConfig {
  /** 最小滑动距离（像素），默认 50 */
  minDistance?: number
  /** 最小滑动速度（像素/毫秒），默认 0.3 */
  minVelocity?: number
  /** 向左滑动回调 */
  onSwipeLeft?: () => void
  /** 向右滑动回调 */
  onSwipeRight?: () => void
  /** 向上滑动回调 */
  onSwipeUp?: () => void
  /** 向下滑动回调 */
  onSwipeDown?: () => void
}

/**
 * 滑动数据接口
 * 用于存储滑动过程中的计算数据
 */
export interface SwipeData {
  /** X 轴位移（像素） */
  deltaX: number
  /** Y 轴位移（像素） */
  deltaY: number
  /** 滑动时长（毫秒） */
  deltaTime: number
  /** X 轴速度（像素/毫秒） */
  velocityX: number
  /** Y 轴速度（像素/毫秒） */
  velocityY: number
  /** 是否为水平滑动 */
  isHorizontal: boolean
}

/**
 * 计算滑动数据
 * 
 * @param startX - 起始 X 坐标
 * @param startY - 起始 Y 坐标
 * @param endX - 结束 X 坐标
 * @param endY - 结束 Y 坐标
 * @param startTime - 起始时间戳
 * @param endTime - 结束时间戳
 * @returns 滑动数据对象
 */
export function calculateSwipeData(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  startTime: number,
  endTime: number
): SwipeData {
  const deltaX = endX - startX
  const deltaY = endY - startY
  const deltaTime = Math.max(endTime - startTime, 1) // 防止除以零
  
  const velocityX = Math.abs(deltaX) / deltaTime
  const velocityY = Math.abs(deltaY) / deltaTime
  
  const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY)
  
  return {
    deltaX,
    deltaY,
    deltaTime,
    velocityX,
    velocityY,
    isHorizontal,
  }
}

/**
 * 判断滑动方向
 * 
 * @param swipeData - 滑动数据
 * @param minDistance - 最小滑动距离
 * @param minVelocity - 最小滑动速度
 * @returns 滑动方向，如果不满足阈值条件则返回 null
 * 
 * 验证: 需求 3.1 - 检测左右滑动
 * 验证: 需求 3.2 - 滑动距离超过 50px 且速度超过阈值才触发
 */
export function detectSwipeDirection(
  swipeData: SwipeData,
  minDistance: number,
  minVelocity: number
): SwipeDirection {
  const { deltaX, deltaY, velocityX, velocityY, isHorizontal } = swipeData
  
  if (isHorizontal) {
    // 水平滑动：检查距离和速度阈值
    if (Math.abs(deltaX) >= minDistance && velocityX >= minVelocity) {
      return deltaX > 0 ? 'right' : 'left'
    }
  } else {
    // 垂直滑动：检查距离和速度阈值
    if (Math.abs(deltaY) >= minDistance && velocityY >= minVelocity) {
      return deltaY > 0 ? 'down' : 'up'
    }
  }
  
  return null
}

/**
 * 触发触觉反馈
 * 
 * @returns 是否成功触发触觉反馈
 * 
 * 验证: 需求 3.3 - 用户触摸交互元素时提供触觉反馈（如果设备支持）
 */
export function triggerHapticFeedback(): boolean {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(HAPTIC_FEEDBACK_DURATION)
      return true
    } catch {
      // 静默忽略触觉反馈错误
      return false
    }
  }
  return false
}

/**
 * 手势处理 Composable
 * 
 * @param config - 手势配置
 * @returns 手势相关的响应式状态和方法
 * 
 * @example
 * ```vue
 * <template>
 *   <div ref="elementRef" class="swipeable-container">
 *     可滑动内容
 *   </div>
 * </template>
 * 
 * <script setup lang="ts">
 * import { useRouter } from 'vue-router'
 * import { useGesture } from '@/composables/useGesture'
 * 
 * const router = useRouter()
 * 
 * const { elementRef, isSwiping } = useGesture({
 *   onSwipeLeft: () => router.push('/next'),
 *   onSwipeRight: () => router.push('/prev'),
 * })
 * </script>
 * ```
 * 
 * 验证: 需求 3.1 - 用户在移动端左右滑动时切换到上一页或下一页
 * 验证: 需求 3.2 - 滑动距离超过 50px 且速度超过阈值才触发页面切换
 * 验证: 需求 3.3 - 用户触摸交互元素时提供触觉反馈（如果设备支持）
 */
export function useGesture(config: GestureConfig = {}) {
  const {
    minDistance = DEFAULT_MIN_DISTANCE,
    minVelocity = DEFAULT_MIN_VELOCITY,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = config
  
  /** 绑定手势的目标元素引用 */
  const elementRef = ref<HTMLElement | null>(null)
  
  /** 是否正在滑动 */
  const isSwiping = ref(false)
  
  /** 最后检测到的滑动方向 */
  const lastSwipeDirection = ref<SwipeDirection>(null)
  
  // 内部状态变量
  let startX = 0
  let startY = 0
  let startTime = 0
  
  /**
   * 处理触摸开始事件
   * 
   * @param e - 触摸事件
   */
  const handleTouchStart = (e: TouchEvent): void => {
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
    startTime = Date.now()
    isSwiping.value = true
  }
  
  /**
   * 处理触摸结束事件
   * 
   * @param e - 触摸事件
   * 
   * 验证: 需求 3.1 - 检测滑动方向并触发相应回调
   * 验证: 需求 3.2 - 检查距离和速度阈值
   * 验证: 需求 3.3 - 水平滑动时触发触觉反馈
   */
  const handleTouchEnd = (e: TouchEvent): void => {
    if (!isSwiping.value) return
    
    const touch = e.changedTouches[0]
    const endX = touch.clientX
    const endY = touch.clientY
    const endTime = Date.now()
    
    // 计算滑动数据
    const swipeData = calculateSwipeData(
      startX,
      startY,
      endX,
      endY,
      startTime,
      endTime
    )
    
    // 检测滑动方向
    const direction = detectSwipeDirection(swipeData, minDistance, minVelocity)
    lastSwipeDirection.value = direction
    
    // 根据方向触发回调
    if (direction === 'right' && onSwipeRight) {
      onSwipeRight()
      triggerHapticFeedback()
    } else if (direction === 'left' && onSwipeLeft) {
      onSwipeLeft()
      triggerHapticFeedback()
    } else if (direction === 'down' && onSwipeDown) {
      onSwipeDown()
    } else if (direction === 'up' && onSwipeUp) {
      onSwipeUp()
    }
    
    isSwiping.value = false
  }
  
  /**
   * 手动绑定事件监听器
   * 用于在 onMounted 之外手动控制事件绑定
   */
  const bindEvents = (): void => {
    if (!elementRef.value) return
    elementRef.value.addEventListener('touchstart', handleTouchStart, { passive: true })
    elementRef.value.addEventListener('touchend', handleTouchEnd, { passive: true })
  }
  
  /**
   * 手动解绑事件监听器
   * 用于在 onUnmounted 之外手动控制事件解绑
   */
  const unbindEvents = (): void => {
    if (!elementRef.value) return
    elementRef.value.removeEventListener('touchstart', handleTouchStart)
    elementRef.value.removeEventListener('touchend', handleTouchEnd)
  }
  
  /**
   * 重置状态（用于测试）
   */
  const reset = (): void => {
    isSwiping.value = false
    lastSwipeDirection.value = null
    startX = 0
    startY = 0
    startTime = 0
  }
  
  // 生命周期钩子：自动绑定和解绑事件
  onMounted(() => {
    bindEvents()
  })
  
  onUnmounted(() => {
    unbindEvents()
  })
  
  return {
    /** 绑定手势的目标元素引用 */
    elementRef,
    /** 是否正在滑动 */
    isSwiping,
    /** 最后检测到的滑动方向 */
    lastSwipeDirection,
    /** 手动绑定事件监听器 */
    bindEvents,
    /** 手动解绑事件监听器 */
    unbindEvents,
    /** 重置状态（用于测试） */
    reset,
  }
}
