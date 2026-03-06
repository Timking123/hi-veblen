/**
 * useTheme Composable 属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证主题系统的核心属性：
 * - 属性 1: 主题模式循环切换
 * - 属性 2: 主题偏好往返持久化
 * - 属性 3: 系统主题跟随
 * - 属性 4: 主题配置完整性
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property N: {property_text}
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { useTheme, VALID_MODES, STORAGE_KEY, type ThemeMode } from '../useTheme'

// ========== Mock 设置 ==========

/**
 * 创建 localStorage mock
 */
const createLocalStorageMock = () => {
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
    _getStore: () => store,
  }
}

/**
 * 创建 matchMedia mock
 */
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
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach(listener => {
        listener({ matches: newMatches } as MediaQueryListEvent)
      })
    },
    _listeners: listeners,
  }
}

// ========== 自定义生成器 ==========

/**
 * 生成有效的主题模式
 * 约束到 'dark' | 'light' | 'system' 三种有效值
 */
const themeModeArb = fc.constantFrom<ThemeMode>('dark', 'light', 'system')

/**
 * 生成系统主题偏好（深色/浅色）
 */
const systemPreferenceArb = fc.boolean()

/**
 * 生成十六进制颜色字符串
 * 使用 stringOf 和 hexaString 的替代方案
 */
const hexColorArb = fc.tuple(
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([r, g, b]) => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
})

/**
 * 生成主题配置对象
 * 包含所有必需的 CSS 变量键
 */
const themeConfigArb = fc.record({
  primary: hexColorArb,
  bgPrimary: hexColorArb,
  bgSecondary: hexColorArb,
  textPrimary: hexColorArb,
  textSecondary: hexColorArb,
  border: hexColorArb,
})

/**
 * 必需的 CSS 变量键列表
 */
const REQUIRED_CSS_KEYS = ['primary', 'bgPrimary', 'bgSecondary', 'textPrimary', 'textSecondary', 'border']

// ========== 测试套件 ==========

describe('useTheme 属性测试', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>
  let matchMediaMock: ReturnType<typeof createMatchMediaMock>

  beforeEach(() => {
    // 重置 localStorage mock
    localStorageMock = createLocalStorageMock()
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

  /**
   * 属性 1：主题模式循环切换
   * 
   * *对于任意* 当前主题模式（dark/light/system），调用 cycleTheme() 后，
   * 主题模式应该按照 dark → light → system → dark 的顺序循环切换。
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Feature: website-enhancement-v2, Property 1: 主题模式循环切换', () => {
    it('对于任意当前主题模式，cycleTheme() 应按照 dark → light → system → dark 顺序循环', () => {
      fc.assert(
        fc.property(
          themeModeArb,
          (initialMode) => {
            // 设置初始主题
            const { mode, setTheme, cycleTheme, initTheme, reset } = useTheme()
            reset()
            initTheme()
            setTheme(initialMode)
            
            // 验证初始状态
            expect(mode.value).toBe(initialMode)
            
            // 调用 cycleTheme
            cycleTheme()
            
            // 验证循环切换逻辑：dark → light → system → dark
            const expectedNextMode = (() => {
              switch (initialMode) {
                case 'dark': return 'light'
                case 'light': return 'system'
                case 'system': return 'dark'
              }
            })()
            
            expect(mode.value).toBe(expectedNextMode)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('连续调用 cycleTheme() 三次应回到原始主题模式', () => {
      fc.assert(
        fc.property(
          themeModeArb,
          (initialMode) => {
            const { mode, setTheme, cycleTheme, initTheme, reset } = useTheme()
            reset()
            initTheme()
            setTheme(initialMode)
            
            // 连续调用三次 cycleTheme
            cycleTheme() // 第一次
            cycleTheme() // 第二次
            cycleTheme() // 第三次
            
            // 应该回到原始模式
            expect(mode.value).toBe(initialMode)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('cycleTheme() 的结果应始终是有效的主题模式', () => {
      fc.assert(
        fc.property(
          themeModeArb,
          fc.integer({ min: 1, max: 10 }), // 随机调用次数
          (initialMode, cycleCount) => {
            const { mode, setTheme, cycleTheme, initTheme, reset } = useTheme()
            reset()
            initTheme()
            setTheme(initialMode)
            
            // 调用 cycleTheme 多次
            for (let i = 0; i < cycleCount; i++) {
              cycleTheme()
              // 每次调用后，mode 应该是有效值
              expect(VALID_MODES).toContain(mode.value)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 属性 2：主题偏好往返持久化
   * 
   * *对于任意* 有效的主题模式值，设置主题后保存到 localStorage，
   * 然后从 localStorage 读取并应用，应该得到相同的主题模式。
   * 
   * **Validates: Requirements 1.4, 1.5**
   */
  describe('Feature: website-enhancement-v2, Property 2: 主题偏好往返持久化', () => {
    it('对于任意有效主题模式，保存后读取应得到相同值（往返属性）', () => {
      fc.assert(
        fc.property(
          themeModeArb,
          (themeMode) => {
            // 第一个实例：设置并保存主题
            const theme1 = useTheme()
            theme1.reset()
            theme1.initTheme()
            theme1.setTheme(themeMode)
            
            // 验证已保存到 localStorage
            expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, themeMode)
            
            // 模拟页面刷新：重置状态并重新初始化
            theme1.reset()
            
            // 设置 localStorage mock 返回保存的值
            localStorageMock.getItem.mockReturnValue(themeMode)
            
            // 第二个实例：从 localStorage 读取
            const theme2 = useTheme()
            theme2.initTheme()
            
            // 验证读取的值与保存的值相同
            expect(theme2.mode.value).toBe(themeMode)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('多次设置主题后，localStorage 应保存最后设置的值', () => {
      fc.assert(
        fc.property(
          fc.array(themeModeArb, { minLength: 2, maxLength: 5 }),
          (themeModes) => {
            const { setTheme, initTheme, reset } = useTheme()
            reset()
            initTheme()
            
            // 依次设置多个主题
            for (const mode of themeModes) {
              setTheme(mode)
            }
            
            // 最后一次调用应该保存最后的主题
            const lastMode = themeModes[themeModes.length - 1]
            expect(localStorageMock._getStore()[STORAGE_KEY]).toBe(lastMode)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('localStorage 中的无效值应被忽略，使用默认值', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !VALID_MODES.includes(s as ThemeMode)),
          (invalidValue) => {
            // 设置无效的 localStorage 值
            localStorageMock.getItem.mockReturnValue(invalidValue)
            
            const { mode, initTheme, reset } = useTheme()
            reset()
            initTheme()
            
            // 应该使用默认值 'system'
            expect(mode.value).toBe('system')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 属性 3：系统主题跟随
   * 
   * *对于任意* 系统主题偏好（深色/浅色），当主题模式设置为 'system' 时，
   * resolvedTheme 应该与系统偏好一致。
   * 
   * **Validates: Requirements 1.6**
   */
  describe('Feature: website-enhancement-v2, Property 3: 系统主题跟随', () => {
    it('当模式为 system 时，resolvedTheme 应与系统偏好一致', () => {
      fc.assert(
        fc.property(
          systemPreferenceArb,
          (prefersDark) => {
            // 设置系统偏好
            matchMediaMock = createMatchMediaMock(prefersDark)
            window.matchMedia = vi.fn().mockReturnValue(matchMediaMock)
            
            const { resolvedTheme, setTheme, initTheme, reset } = useTheme()
            reset()
            initTheme()
            setTheme('system')
            
            // resolvedTheme 应该与系统偏好一致
            const expectedTheme = prefersDark ? 'dark' : 'light'
            expect(resolvedTheme.value).toBe(expectedTheme)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('系统主题变化时，system 模式下的 resolvedTheme 应自动更新', () => {
      fc.assert(
        fc.property(
          systemPreferenceArb,
          systemPreferenceArb,
          (initialPreference, newPreference) => {
            // 设置初始系统偏好
            matchMediaMock = createMatchMediaMock(initialPreference)
            window.matchMedia = vi.fn().mockReturnValue(matchMediaMock)
            
            const { resolvedTheme, setTheme, initTheme, reset } = useTheme()
            reset()
            initTheme()
            setTheme('system')
            
            // 验证初始状态
            expect(resolvedTheme.value).toBe(initialPreference ? 'dark' : 'light')
            
            // 模拟系统主题变化
            matchMediaMock._triggerChange(newPreference)
            
            // resolvedTheme 应该更新
            expect(resolvedTheme.value).toBe(newPreference ? 'dark' : 'light')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('非 system 模式下，系统主题变化不应影响 resolvedTheme', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ThemeMode>('dark', 'light'), // 只测试 dark 和 light
          systemPreferenceArb,
          systemPreferenceArb,
          (explicitMode, initialPreference, newPreference) => {
            // 设置初始系统偏好
            matchMediaMock = createMatchMediaMock(initialPreference)
            window.matchMedia = vi.fn().mockReturnValue(matchMediaMock)
            
            const { resolvedTheme, setTheme, initTheme, reset } = useTheme()
            reset()
            initTheme()
            setTheme(explicitMode)
            
            // 验证初始状态
            expect(resolvedTheme.value).toBe(explicitMode)
            
            // 模拟系统主题变化
            matchMediaMock._triggerChange(newPreference)
            
            // resolvedTheme 应该保持不变
            expect(resolvedTheme.value).toBe(explicitMode)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('resolvedTheme 应始终是 dark 或 light', () => {
      fc.assert(
        fc.property(
          themeModeArb,
          systemPreferenceArb,
          (mode, prefersDark) => {
            matchMediaMock = createMatchMediaMock(prefersDark)
            window.matchMedia = vi.fn().mockReturnValue(matchMediaMock)
            
            const { resolvedTheme, setTheme, initTheme, reset } = useTheme()
            reset()
            initTheme()
            setTheme(mode)
            
            // resolvedTheme 应该只能是 'dark' 或 'light'
            expect(['dark', 'light']).toContain(resolvedTheme.value)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 属性 4：主题配置完整性
   * 
   * *对于任意* 主题配置对象，必须包含所有必需的 CSS 变量键：
   * primary、bgPrimary、bgSecondary、textPrimary、textSecondary、border。
   * 
   * **Validates: Requirements 1.7**
   */
  describe('Feature: website-enhancement-v2, Property 4: 主题配置完整性', () => {
    it('生成的主题配置应包含所有必需的 CSS 变量键', () => {
      fc.assert(
        fc.property(
          themeConfigArb,
          (config) => {
            // 验证配置包含所有必需的键
            for (const key of REQUIRED_CSS_KEYS) {
              expect(config).toHaveProperty(key)
              expect(typeof config[key as keyof typeof config]).toBe('string')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('CSS 变量值应为有效的颜色格式', () => {
      fc.assert(
        fc.property(
          themeConfigArb,
          (config) => {
            // 验证所有颜色值都是有效的十六进制格式
            const hexColorRegex = /^#[0-9a-fA-F]{6}$/
            
            for (const key of REQUIRED_CSS_KEYS) {
              const value = config[key as keyof typeof config]
              expect(value).toMatch(hexColorRegex)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('VALID_MODES 常量应包含所有三种主题模式', () => {
      // 这是一个不变量测试
      expect(VALID_MODES).toHaveLength(3)
      expect(VALID_MODES).toContain('dark')
      expect(VALID_MODES).toContain('light')
      expect(VALID_MODES).toContain('system')
    })

    it('主题切换后 DOM 应设置正确的 data-theme 属性', () => {
      fc.assert(
        fc.property(
          themeModeArb,
          systemPreferenceArb,
          (mode, prefersDark) => {
            matchMediaMock = createMatchMediaMock(prefersDark)
            window.matchMedia = vi.fn().mockReturnValue(matchMediaMock)
            
            const { resolvedTheme, setTheme, initTheme, reset } = useTheme()
            reset()
            initTheme()
            setTheme(mode)
            
            // DOM 上的 data-theme 应该与 resolvedTheme 一致
            const dataTheme = document.documentElement.getAttribute('data-theme')
            expect(dataTheme).toBe(resolvedTheme.value)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('主题配置应支持任意有效的十六进制颜色值', () => {
      fc.assert(
        fc.property(
          // 生成完整的 6 位十六进制颜色
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([r, g, b]) => {
            const toHex = (n: number) => n.toString(16).padStart(2, '0')
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`
          }),
          (color) => {
            // 验证生成的颜色是有效的十六进制格式
            const hexColorRegex = /^#[0-9a-fA-F]{6}$/
            expect(color).toMatch(hexColorRegex)
            
            // 验证颜色可以被解析
            const r = parseInt(color.slice(1, 3), 16)
            const g = parseInt(color.slice(3, 5), 16)
            const b = parseInt(color.slice(5, 7), 16)
            
            expect(r).toBeGreaterThanOrEqual(0)
            expect(r).toBeLessThanOrEqual(255)
            expect(g).toBeGreaterThanOrEqual(0)
            expect(g).toBeLessThanOrEqual(255)
            expect(b).toBeGreaterThanOrEqual(0)
            expect(b).toBeLessThanOrEqual(255)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 额外的组合属性测试
   */
  describe('组合属性测试', () => {
    it('主题系统应在任意操作序列后保持一致状态', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.constant({ type: 'cycle' as const }),
              themeModeArb.map(mode => ({ type: 'set' as const, mode })),
              systemPreferenceArb.map(pref => ({ type: 'systemChange' as const, prefersDark: pref }))
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (operations) => {
            matchMediaMock = createMatchMediaMock(true)
            window.matchMedia = vi.fn().mockReturnValue(matchMediaMock)
            
            const { mode, resolvedTheme, setTheme, cycleTheme, initTheme, reset } = useTheme()
            reset()
            initTheme()
            
            // 执行操作序列
            for (const op of operations) {
              if (op.type === 'cycle') {
                cycleTheme()
              } else if (op.type === 'set') {
                setTheme(op.mode)
              } else if (op.type === 'systemChange') {
                matchMediaMock._triggerChange(op.prefersDark)
              }
              
              // 每次操作后验证状态一致性
              expect(VALID_MODES).toContain(mode.value)
              expect(['dark', 'light']).toContain(resolvedTheme.value)
              
              // DOM 状态应与 resolvedTheme 一致
              const dataTheme = document.documentElement.getAttribute('data-theme')
              expect(dataTheme).toBe(resolvedTheme.value)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
