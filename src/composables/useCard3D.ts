/**
 * useCard3D Composable
 * 
 * 卡片 3D 效果 Composable，为卡片元素提供鼠标悬停时的三维透视变换效果。
 * 
 * 功能：
 * - 追踪鼠标在卡片上的位置
 * - 根据鼠标位置计算 3D 旋转角度
 * - 旋转角度限制在 ±maxRotation 度范围内
 * - 悬停时应用轻微缩放效果
 * - 提供 CSS transform 样式字符串
 * 
 * 验证需求：
 * - 需求 2.3: 用户将鼠标悬停在卡片上时应用透视变换效果
 * - 需求 2.4: 根据鼠标位置动态调整旋转角度（最大 ±10 度）
 */

import { ref, computed } from 'vue'

/**
 * 默认最大旋转角度（度）
 */
export const DEFAULT_MAX_ROTATION = 10

/**
 * 默认悬停缩放比例
 */
export const DEFAULT_HOVER_SCALE = 1.02

/**
 * 默认透视距离（像素）
 */
export const DEFAULT_PERSPECTIVE = 1000

/**
 * 卡片 3D 变换接口
 * 描述卡片的旋转和缩放状态
 */
export interface Card3DTransform {
  /** X 轴旋转角度（度），正值向上倾斜 */
  rotateX: number
  /** Y 轴旋转角度（度），正值向右倾斜 */
  rotateY: number
  /** 缩放比例 */
  scale: number
}

/**
 * 计算 3D 变换值
 * 
 * @param mouseX - 鼠标 X 位置（0-1 归一化坐标，0 为左边，1 为右边）
 * @param mouseY - 鼠标 Y 位置（0-1 归一化坐标，0 为顶部，1 为底部）
 * @param maxRotation - 最大旋转角度（度）
 * @param isHovering - 是否处于悬停状态
 * @returns 3D 变换值对象
 * 
 * 计算逻辑：
 * 1. 如果不在悬停状态，返回默认值（无旋转，无缩放）
 * 2. 将鼠标位置从 [0, 1] 映射到 [-0.5, 0.5]
 * 3. 乘以 maxRotation 得到旋转角度
 * 4. rotateX 取反是因为鼠标在上方时卡片应该向上倾斜
 * 
 * 验证: 需求 2.3, 2.4 - 根据鼠标位置动态调整旋转角度
 */
export function calculateCard3DTransform(
  mouseX: number,
  mouseY: number,
  maxRotation: number,
  isHovering: boolean
): Card3DTransform {
  // 非悬停状态返回默认值
  if (!isHovering) {
    return { rotateX: 0, rotateY: 0, scale: 1 }
  }
  
  // 计算旋转角度
  // mouseX/mouseY 范围是 [0, 1]，减去 0.5 后范围变为 [-0.5, 0.5]
  // 乘以 maxRotation 后范围变为 [-maxRotation/2, maxRotation/2]
  // 再乘以 2（通过 maxRotation 参数）得到 [-maxRotation, maxRotation]
  const rotateY = (mouseX - 0.5) * maxRotation
  
  // rotateX 取反：鼠标在卡片上方（mouseY < 0.5）时，卡片应该向上倾斜（rotateX > 0）
  const rotateX = (mouseY - 0.5) * maxRotation * -1
  
  return {
    rotateX,
    rotateY,
    scale: DEFAULT_HOVER_SCALE,
  }
}

/**
 * 生成 CSS transform 样式字符串
 * 
 * @param transform - 3D 变换值对象
 * @param perspective - 透视距离（像素）
 * @returns CSS transform 样式对象
 * 
 * 验证: 需求 2.3 - 应用透视变换效果
 */
export function generateTransformStyle(
  transform: Card3DTransform,
  perspective: number = DEFAULT_PERSPECTIVE
): { transform: string } {
  const { rotateX, rotateY, scale } = transform
  return {
    transform: `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
  }
}

/**
 * 计算归一化的鼠标位置
 * 
 * @param event - 鼠标事件
 * @returns 归一化的鼠标位置 { x, y }，范围 [0, 1]，如果无法计算则返回 null
 * 
 * 计算逻辑：
 * 1. 获取目标元素的边界矩形
 * 2. 计算鼠标相对于元素的位置
 * 3. 除以元素尺寸得到归一化坐标
 */
export function calculateNormalizedMousePosition(
  event: MouseEvent
): { x: number; y: number } | null {
  const target = event.currentTarget as HTMLElement | null
  
  if (!target) {
    return null
  }
  
  const rect = target.getBoundingClientRect()
  
  // 防止除以零
  if (rect.width === 0 || rect.height === 0) {
    return null
  }
  
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  
  return { x, y }
}

/**
 * 卡片 3D 效果 Composable
 * 
 * @param maxRotation - 最大旋转角度（度），默认为 10
 * @returns 卡片 3D 效果相关的响应式状态和方法
 * 
 * @example
 * ```vue
 * <template>
 *   <div
 *     class="card"
 *     :style="transformStyle"
 *     @mousemove="handleMouseMove"
 *     @mouseenter="handleMouseEnter"
 *     @mouseleave="handleMouseLeave"
 *   >
 *     卡片内容
 *   </div>
 * </template>
 * 
 * <script setup lang="ts">
 * import { useCard3D } from '@/composables/useCard3D'
 * 
 * const {
 *   transformStyle,
 *   handleMouseMove,
 *   handleMouseEnter,
 *   handleMouseLeave,
 * } = useCard3D(10)
 * </script>
 * 
 * <style scoped>
 * .card {
 *   transition: transform 0.1s ease-out;
 *   transform-style: preserve-3d;
 * }
 * </style>
 * ```
 * 
 * 验证: 需求 2.3 - 用户将鼠标悬停在卡片上时应用透视变换效果
 * 验证: 需求 2.4 - 根据鼠标位置动态调整旋转角度（最大 ±10 度）
 */
export function useCard3D(maxRotation: number = DEFAULT_MAX_ROTATION) {
  /** 是否处于悬停状态 */
  const isHovering = ref(false)
  
  /** 鼠标 X 位置（归一化坐标，0-1） */
  const mouseX = ref(0)
  
  /** 鼠标 Y 位置（归一化坐标，0-1） */
  const mouseY = ref(0)
  
  /**
   * 计算后的 3D 变换值
   * 
   * 验证: 需求 2.4 - 根据鼠标位置动态调整旋转角度
   */
  const transform = computed<Card3DTransform>(() => {
    return calculateCard3DTransform(
      mouseX.value,
      mouseY.value,
      maxRotation,
      isHovering.value
    )
  })
  
  /**
   * CSS transform 样式对象
   * 
   * 验证: 需求 2.3 - 应用透视变换效果
   */
  const transformStyle = computed(() => {
    return generateTransformStyle(transform.value)
  })
  
  /**
   * 处理鼠标移动事件
   * 更新鼠标位置的归一化坐标
   * 
   * @param event - 鼠标移动事件
   */
  const handleMouseMove = (event: MouseEvent): void => {
    const position = calculateNormalizedMousePosition(event)
    
    if (position) {
      mouseX.value = position.x
      mouseY.value = position.y
    }
  }
  
  /**
   * 处理鼠标进入事件
   * 设置悬停状态为 true
   */
  const handleMouseEnter = (): void => {
    isHovering.value = true
  }
  
  /**
   * 处理鼠标离开事件
   * 设置悬停状态为 false，重置鼠标位置
   */
  const handleMouseLeave = (): void => {
    isHovering.value = false
    // 重置鼠标位置到中心
    mouseX.value = 0.5
    mouseY.value = 0.5
  }
  
  /**
   * 重置状态（用于测试）
   */
  const reset = (): void => {
    isHovering.value = false
    mouseX.value = 0
    mouseY.value = 0
  }

  return {
    /** 是否处于悬停状态 */
    isHovering,
    /** 鼠标 X 位置（归一化坐标） */
    mouseX,
    /** 鼠标 Y 位置（归一化坐标） */
    mouseY,
    /** 计算后的 3D 变换值 */
    transform,
    /** CSS transform 样式对象 */
    transformStyle,
    /** 处理鼠标移动事件 */
    handleMouseMove,
    /** 处理鼠标进入事件 */
    handleMouseEnter,
    /** 处理鼠标离开事件 */
    handleMouseLeave,
    /** 重置状态（用于测试） */
    reset,
  }
}
