/**
 * useTheme Composable 单元测试
 * 
 * 测试主题管理功能的核心逻辑：
 * - 三种主题模式（dark/light/system）
 * - 主题循环切换
 * - localStorage 持久化
 * - 系统主题监听
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTheme, STORAGE_KEY, VALID_MODES } from '../useTheme'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

// Mock matchMedia
const createMatchMediaMock = (matches: boolean) => {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  return {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_event: string, listener: (e: MediaQueryListEvent) => void) => {
      listeners.push(listener)
    }),
    removeEventListener: vi.fn((_event: string, listener: (e: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }),
    dispatchEvent: vi.fn(),
    // 用于测试的辅助方法
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach(listener => {
        listener({ matches: newMatches } as MediaQueryListEvent)
      })
    },
    _listeners: listeners,
  }
}

describe('useTheme', () => {
  let matchMediaMock: ReturnType<typeof createMatchMediaMock>

  beforeEach(() => {
    // 重置 localStorage mock
    localStorageMock.clear()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    // 重置 matchMedia mock
    matchMediaMock = createMatchMediaMock(true)
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue(matchMediaMock),
      writable: true,
    })

    // 重置 document.documentElement
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('theme-transition')

    // 重置 useTheme 状态
    const { reset } = useTheme()
    reset()
  })

  afterEach(() => {
    vi.clearAllMocks()
    const { cleanup } = useTheme()
    cleanup()
  })

  describe('初始状态', () => {
    it('默认主题模式应为 system', () => {
      const { mode } = useTheme()
      expect(mode.value).toBe('system')
    })

    it('应提供三种有效的主题模式', () => {
      expect(VALID_MODES).toEqual(['dark', 'light', 'system'])
    })
  })

  describe('setTheme', () => {
    it('应正确设置主题模式为 dark', () => {
      const { mode, setTheme, initTheme } = useTheme()
      initTheme()
      
      setTheme('dark')
      
      expect(mode.value).toBe('dark')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'dark')
    })

    it('应正确设置主题模式为 light', () => {
      const { mode, setTheme, initTheme } = useTheme()
      initTheme()
      
      setTheme('light')
      
      expect(mode.value).toBe('light')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'light')
    })

    it('应正确设置主题模式为 system', () => {
      const { mode, setTheme, initTheme } = useTheme()
      initTheme()
      
      setTheme('system')
      
      expect(mode.value).toBe('system')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'system')
    })

    it('应在 DOM 上设置 data-theme 属性', () => {
      const { setTheme, initTheme } = useTheme()
      initTheme()
      
      setTheme('light')
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('无效的主题模式应回退到 system', () => {
      const { mode, setTheme, initTheme } = useTheme()
      initTheme()
      
      // @ts-expect-error 测试无效输入
      setTheme('invalid')
      
      expect(mode.value).toBe('system')
    })
  })

  describe('cycleTheme', () => {
    it('应从 dark 切换到 light', () => {
      const { mode, setTheme, cycleTheme, initTheme } = useTheme()
      initTheme()
      setTheme('dark')
      
      cycleTheme()
      
      expect(mode.value).toBe('light')
    })

    it('应从 light 切换到 system', () => {
      const { mode, setTheme, cycleTheme, initTheme } = useTheme()
      initTheme()
      setTheme('light')
      
      cycleTheme()
      
      expect(mode.value).toBe('system')
    })

    it('应从 system 切换到 dark', () => {
      const { mode, setTheme, cycleTheme, initTheme } = useTheme()
      initTheme()
      setTheme('system')
      
      cycleTheme()
      
      expect(mode.value).toBe('dark')
    })

    it('应完成完整的循环切换', () => {
      const { mode, setTheme, cycleTheme, initTheme } = useTheme()
      initTheme()
      setTheme('dark')
      
      // dark → light
      cycleTheme()
      expect(mode.value).toBe('light')
      
      // light → system
      cycleTheme()
      expect(mode.value).toBe('system')
      
      // system → dark
      cycleTheme()
      expect(mode.value).toBe('dark')
    })
  })

  describe('resolvedTheme', () => {
    it('当模式为 dark 时应返回 dark', () => {
      const { resolvedTheme, setTheme, initTheme } = useTheme()
      initTheme()
      
      setTheme('dark')
      
      expect(resolvedTheme.value).toBe('dark')
    })

    it('当模式为 light 时应返回 light', () => {
      const { resolvedTheme, setTheme, initTheme } = useTheme()
      initTheme()
      
      setTheme('light')
      
      expect(resolvedTheme.value).toBe('light')
    })

    it('当模式为 system 且系统偏好深色时应返回 dark', () => {
      matchMediaMock = createMatchMediaMock(true)
      window.matchMedia = vi.fn().mockReturnValue(matchMediaMock)
      
      const { reset, resolvedTheme, setTheme, initTheme } = useTheme()
      reset()
      initTheme()
      setTheme('system')
      
      expect(resolvedTheme.value).toBe('dark')
    })

    it('当模式为 system 且系统偏好浅色时应返回 light', () => {
      matchMediaMock = createMatchMediaMock(false)
      window.matchMedia = vi.fn().mockReturnValue(matchMediaMock)
      
      const { reset, resolvedTheme, setTheme, initTheme } = useTheme()
      reset()
      initTheme()
      setTheme('system')
      
      expect(resolvedTheme.value).toBe('light')
    })
  })

  describe('initTheme', () => {
    it('应从 localStorage 读取保存的主题', () => {
      localStorageMock.getItem.mockReturnValue('light')
      
      const { reset, mode, initTheme } = useTheme()
      reset()
      initTheme()
      
      expect(mode.value).toBe('light')
    })

    it('当 localStorage 中没有保存的主题时应使用默认值', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const { reset, mode, initTheme } = useTheme()
      reset()
      initTheme()
      
      expect(mode.value).toBe('system')
    })

    it('当 localStorage 中保存的值无效时应使用默认值', () => {
      localStorageMock.getItem.mockReturnValue('invalid')
      
      const { reset, mode, initTheme } = useTheme()
      reset()
      initTheme()
      
      expect(mode.value).toBe('system')
    })

    it('应检测系统主题偏好', () => {
      matchMediaMock = createMatchMediaMock(false)
      window.matchMedia = vi.fn().mockReturnValue(matchMediaMock)
      
      const { reset, systemPrefersDark, initTheme } = useTheme()
      reset()
      initTheme()
      
      expect(systemPrefersDark.value).toBe(false)
    })

    it('应添加系统主题变化监听器', () => {
      const { reset, initTheme } = useTheme()
      reset()
      initTheme()
      
      expect(matchMediaMock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('不应重复初始化', () => {
      const { initTheme } = useTheme()
      
      initTheme()
      initTheme()
      
      // addEventListener 应该只被调用一次
      expect(matchMediaMock.addEventListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('系统主题变化监听', () => {
    it('当系统主题变化时应更新 systemPrefersDark', () => {
      const { reset, systemPrefersDark, initTheme } = useTheme()
      reset()
      initTheme()
      
      // 模拟系统主题变化
      matchMediaMock._triggerChange(false)
      
      expect(systemPrefersDark.value).toBe(false)
    })

    it('当模式为 system 且系统主题变化时应重新应用主题', () => {
      const { reset, setTheme, initTheme } = useTheme()
      reset()
      initTheme()
      setTheme('system')
      
      // 模拟系统主题变化到浅色
      matchMediaMock._triggerChange(false)
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('当模式不为 system 时系统主题变化不应影响当前主题', () => {
      const { reset, setTheme, initTheme } = useTheme()
      reset()
      initTheme()
      setTheme('dark')
      
      // 模拟系统主题变化
      matchMediaMock._triggerChange(false)
      
      // 主题应保持为 dark
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })

  describe('过渡动画', () => {
    it('应在主题切换时添加 theme-transition 类', () => {
      const { setTheme, initTheme } = useTheme()
      initTheme()
      
      setTheme('light')
      
      expect(document.documentElement.classList.contains('theme-transition')).toBe(true)
    })

    it('应在 300ms 后移除 theme-transition 类', async () => {
      vi.useFakeTimers()
      
      const { setTheme, initTheme } = useTheme()
      initTheme()
      
      setTheme('light')
      
      expect(document.documentElement.classList.contains('theme-transition')).toBe(true)
      
      vi.advanceTimersByTime(300)
      
      expect(document.documentElement.classList.contains('theme-transition')).toBe(false)
      
      vi.useRealTimers()
    })
  })

  describe('localStorage 错误处理', () => {
    it('当 localStorage 抛出异常时应静默失败', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      const { setTheme, initTheme } = useTheme()
      initTheme()
      
      // 不应抛出异常
      expect(() => setTheme('dark')).not.toThrow()
    })

    it('当 localStorage.getItem 抛出异常时应使用默认值', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('SecurityError')
      })
      
      const { reset, mode, initTheme } = useTheme()
      reset()
      
      // 不应抛出异常
      expect(() => initTheme()).not.toThrow()
      expect(mode.value).toBe('system')
    })
  })

  describe('cleanup', () => {
    it('应移除事件监听器', () => {
      const { initTheme, cleanup } = useTheme()
      initTheme()
      
      cleanup()
      
      expect(matchMediaMock.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })
  })
})
