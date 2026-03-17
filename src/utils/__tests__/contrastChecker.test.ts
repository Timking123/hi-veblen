import { describe, it, expect } from 'vitest'
import {
  hexToRgb,
  getRelativeLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  getContrastLevel,
  formatContrastRatio
} from '../contrastChecker'

describe('contrastChecker', () => {
  describe('hexToRgb', () => {
    it('应该正确转换标准十六进制颜色', () => {
      const result = hexToRgb('#1a202c')
      expect(result).toEqual({ r: 26, g: 32, b: 44 })
    })

    it('应该正确转换不带 # 的十六进制颜色', () => {
      const result = hexToRgb('1a202c')
      expect(result).toEqual({ r: 26, g: 32, b: 44 })
    })

    it('应该正确转换简写形式的十六进制颜色', () => {
      const result = hexToRgb('#fff')
      expect(result).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('应该正确转换黑色', () => {
      const result = hexToRgb('#000000')
      expect(result).toEqual({ r: 0, g: 0, b: 0 })
    })

    it('应该正确转换白色', () => {
      const result = hexToRgb('#ffffff')
      expect(result).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('应该对无效颜色返回 null', () => {
      const result = hexToRgb('invalid')
      expect(result).toBeNull()
    })
  })

  describe('getRelativeLuminance', () => {
    it('应该为黑色返回 0', () => {
      const luminance = getRelativeLuminance(0, 0, 0)
      expect(luminance).toBe(0)
    })

    it('应该为白色返回 1', () => {
      const luminance = getRelativeLuminance(255, 255, 255)
      expect(luminance).toBe(1)
    })

    it('应该为灰色返回中间值', () => {
      const luminance = getRelativeLuminance(128, 128, 128)
      expect(luminance).toBeGreaterThan(0)
      expect(luminance).toBeLessThan(1)
    })

    it('应该正确计算 text-primary 的亮度', () => {
      const luminance = getRelativeLuminance(26, 32, 44)
      expect(luminance).toBeGreaterThan(0)
      expect(luminance).toBeLessThan(0.1)
    })
  })

  describe('getContrastRatio', () => {
    it('应该为黑白对比返回 21:1', () => {
      const ratio = getContrastRatio('#000000', '#ffffff')
      expect(ratio).toBeCloseTo(21, 1)
    })

    it('应该为相同颜色返回 1:1', () => {
      const ratio = getContrastRatio('#1a202c', '#1a202c')
      expect(ratio).toBeCloseTo(1, 1)
    })

    it('应该正确计算 text-primary 与 bg-primary 的对比度', () => {
      const ratio = getContrastRatio('#1a202c', '#f5f7fa')
      expect(ratio).toBeGreaterThan(15)
      expect(ratio).toBeLessThan(16)
    })

    it('应该正确计算 text-secondary 与 bg-primary 的对比度', () => {
      const ratio = getContrastRatio('#4a5568', '#f5f7fa')
      expect(ratio).toBeGreaterThan(7)
      expect(ratio).toBeLessThan(8)
    })

    it('应该对颜色顺序不敏感', () => {
      const ratio1 = getContrastRatio('#1a202c', '#f5f7fa')
      const ratio2 = getContrastRatio('#f5f7fa', '#1a202c')
      expect(ratio1).toBe(ratio2)
    })

    it('应该对无效颜色抛出错误', () => {
      expect(() => getContrastRatio('invalid', '#ffffff')).toThrow('无效的颜色格式')
    })
  })

  describe('meetsWCAGAA', () => {
    it('应该对 text-primary 与 bg-primary 返回 true', () => {
      const passes = meetsWCAGAA('#1a202c', '#f5f7fa')
      expect(passes).toBe(true)
    })

    it('应该对 text-secondary 与 bg-primary 返回 true', () => {
      const passes = meetsWCAGAA('#4a5568', '#f5f7fa')
      expect(passes).toBe(true)
    })

    it('应该对低对比度组合返回 false', () => {
      const passes = meetsWCAGAA('#cccccc', '#ffffff')
      expect(passes).toBe(false)
    })

    it('应该对大文字使用 3:1 标准', () => {
      // 使用一个对比度刚好大于 3:1 的组合
      // #949494 与 #ffffff 的对比度约为 3.1:1
      const passes = meetsWCAGAA('#949494', '#ffffff', true)
      expect(passes).toBe(true)
    })

    it('应该对黑白对比返回 true', () => {
      const passes = meetsWCAGAA('#000000', '#ffffff')
      expect(passes).toBe(true)
    })
  })

  describe('meetsWCAGAAA', () => {
    it('应该对 text-primary 与 bg-primary 返回 true', () => {
      const passes = meetsWCAGAAA('#1a202c', '#f5f7fa')
      expect(passes).toBe(true)
    })

    it('应该对 text-secondary 与 bg-primary 返回 true', () => {
      const passes = meetsWCAGAAA('#4a5568', '#f5f7fa')
      expect(passes).toBe(true)
    })

    it('应该对仅符合 AA 的组合返回 false', () => {
      // 对比度约为 5:1，符合 AA 但不符合 AAA
      const passes = meetsWCAGAAA('#767676', '#ffffff')
      expect(passes).toBe(false)
    })

    it('应该对大文字使用 4.5:1 标准', () => {
      const passes = meetsWCAGAAA('#767676', '#ffffff', true)
      expect(passes).toBe(true)
    })
  })

  describe('getContrastLevel', () => {
    it('应该为 text-primary 与 bg-primary 返回 AAA', () => {
      const level = getContrastLevel('#1a202c', '#f5f7fa')
      expect(level).toBe('AAA')
    })

    it('应该为 text-secondary 与 bg-primary 返回 AAA', () => {
      const level = getContrastLevel('#4a5568', '#f5f7fa')
      expect(level).toBe('AAA')
    })

    it('应该为低对比度组合返回 Fail', () => {
      const level = getContrastLevel('#cccccc', '#ffffff')
      expect(level).toBe('Fail')
    })

    it('应该为中等对比度组合返回 AA', () => {
      // 对比度约为 5:1，符合 AA 但不符合 AAA
      const level = getContrastLevel('#767676', '#ffffff')
      expect(level).toBe('AA')
    })

    it('应该为黑白对比返回 AAA', () => {
      const level = getContrastLevel('#000000', '#ffffff')
      expect(level).toBe('AAA')
    })
  })

  describe('formatContrastRatio', () => {
    it('应该正确格式化对比度', () => {
      const formatted = formatContrastRatio(15.2)
      expect(formatted).toBe('15.20:1')
    })

    it('应该保留两位小数', () => {
      const formatted = formatContrastRatio(7.012345)
      expect(formatted).toBe('7.01:1')
    })

    it('应该正确格式化整数对比度', () => {
      const formatted = formatContrastRatio(21)
      expect(formatted).toBe('21.00:1')
    })

    it('应该正确格式化 1:1 对比度', () => {
      const formatted = formatContrastRatio(1)
      expect(formatted).toBe('1.00:1')
    })
  })

  describe('亮色主题颜色验证', () => {
    const lightThemeColors = {
      backgrounds: {
        'bg-primary': '#f5f7fa',
        'bg-secondary': '#ffffff',
        'bg-tertiary': '#e8ecf1'
      },
      texts: {
        'text-primary': '#1a202c',
        'text-secondary': '#4a5568',
        'text-tertiary': '#4a5568'
      }
    }

    it('所有文字颜色与 bg-primary 的对比度应符合 WCAG AA', () => {
      Object.values(lightThemeColors.texts).forEach((textColor) => {
        const passes = meetsWCAGAA(textColor, lightThemeColors.backgrounds['bg-primary'])
        expect(passes).toBe(true)
      })
    })

    it('所有文字颜色与 bg-secondary 的对比度应符合 WCAG AA', () => {
      Object.values(lightThemeColors.texts).forEach((textColor) => {
        const passes = meetsWCAGAA(textColor, lightThemeColors.backgrounds['bg-secondary'])
        expect(passes).toBe(true)
      })
    })

    it('所有文字颜色与 bg-tertiary 的对比度应符合 WCAG AA', () => {
      Object.values(lightThemeColors.texts).forEach((textColor) => {
        const passes = meetsWCAGAA(textColor, lightThemeColors.backgrounds['bg-tertiary'])
        expect(passes).toBe(true)
      })
    })

    it('text-primary 与 bg-primary 的对比度应至少为 15:1', () => {
      const ratio = getContrastRatio(
        lightThemeColors.texts['text-primary'],
        lightThemeColors.backgrounds['bg-primary']
      )
      expect(ratio).toBeGreaterThanOrEqual(15)
    })

    it('text-secondary 与 bg-primary 的对比度应至少为 7:1', () => {
      const ratio = getContrastRatio(
        lightThemeColors.texts['text-secondary'],
        lightThemeColors.backgrounds['bg-primary']
      )
      expect(ratio).toBeGreaterThanOrEqual(7)
    })
  })
})
