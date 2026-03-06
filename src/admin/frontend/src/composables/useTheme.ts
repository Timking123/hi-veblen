/**
 * useTheme Composable
 * 
 * 管理系统主题管理 Composable，提供三种主题模式的切换和持久化功能。
 * 
 * 功能：
 * - 支持三种主题模式：深色（dark）、浅色（light）、跟随系统（system）
 * - 主题循环切换：dark → light → system → dark
 * - localStorage 持久化存储用户偏好
 * - 监听系统主题变化并自动切换
 * - 应用平滑的过渡动画（300ms）
 */

import { ref, computed } from 'vue'

/**
 * 主题模式类型
 */
export type ThemeMode = 'dark' | 'light' | 'system'

/**
 * 有效的主题模式列表
 */
const VALID_MODES: ThemeMode[] = ['dark', 'light', 'system']

/**
 * localStorage 存储键名
 */
const STORAGE_KEY = 'admin-theme-preference'

/**
 * 主题过渡动画持续时间（毫秒）
 */
const TRANSITION_DURATION = 300

// 模块级别的状态（单例模式）
const mode = ref<ThemeMode>('light')
const systemPrefersDark = ref(false)
let isInitialized = false
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null

/**
 * 主题管理 Composable
 */
export function useTheme() {
  /**
   * 解析后的实际主题
   */
  const resolvedTheme = computed<'dark' | 'light'>(() => {
    if (mode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return mode.value
  })

  /**
   * 设置主题模式
   */
  const setTheme = (newMode: ThemeMode): void => {
    if (!VALID_MODES.includes(newMode)) {
      console.warn(`[useTheme] 无效的主题模式: ${newMode}，使用默认值 'light'`)
      newMode = 'light'
    }
    
    mode.value = newMode
    
    try {
      localStorage.setItem(STORAGE_KEY, newMode)
    } catch (error) {
      console.warn('[useTheme] localStorage 不可用，主题偏好不会被持久化')
    }
    
    applyTheme()
  }

  /**
   * 循环切换主题模式
   * 切换顺序：light → dark → system → light
   */
  const cycleTheme = (): void => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const currentIndex = order.indexOf(mode.value)
    const nextIndex = (currentIndex + 1) % order.length
    setTheme(order[nextIndex])
  }

  /**
   * 应用主题到 DOM
   */
  const applyTheme = (): void => {
    if (typeof document === 'undefined') {
      return
    }
    
    const theme = resolvedTheme.value
    
    // 设置 data-theme 属性
    document.documentElement.setAttribute('data-theme', theme)
    
    // 添加过渡动画类
    document.documentElement.classList.add('theme-transition')
    
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, TRANSITION_DURATION)
  }

  /**
   * 初始化主题系统
   */
  const initTheme = (): void => {
    if (isInitialized) {
      return
    }
    
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }
    
    // 从 localStorage 读取保存的主题偏好
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      if (saved && VALID_MODES.includes(saved)) {
        mode.value = saved
      }
    } catch (error) {
      console.warn('[useTheme] localStorage 不可用，使用默认主题')
    }
    
    // 检测系统主题偏好
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mediaQuery.matches
    
    // 监听系统主题变化
    mediaQueryListener = (e: MediaQueryListEvent) => {
      systemPrefersDark.value = e.matches
      if (mode.value === 'system') {
        applyTheme()
      }
    }
    
    mediaQuery.addEventListener('change', mediaQueryListener)
    
    // 应用初始主题
    applyTheme()
    
    isInitialized = true
  }

  /**
   * 清理主题系统
   */
  const cleanup = (): void => {
    if (typeof window !== 'undefined' && mediaQueryListener) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.removeEventListener('change', mediaQueryListener)
      mediaQueryListener = null
    }
    isInitialized = false
  }

  return {
    mode,
    systemPrefersDark,
    resolvedTheme,
    setTheme,
    cycleTheme,
    initTheme,
    cleanup,
  }
}

export { VALID_MODES, STORAGE_KEY, TRANSITION_DURATION }
