/**
 * 对比度检查工具
 * 用于验证颜色对比度是否符合 WCAG AA 标准
 */

/**
 * 将十六进制颜色转换为 RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // 移除 # 号
  hex = hex.replace(/^#/, '')

  // 处理简写形式 (#RGB)
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

/**
 * 计算相对亮度 (Relative Luminance)
 * 根据 WCAG 2.0 规范
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  // 将 RGB 值归一化到 0-1
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const normalized = val / 255
    // 应用 sRGB 伽马校正
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4)
  })

  // 计算相对亮度
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * 计算两个颜色之间的对比度
 * 根据 WCAG 2.0 规范
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) {
    throw new Error('无效的颜色格式')
  }

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b)
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b)

  // 确保 lighter 是较亮的颜色
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  // 计算对比度
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * 检查对比度是否符合 WCAG AA 标准
 * AA 标准要求：
 * - 正常文字：至少 4.5:1
 * - 大文字（18pt+ 或 14pt+ 加粗）：至少 3:1
 */
export function meetsWCAGAA(
  textColor: string,
  bgColor: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(textColor, bgColor)
  const requiredRatio = isLargeText ? 3 : 4.5
  return ratio >= requiredRatio
}

/**
 * 检查对比度是否符合 WCAG AAA 标准
 * AAA 标准要求：
 * - 正常文字：至少 7:1
 * - 大文字：至少 4.5:1
 */
export function meetsWCAGAAA(
  textColor: string,
  bgColor: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(textColor, bgColor)
  const requiredRatio = isLargeText ? 4.5 : 7
  return ratio >= requiredRatio
}

/**
 * 获取对比度等级
 */
export function getContrastLevel(
  textColor: string,
  bgColor: string,
  isLargeText: boolean = false
): 'AAA' | 'AA' | 'Fail' {
  if (meetsWCAGAAA(textColor, bgColor, isLargeText)) {
    return 'AAA'
  }
  if (meetsWCAGAA(textColor, bgColor, isLargeText)) {
    return 'AA'
  }
  return 'Fail'
}

/**
 * 格式化对比度比率
 */
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`
}
