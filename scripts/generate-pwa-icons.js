/**
 * PWA 图标生成脚本
 * 
 * 此脚本用于生成 PWA 所需的各种尺寸图标。
 * 由于 Node.js 环境限制，此脚本生成简单的占位符 PNG 图标。
 * 
 * 生产环境建议：
 * 1. 使用专业设计工具（如 Figma、Sketch）设计图标
 * 2. 使用在线工具（如 https://realfavicongenerator.net/）生成完整图标集
 * 3. 或使用 sharp 库进行图片处理
 * 
 * 运行方式: node scripts/generate-pwa-icons.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, '..', 'public')

// 图标尺寸配置
const iconSizes = [
  { name: 'favicon.ico', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
]

// 截图尺寸配置
const screenshotSizes = [
  { name: 'screenshot-wide.png', width: 1280, height: 720 },
  { name: 'screenshot-narrow.png', width: 750, height: 1334 },
]

/**
 * 生成简单的 PNG 占位符（1x1 像素透明图片）
 * 实际项目中应使用真实图标
 */
function generatePlaceholderPNG() {
  // 最小的有效 PNG 文件（1x1 透明像素）
  // PNG 文件头 + IHDR + IDAT + IEND
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG 签名
    0x00, 0x00, 0x00, 0x0D, // IHDR 长度
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // 宽度 1
    0x00, 0x00, 0x00, 0x01, // 高度 1
    0x08, 0x06, // 位深度 8, 颜色类型 6 (RGBA)
    0x00, 0x00, 0x00, // 压缩、过滤、隔行
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT 长度
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // 压缩数据
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND 长度
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ])
}

/**
 * 生成 ICO 文件占位符
 */
function generatePlaceholderICO() {
  // 最小的有效 ICO 文件
  return Buffer.from([
    0x00, 0x00, // 保留
    0x01, 0x00, // 类型 (1 = ICO)
    0x01, 0x00, // 图像数量
    0x01, // 宽度
    0x01, // 高度
    0x00, // 调色板颜色数
    0x00, // 保留
    0x01, 0x00, // 颜色平面
    0x20, 0x00, // 每像素位数
    0x30, 0x00, 0x00, 0x00, // 图像数据大小
    0x16, 0x00, 0x00, 0x00, // 图像数据偏移
    // BMP 头
    0x28, 0x00, 0x00, 0x00, // 头大小
    0x01, 0x00, 0x00, 0x00, // 宽度
    0x02, 0x00, 0x00, 0x00, // 高度 (2x 因为包含掩码)
    0x01, 0x00, // 平面数
    0x20, 0x00, // 位深度
    0x00, 0x00, 0x00, 0x00, // 压缩
    0x00, 0x00, 0x00, 0x00, // 图像大小
    0x00, 0x00, 0x00, 0x00, // X 分辨率
    0x00, 0x00, 0x00, 0x00, // Y 分辨率
    0x00, 0x00, 0x00, 0x00, // 使用的颜色
    0x00, 0x00, 0x00, 0x00, // 重要颜色
    // 像素数据 (BGRA)
    0x27, 0x0E, 0x0A, 0xFF, // 深色背景 #0A0E27
    // 掩码
    0x00, 0x00, 0x00, 0x00
  ])
}

console.log('🎨 PWA 图标生成脚本')
console.log('=' .repeat(50))
console.log('')
console.log('⚠️  注意: 此脚本生成的是占位符图标。')
console.log('   生产环境请使用专业设计的图标替换。')
console.log('')
console.log('📁 输出目录:', publicDir)
console.log('')

// 生成图标文件
console.log('📦 生成图标文件:')
iconSizes.forEach(({ name, size }) => {
  const filePath = path.join(publicDir, name)
  
  // 检查文件是否已存在
  if (fs.existsSync(filePath)) {
    console.log(`   ⏭️  ${name} (${size}x${size}) - 已存在，跳过`)
    return
  }
  
  const buffer = name.endsWith('.ico') 
    ? generatePlaceholderICO() 
    : generatePlaceholderPNG()
  
  fs.writeFileSync(filePath, buffer)
  console.log(`   ✅ ${name} (${size}x${size}) - 已创建占位符`)
})

// 生成截图文件
console.log('')
console.log('📸 生成截图文件:')
screenshotSizes.forEach(({ name, width, height }) => {
  const filePath = path.join(publicDir, name)
  
  // 检查文件是否已存在
  if (fs.existsSync(filePath)) {
    console.log(`   ⏭️  ${name} (${width}x${height}) - 已存在，跳过`)
    return
  }
  
  fs.writeFileSync(filePath, generatePlaceholderPNG())
  console.log(`   ✅ ${name} (${width}x${height}) - 已创建占位符`)
})

console.log('')
console.log('✨ 完成!')
console.log('')
console.log('📝 后续步骤:')
console.log('   1. 使用设计工具创建真实的 PWA 图标')
console.log('   2. 推荐使用 https://realfavicongenerator.net/ 生成完整图标集')
console.log('   3. 将生成的图标文件放入 public/ 目录')
console.log('   4. 可以使用 public/pwa-icon.svg 作为设计参考')
