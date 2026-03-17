/**
 * 亮色主题对比度验证脚本
 * 验证所有文字颜色与背景颜色的对比度是否符合 WCAG AA 标准
 */

import {
  getContrastRatio,
  meetsWCAGAA,
  getContrastLevel,
  formatContrastRatio
} from '../src/utils/contrastChecker'

// 亮色主题颜色定义
const LIGHT_THEME_COLORS = {
  backgrounds: {
    'bg-primary': '#f5f7fa',
    'bg-secondary': '#ffffff',
    'bg-tertiary': '#e8ecf1'
  },
  texts: {
    'text-primary': '#1a202c',
    'text-secondary': '#4a5568',
    'text-tertiary': '#4a5568' // 已调整为与 text-secondary 相同
  }
}

interface ContrastResult {
  textColor: string
  bgColor: string
  ratio: number
  passes: boolean
  level: 'AAA' | 'AA' | 'Fail'
}

/**
 * 验证所有文字与背景的对比度组合
 */
function verifyAllContrasts(): ContrastResult[] {
  const results: ContrastResult[] = []

  // 遍历所有文字颜色和背景颜色的组合
  for (const [textName, textColor] of Object.entries(LIGHT_THEME_COLORS.texts)) {
    for (const [bgName, bgColor] of Object.entries(LIGHT_THEME_COLORS.backgrounds)) {
      const ratio = getContrastRatio(textColor, bgColor)
      const passes = meetsWCAGAA(textColor, bgColor)
      const level = getContrastLevel(textColor, bgColor)

      results.push({
        textColor: `${textName} (${textColor})`,
        bgColor: `${bgName} (${bgColor})`,
        ratio,
        passes,
        level
      })
    }
  }

  return results
}

/**
 * 打印验证结果
 */
function printResults(results: ContrastResult[]): void {
  console.log('\n========== 亮色主题对比度验证报告 ==========\n')

  let allPassed = true

  results.forEach((result) => {
    const status = result.passes ? '✅ 通过' : '❌ 失败'
    const emoji = result.level === 'AAA' ? '🌟' : result.level === 'AA' ? '✅' : '❌'

    console.log(`${emoji} ${status}`)
    console.log(`   文字: ${result.textColor}`)
    console.log(`   背景: ${result.bgColor}`)
    console.log(`   对比度: ${formatContrastRatio(result.ratio)}`)
    console.log(`   等级: ${result.level}`)
    console.log()

    if (!result.passes) {
      allPassed = false
    }
  })

  console.log('========================================\n')

  if (allPassed) {
    console.log('✅ 所有颜色组合都符合 WCAG AA 标准！')
  } else {
    console.log('❌ 部分颜色组合不符合 WCAG AA 标准，需要调整。')
    process.exit(1)
  }
}

/**
 * 主要验证逻辑
 */
function main(): void {
  console.log('开始验证亮色主题对比度...\n')

  // 验证主要的文字与背景组合
  console.log('验证需求 2.4 中指定的关键组合：')
  console.log('1. text-primary (#1a202c) 与 bg-primary (#f5f7fa)')
  console.log('2. text-secondary (#4a5568) 与 bg-primary (#f5f7fa)\n')

  const ratio1 = getContrastRatio('#1a202c', '#f5f7fa')
  const passes1 = meetsWCAGAA('#1a202c', '#f5f7fa')
  const level1 = getContrastLevel('#1a202c', '#f5f7fa')

  console.log(`text-primary 与 bg-primary:`)
  console.log(`  对比度: ${formatContrastRatio(ratio1)}`)
  console.log(`  符合 AA: ${passes1 ? '✅ 是' : '❌ 否'}`)
  console.log(`  等级: ${level1}\n`)

  const ratio2 = getContrastRatio('#4a5568', '#f5f7fa')
  const passes2 = meetsWCAGAA('#4a5568', '#f5f7fa')
  const level2 = getContrastLevel('#4a5568', '#f5f7fa')

  console.log(`text-secondary 与 bg-primary:`)
  console.log(`  对比度: ${formatContrastRatio(ratio2)}`)
  console.log(`  符合 AA: ${passes2 ? '✅ 是' : '❌ 否'}`)
  console.log(`  等级: ${level2}\n`)

  // 验证所有组合
  const results = verifyAllContrasts()
  printResults(results)
}

// 运行验证
main()
