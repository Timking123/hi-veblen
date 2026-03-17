/**
 * 颜色调整工具
 * 用于调整颜色以满足对比度要求
 */

import { hexToRgb, getContrastRatio } from './contrastChecker'

/**
 * 将 RGB 转换为十六进制
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 调整颜色亮度以满足对比度要求
 * @param foreground 前景色（十六进制）
 * @param background 背景色（十六进制）
 * @param targetRatio 目标对比度
 * @param darken 是否加深颜色（true）或变浅（false）
 */
export function adjustColorForContrast(
  foreground: string,
  background: string,
  targetRatio: number,
  darken = true
): string {
  const rgb = hexToRgb(foreground)
  if (!rgb) throw new Error('无效的前景色')

  let { r, g, b } = rgb
  let currentRatio = getContrastRatio(foreground, background)
  let iterations = 0
  const maxIterations = 100

  // 二分查找合适的颜色
  while (Math.abs(currentRatio - targetRatio) > 0.1 && iterations < maxIterations) {
    if (currentRatio < targetRatio) {
      // 需要增加对比度
      if (darken) {
        // 加深颜色
        r = Math.max(0, r - 5)
        g = Math.max(0, g - 5)
        b = Math.max(0, b - 5)
      } else {
        // 变浅颜色
        r = Math.min(255, r + 5)
        g = Math.min(255, g + 5)
        b = Math.min(255, b + 5)
      }
    } else {
      // 对比度过高，需要减少
      if (darken) {
        r = Math.min(255, r + 2)
        g = Math.min(255, g + 2)
        b = Math.min(255, b + 2)
      } else {
        r = Math.max(0, r - 2)
        g = Math.max(0, g - 2)
        b = Math.max(0, b - 2)
      }
    }

    const newColor = rgbToHex(r, g, b)
    currentRatio = getContrastRatio(newColor, background)
    iterations++
  }

  return rgbToHex(r, g, b)
}

/**
 * 为亮色主题建议合适的三级文字颜色
 */
export function suggestTertiaryTextColor(background: string): string {
  // 从当前的三级文字颜色开始
  const currentColor = '#718096'
  // 目标对比度 4.5:1
  const targetRatio = 4.5
  // 加深颜色以增加对比度
  return adjustColorForContrast(currentColor, background, targetRatio, true)
}
