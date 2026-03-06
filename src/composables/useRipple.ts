/**
 * useRipple Composable
 * 
 * 涟漪效果 Composable，为按钮等交互元素提供点击涟漪动画效果。
 * 
 * 功能：
 * - 从点击位置向外扩散涟漪动画
 * - 涟漪大小自动计算，确保覆盖整个元素
 * - 600ms 后自动清除涟漪实例
 * - 支持多个涟漪同时存在
 * 
 * 验证需求：
 * - 需求 2.1: 用户点击按钮时从点击位置向外扩散涟漪动画
 * - 需求 2.2: 涟漪效果在 600ms 内完成动画并自动清除
 */

import { ref } from 'vue'

/**
 * 涟漪动画持续时间（毫秒）
 */
export const RIPPLE_DURATION = 600

/**
 * 涟漪实例接口
 * 描述单个涟漪效果的位置和大小信息
 */
export interface RippleInstance {
  /** 涟漪的唯一标识符 */
  id: number
  /** 涟漪的 X 坐标（相对于容器左上角） */
  x: number
  /** 涟漪的 Y 坐标（相对于容器左上角） */
  y: number
  /** 涟漪的直径大小 */
  size: number
}

/**
 * 计算涟漪效果的位置和大小
 * 
 * @param event - 鼠标点击事件
 * @returns 涟漪的位置（x, y）和大小（size），如果无法计算则返回 null
 * 
 * 计算逻辑：
 * 1. 获取目标元素的边界矩形
 * 2. 涟漪大小 = max(元素宽度, 元素高度) * 2，确保涟漪能覆盖整个元素
 * 3. 涟漪位置以点击位置为中心，需要减去涟漪半径
 * 
 * 验证: 需求 2.1 - 从点击位置向外扩散
 */
export function calculateRipplePosition(
  event: MouseEvent
): { x: number; y: number; size: number } | null {
  const target = event.currentTarget as HTMLElement | null
  
  if (!target) {
    return null
  }
  
  const rect = target.getBoundingClientRect()
  
  // 涟漪大小为元素最大边长的 2 倍，确保能完全覆盖元素
  const size = Math.max(rect.width, rect.height) * 2
  
  // 计算涟漪位置（以点击位置为中心）
  // x = 点击位置相对于元素左边的距离 - 涟漪半径
  // y = 点击位置相对于元素顶部的距离 - 涟漪半径
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2
  
  return { x, y, size }
}

/**
 * 涟漪效果 Composable
 * 
 * @returns 涟漪管理相关的响应式状态和方法
 * 
 * @example
 * ```vue
 * <template>
 *   <button class="ripple-button" @click="createRipple">
 *     点击我
 *     <span
 *       v-for="ripple in ripples"
 *       :key="ripple.id"
 *       class="ripple"
 *       :style="{
 *         left: `${ripple.x}px`,
 *         top: `${ripple.y}px`,
 *         width: `${ripple.size}px`,
 *         height: `${ripple.size}px`,
 *       }"
 *     />
 *   </button>
 * </template>
 * 
 * <script setup lang="ts">
 * import { useRipple } from '@/composables/useRipple'
 * 
 * const { ripples, createRipple } = useRipple()
 * </script>
 * ```
 */
export function useRipple() {
  /** 当前活跃的涟漪实例列表 */
  const ripples = ref<RippleInstance[]>([])
  
  /** 涟漪 ID 计数器，用于生成唯一标识符 */
  let rippleId = 0

  /**
   * 创建涟漪效果
   * 
   * @param event - 鼠标点击事件
   * 
   * 功能：
   * 1. 计算涟漪的位置和大小
   * 2. 创建涟漪实例并添加到列表
   * 3. 600ms 后自动移除涟漪实例
   * 
   * 验证: 需求 2.1 - 从点击位置向外扩散涟漪动画
   * 验证: 需求 2.2 - 600ms 内完成动画并自动清除
   */
  const createRipple = (event: MouseEvent): void => {
    const position = calculateRipplePosition(event)
    
    if (!position) {
      return
    }
    
    const { x, y, size } = position
    
    // 创建涟漪实例
    const ripple: RippleInstance = {
      id: rippleId++,
      x,
      y,
      size,
    }
    
    // 添加到涟漪列表
    ripples.value.push(ripple)
    
    // 600ms 后自动清除涟漪
    // 验证: 需求 2.2 - 涟漪效果在 600ms 内完成动画并自动清除
    setTimeout(() => {
      ripples.value = ripples.value.filter(r => r.id !== ripple.id)
    }, RIPPLE_DURATION)
  }

  /**
   * 清除所有涟漪效果
   * 用于组件卸载或需要立即清除所有涟漪的场景
   */
  const clearRipples = (): void => {
    ripples.value = []
  }

  /**
   * 重置涟漪系统（用于测试）
   * 清除所有涟漪并重置 ID 计数器
   */
  const reset = (): void => {
    ripples.value = []
    rippleId = 0
  }

  return {
    /** 当前活跃的涟漪实例列表 */
    ripples,
    /** 创建涟漪效果 */
    createRipple,
    /** 清除所有涟漪效果 */
    clearRipples,
    /** 重置涟漪系统（用于测试） */
    reset,
  }
}
