/**
 * useTheme Composable
 * 
 * 主题管理 Composable，提供三种主题模式的切换和持久化功能。
 * 
 * 功能：
 * - 支持三种主题模式：深色（dark）、浅色（light）、跟随系统（system）
 * - 主题循环切换：dark → light → system → dark
 * - localStorage 持久化存储用户偏好
 * - 监听系统主题变化并自动切换
 * - 应用平滑的过渡动画（300ms）
 * 
 * 验证需求：
 * - 需求 1.1: 提供三种主题模式
 * - 需求 1.2: 循环切换主题
 * - 需求 1.4: 持久化存储到 localStorage
 * - 需求 1.5: 页面加载时读取并应用主题
 * - 需求 1.6: 跟随系统模式监听系统主题变化
 */

import { ref, computed } from 'vue'

/**
 * 主题模式类型
 * - 'dark': 深色主题
 * - 'light': 浅色主题
 * - 'system': 跟随系统主题
 */
export type ThemeMode = 'dark' | 'light' | 'system'

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  /** 当前主题模式 */
  mode: ThemeMode
  /** 解析后的实际主题（dark 或 light） */
  resolvedTheme: 'dark' | 'light'
}

/**
 * 有效的主题模式列表
 */
const VALID_MODES: ThemeMode[] = ['dark', 'light', 'system']

/**
 * localStorage 存储键名
 */
const STORAGE_KEY = 'theme-preference'

/**
 * 主题过渡动画持续时间（毫秒）
 */
const TRANSITION_DURATION = 300

// 模块级别的状态（单例模式）
const mode = ref<ThemeMode>('system')
const systemPrefersDark = ref(true)
let isInitialized = false
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null

/**
 * 主题管理 Composable
 * 
 * @returns 主题管理相关的响应式状态和方法
 * 
 * @example
 * ```typescript
 * import { useTheme } from '@/composables/useTheme'
 * 
 * const { mode, resolvedTheme, setTheme, cycleTheme, initTheme } = useTheme()
 * 
 * // 初始化主题（在 App.vue 的 onMounted 中调用）
 * initTheme()
 * 
 * // 设置特定主题
 * setTheme('dark')
 * 
 * // 循环切换主题
 * cycleTheme()
 * ```
 */
export function useTheme() {
  /**
   * 解析后的实际主题
   * 当模式为 'system' 时，根据系统偏好返回 'dark' 或 'light'
   * 
   * 验证: 需求 1.6 - 跟随系统模式
   */
  const resolvedTheme = computed<'dark' | 'light'>(() => {
    if (mode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return mode.value
  })

  /**
   * 设置主题模式
   * 
   * @param newMode - 新的主题模式
   * 
   * 验证: 需求 1.4 - 持久化存储到 localStorage
   */
  const setTheme = (newMode: ThemeMode): void => {
    // 验证主题模式是否有效
    if (!VALID_MODES.includes(newMode)) {
      console.warn(`[useTheme] 无效的主题模式: ${newMode}，使用默认值 'system'`)
      newMode = 'system'
    }
    
    mode.value = newMode
    
    // 持久化存储到 localStorage
    try {
      localStorage.setItem(STORAGE_KEY, newMode)
    } catch (error) {
      // localStorage 不可用时静默失败
      console.warn('[useTheme] localStorage 不可用，主题偏好不会被持久化')
    }
    
    applyTheme()
  }

  /**
   * 循环切换主题模式
   * 切换顺序：dark → light → system → dark
   * 
   * 验证: 需求 1.2 - 循环切换主题
   */
  const cycleTheme = (): void => {
    const currentIndex = VALID_MODES.indexOf(mode.value)
    const nextIndex = (currentIndex + 1) % VALID_MODES.length
    setTheme(VALID_MODES[nextIndex])
  }

  /**
   * 应用主题到 DOM
   * 设置 data-theme 属性并添加过渡动画类
   * 
   * 验证: 需求 1.2 - 立即更新 HTML 根元素的 data-theme 属性
   * 验证: 需求 1.3 - 应用对应主题的 CSS 变量
   */
  const applyTheme = (): void => {
    // 检查是否在浏览器环境
    if (typeof document === 'undefined') {
      return
    }
    
    const theme = resolvedTheme.value
    const root = document.documentElement
    
    // 关键修复：确保设置 data-theme 属性到 HTML 根元素
    root.setAttribute('data-theme', theme)
    
    // 添加过渡动画类
    root.classList.add('theme-transition')
    
    // 过渡动画结束后移除类
    setTimeout(() => {
      root.classList.remove('theme-transition')
    }, TRANSITION_DURATION)
  }

  /**
   * 初始化主题系统
   * - 从 localStorage 读取保存的主题偏好
   * - 监听系统主题变化
   * - 应用初始主题
   * 
   * 验证: 需求 1.5 - 页面加载时读取并应用主题
   * 验证: 需求 1.6 - 监听系统主题变化
   */
  const initTheme = (): void => {
    // 防止重复初始化
    if (isInitialized) {
      return
    }
    
    // 检查是否在浏览器环境
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
      // localStorage 不可用时使用默认值
      console.warn('[useTheme] localStorage 不可用，使用默认主题')
    }
    
    // 检测系统主题偏好
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mediaQuery.matches
    
    // 监听系统主题变化
    mediaQueryListener = (e: MediaQueryListEvent) => {
      systemPrefersDark.value = e.matches
      // 只有在 'system' 模式下才需要重新应用主题
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
   * 清理主题系统（用于测试）
   * 移除事件监听器并重置状态
   */
  const cleanup = (): void => {
    if (typeof window !== 'undefined' && mediaQueryListener) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.removeEventListener('change', mediaQueryListener)
      mediaQueryListener = null
    }
    isInitialized = false
  }

  /**
   * 重置主题系统状态（用于测试）
   */
  const reset = (): void => {
    cleanup()
    mode.value = 'system'
    systemPrefersDark.value = true
  }

  return {
    /** 当前主题模式 */
    mode,
    /** 系统是否偏好深色主题 */
    systemPrefersDark,
    /** 解析后的实际主题 */
    resolvedTheme,
    /** 设置主题模式 */
    setTheme,
    /** 循环切换主题 */
    cycleTheme,
    /** 初始化主题系统 */
    initTheme,
    /** 清理主题系统（用于测试） */
    cleanup,
    /** 重置主题系统状态（用于测试） */
    reset,
  }
}

/**
 * 导出常量供测试使用
 */
export { VALID_MODES, STORAGE_KEY, TRANSITION_DURATION }
