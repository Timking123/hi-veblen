/**
 * useKeyboardNavigation Composable
 * 
 * 键盘导航 Composable，提供使用键盘快捷键进行页面导航的功能。
 * 
 * 功能：
 * - 数字键导航 (1-9)：按数字键 N 导航到第 N 个路由
 * - 方向键导航：使用方向键在路由之间循环切换
 * - Escape 键返回：按 Escape 键返回上一页
 * - 自动忽略输入框中的按键事件
 * 
 * 验证需求：
 * - 需求 8.4: 支持使用方向键或数字键切换页面
 * - 需求 8.5: 支持使用 Escape 键关闭弹窗或返回上一页
 */

import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter, Router } from 'vue-router'

/**
 * 键盘导航配置接口
 */
export interface KeyboardNavigationConfig {
  /** 可导航的路由路径列表 */
  routes: string[]
  /** 是否启用数字键导航，默认 true */
  enableNumberKeys?: boolean
  /** 是否启用方向键导航，默认 true */
  enableArrowKeys?: boolean
  /** 导航回调函数，在导航发生时调用 */
  onNavigate?: (route: string) => void
}

/**
 * 键盘导航结果接口
 * 用于描述按键处理的结果
 */
export interface KeyNavigationResult {
  /** 是否处理了按键 */
  handled: boolean
  /** 导航到的路由（如果有） */
  navigatedTo?: string
  /** 执行的操作类型 */
  action?: 'number' | 'arrow' | 'escape' | 'none'
}

/**
 * 检查事件目标是否为输入元素
 * 
 * @param target - 事件目标
 * @returns 是否为输入元素
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false
  return target instanceof HTMLInputElement || 
         target instanceof HTMLTextAreaElement ||
         (target instanceof HTMLElement && target.isContentEditable)
}

/**
 * 计算数字键对应的路由索引
 * 
 * @param key - 按下的键
 * @param routesLength - 路由列表长度
 * @returns 路由索引，如果无效则返回 -1
 * 
 * 验证: 需求 8.4 - 数字键导航
 */
export function getNumberKeyIndex(key: string, routesLength: number): number {
  // 只处理 1-9 的数字键
  if (key >= '1' && key <= '9') {
    const index = parseInt(key, 10) - 1
    if (index < routesLength) {
      return index
    }
  }
  return -1
}

/**
 * 计算方向键导航的目标索引
 * 
 * @param key - 按下的键
 * @param currentIndex - 当前路由索引
 * @param routesLength - 路由列表长度
 * @returns 目标路由索引，如果不是方向键则返回 -1
 * 
 * 验证: 需求 8.4 - 方向键导航（循环）
 */
export function getArrowKeyIndex(
  key: string,
  currentIndex: number,
  routesLength: number
): number {
  if (routesLength === 0) return -1
  
  // 如果当前路由不在列表中，从第一个开始
  const safeCurrentIndex = currentIndex < 0 ? 0 : currentIndex
  
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    // 向右/向下：下一个路由（循环）
    return (safeCurrentIndex + 1) % routesLength
  } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
    // 向左/向上：上一个路由（循环）
    return (safeCurrentIndex - 1 + routesLength) % routesLength
  }
  
  return -1
}

/**
 * 检查是否为 Escape 键
 * 
 * @param key - 按下的键
 * @returns 是否为 Escape 键
 * 
 * 验证: 需求 8.5 - Escape 键返回
 */
export function isEscapeKey(key: string): boolean {
  return key === 'Escape'
}

/**
 * 处理键盘事件的纯函数
 * 
 * @param key - 按下的键
 * @param target - 事件目标
 * @param routes - 路由列表
 * @param currentPath - 当前路由路径
 * @param enableNumberKeys - 是否启用数字键
 * @param enableArrowKeys - 是否启用方向键
 * @returns 键盘导航结果
 */
export function processKeyboardEvent(
  key: string,
  target: EventTarget | null,
  routes: string[],
  currentPath: string,
  enableNumberKeys: boolean,
  enableArrowKeys: boolean
): KeyNavigationResult {
  // 忽略输入框中的按键
  if (isInputElement(target)) {
    return { handled: false, action: 'none' }
  }
  
  // 数字键导航 (1-9)
  if (enableNumberKeys) {
    const index = getNumberKeyIndex(key, routes.length)
    if (index >= 0) {
      return {
        handled: true,
        navigatedTo: routes[index],
        action: 'number',
      }
    }
  }
  
  // 方向键导航
  if (enableArrowKeys) {
    const currentIndex = routes.indexOf(currentPath)
    const targetIndex = getArrowKeyIndex(key, currentIndex, routes.length)
    if (targetIndex >= 0) {
      return {
        handled: true,
        navigatedTo: routes[targetIndex],
        action: 'arrow',
      }
    }
  }
  
  // Escape 键返回
  if (isEscapeKey(key)) {
    return {
      handled: true,
      action: 'escape',
    }
  }
  
  return { handled: false, action: 'none' }
}

/**
 * 键盘导航 Composable
 * 
 * @param config - 键盘导航配置
 * @returns 键盘导航相关的响应式状态和方法
 * 
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useKeyboardNavigation } from '@/composables/useKeyboardNavigation'
 * 
 * // 定义可导航的路由
 * const routes = ['/', '/about', '/skills', '/projects', '/contact']
 * 
 * // 启用键盘导航
 * useKeyboardNavigation({
 *   routes,
 *   onNavigate: (route) => {
 *     console.log(`导航到: ${route}`)
 *   },
 * })
 * </script>
 * ```
 * 
 * 验证: 需求 8.4 - 支持使用方向键或数字键切换页面
 * 验证: 需求 8.5 - 支持使用 Escape 键关闭弹窗或返回上一页
 */
export function useKeyboardNavigation(config: KeyboardNavigationConfig) {
  const router = useRouter()
  const { 
    routes, 
    enableNumberKeys = true, 
    enableArrowKeys = true, 
    onNavigate 
  } = config
  
  /** 是否已启用键盘导航 */
  const isEnabled = ref(true)
  
  /** 最后一次导航的路由 */
  const lastNavigatedRoute = ref<string | null>(null)
  
  /**
   * 导航到指定路由
   * 
   * @param route - 目标路由路径
   */
  const navigateTo = (route: string): void => {
    router.push(route)
    lastNavigatedRoute.value = route
    onNavigate?.(route)
  }
  
  /**
   * 处理键盘按下事件
   * 
   * @param e - 键盘事件
   * 
   * 验证: 需求 8.4 - 数字键和方向键导航
   * 验证: 需求 8.5 - Escape 键返回
   */
  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!isEnabled.value) return
    
    const result = processKeyboardEvent(
      e.key,
      e.target,
      routes,
      router.currentRoute.value.path,
      enableNumberKeys,
      enableArrowKeys
    )
    
    if (result.handled) {
      if (result.action === 'escape') {
        // Escape 键：返回上一页
        router.back()
      } else if (result.navigatedTo) {
        // 数字键或方向键：导航到目标路由
        navigateTo(result.navigatedTo)
      }
    }
  }
  
  /**
   * 启用键盘导航
   */
  const enable = (): void => {
    isEnabled.value = true
  }
  
  /**
   * 禁用键盘导航
   */
  const disable = (): void => {
    isEnabled.value = false
  }
  
  /**
   * 手动绑定事件监听器
   */
  const bindEvents = (): void => {
    window.addEventListener('keydown', handleKeyDown)
  }
  
  /**
   * 手动解绑事件监听器
   */
  const unbindEvents = (): void => {
    window.removeEventListener('keydown', handleKeyDown)
  }
  
  // 生命周期钩子：自动绑定和解绑事件
  onMounted(() => {
    bindEvents()
  })
  
  onUnmounted(() => {
    unbindEvents()
  })
  
  return {
    /** 是否已启用键盘导航 */
    isEnabled,
    /** 最后一次导航的路由 */
    lastNavigatedRoute,
    /** 启用键盘导航 */
    enable,
    /** 禁用键盘导航 */
    disable,
    /** 手动绑定事件监听器 */
    bindEvents,
    /** 手动解绑事件监听器 */
    unbindEvents,
  }
}

/**
 * 创建键盘导航处理器（用于测试）
 * 
 * 这是一个不依赖 Vue Router 的纯函数版本，方便进行单元测试和属性测试。
 * 
 * @param config - 键盘导航配置
 * @param mockRouter - 模拟的路由器对象
 * @returns 键盘事件处理函数
 */
export function createKeyboardNavigationHandler(
  config: KeyboardNavigationConfig,
  mockRouter: Pick<Router, 'push' | 'back' | 'currentRoute'>
) {
  const { 
    routes, 
    enableNumberKeys = true, 
    enableArrowKeys = true, 
    onNavigate 
  } = config
  
  return (key: string, target: EventTarget | null = null): KeyNavigationResult => {
    const currentPath = mockRouter.currentRoute.value.path
    
    const result = processKeyboardEvent(
      key,
      target,
      routes,
      currentPath,
      enableNumberKeys,
      enableArrowKeys
    )
    
    if (result.handled) {
      if (result.action === 'escape') {
        mockRouter.back()
      } else if (result.navigatedTo) {
        mockRouter.push(result.navigatedTo)
        onNavigate?.(result.navigatedTo)
      }
    }
    
    return result
  }
}
