/**
 * 计算符合 WCAG AA 标准的颜色
 */

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(n).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) {
    throw new Error('无效的颜色格式')
  }

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b)
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

function adjustColorForContrast(foreground, background, targetRatio) {
  const rgb = hexToRgb(foreground)
  if (!rgb) throw new Error('无效的前景色')

  let { r, g, b } = rgb
  let currentRatio = getContrastRatio(foreground, background)
  let iterations = 0
  const maxIterations = 100

  console.log(`初始颜色: ${foreground}, 初始对比度: ${currentRatio.toFixed(2)}:1`)

  while (currentRatio < targetRatio && iterations < maxIterations) {
    // 加深颜色以增加对比度
    r = Math.max(0, r - 5)
    g = Math.max(0, g - 5)
    b = Math.max(0, b - 5)

    const newColor = rgbToHex(r, g, b)
    currentRatio = getContrastRatio(newColor, background)
    iterations++

    if (iterations % 10 === 0) {
      console.log(`迭代 ${iterations}: ${newColor}, 对比度: ${currentRatio.toFixed(2)}:1`)
    }
  }

  const finalColor = rgbToHex(r, g, b)
  console.log(`最终颜色: ${finalColor}, 最终对比度: ${currentRatio.toFixed(2)}:1`)
  return finalColor
}

// 计算三级文字颜色
const currentTertiary = '#718096'
const bgPrimary = '#f5f7fa'
const bgSecondary = '#ffffff'

console.log('=== 计算符合 WCAG AA 标准的三级文字颜色 ===\n')

console.log('针对主背景 (#f5f7fa):')
const newTertiaryForPrimary = adjustColorForContrast(currentTertiary, bgPrimary, 4.5)

console.log('\n针对次要背景 (#ffffff):')
const newTertiaryForSecondary = adjustColorForContrast(currentTertiary, bgSecondary, 4.5)

console.log('\n=== 建议 ===')
console.log(`使用 ${newTertiaryForPrimary} 作为三级文字颜色`)
console.log(`与主背景的对比度: ${getContrastRatio(newTertiaryForPrimary, bgPrimary).toFixed(2)}:1`)
console.log(`与次要背景的对比度: ${getContrastRatio(newTertiaryForPrimary, bgSecondary).toFixed(2)}:1`)
