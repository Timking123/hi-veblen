/**
 * useGreeting Composable
 * 根据当前时间返回不同的问候语
 * 
 * 时间段划分：
 * - 5:00 - 11:59: 早上好 (morning)
 * - 12:00 - 17:59: 下午好 (afternoon)
 * - 18:00 - 21:59: 晚上好 (evening)
 * - 22:00 - 4:59: 夜深了 (night)
 * 
 * @module useGreeting
 * @see 需求 8.1
 */
import { computed, type ComputedRef } from 'vue'

/**
 * 问候语配置接口
 */
export interface GreetingConfig {
  /** 早上问候语 (5:00 - 11:59) */
  morning: string
  /** 下午问候语 (12:00 - 17:59) */
  afternoon: string
  /** 晚上问候语 (18:00 - 21:59) */
  evening: string
  /** 深夜问候语 (22:00 - 4:59) */
  night: string
}

/**
 * useGreeting 返回值接口
 */
export interface UseGreetingReturn {
  /** 根据当前时间计算的问候语 */
  greeting: ComputedRef<string>
}

/**
 * 默认问候语配置
 */
const DEFAULT_CONFIG: GreetingConfig = {
  morning: '早上好',
  afternoon: '下午好',
  evening: '晚上好',
  night: '夜深了',
}

/**
 * 根据小时数获取对应的问候语
 * 
 * @param hour - 小时数 (0-23)
 * @param config - 问候语配置
 * @returns 对应时间段的问候语
 */
export function getGreetingByHour(hour: number, config: GreetingConfig): string {
  // 确保小时数在有效范围内
  const normalizedHour = ((hour % 24) + 24) % 24
  
  if (normalizedHour >= 5 && normalizedHour < 12) {
    return config.morning
  } else if (normalizedHour >= 12 && normalizedHour < 18) {
    return config.afternoon
  } else if (normalizedHour >= 18 && normalizedHour < 22) {
    return config.evening
  } else {
    return config.night
  }
}

/**
 * 问候语 Composable
 * 
 * 根据当前时间自动返回合适的问候语。
 * 支持自定义问候语配置。
 * 
 * @param config - 可选的自定义问候语配置
 * @returns 包含响应式问候语的对象
 * 
 * @example
 * ```typescript
 * // 使用默认配置
 * const { greeting } = useGreeting()
 * console.log(greeting.value) // "早上好" / "下午好" / "晚上好" / "夜深了"
 * 
 * // 使用自定义配置
 * const { greeting } = useGreeting({
 *   morning: 'Good morning',
 *   afternoon: 'Good afternoon',
 *   evening: 'Good evening',
 *   night: 'Good night',
 * })
 * ```
 */
export function useGreeting(config?: Partial<GreetingConfig>): UseGreetingReturn {
  // 合并默认配置和用户配置
  const mergedConfig: GreetingConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  }
  
  // 计算当前时间对应的问候语
  const greeting = computed(() => {
    const hour = new Date().getHours()
    return getGreetingByHour(hour, mergedConfig)
  })
  
  return { greeting }
}

export default useGreeting
