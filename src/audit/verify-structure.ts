/**
 * 项目结构验证脚本
 * 验证所有必要的目录和文件是否已创建
 */

import { fileExists } from './utils/fileUtils'
import * as path from 'path'

/**
 * 必需的文件列表
 */
const requiredFiles = [
  // 核心文件
  'types.ts',
  'constants.ts',
  'index.ts',
  'README.md',
  'tsconfig.json',
  'config.example.ts',
  
  // ESLint 迁移器
  'eslint/types.ts',
  
  // 注释检查器
  'comments/types.ts',
  
  // 文档整理器
  'docs/types.ts',
  
  // 代码清理器
  'cleaner/types.ts',
  
  // 报告生成器
  'reporter/types.ts',
  
  // 工具函数
  'utils/fileUtils.ts',
  
  // 测试文件
  '__tests__/types.test.ts',
  'utils/__tests__/fileUtils.test.ts'
]

/**
 * 验证项目结构
 */
async function verifyStructure(): Promise<void> {
  const baseDir = __dirname
  const missingFiles: string[] = []
  
  console.log('🔍 验证项目结构...\n')
  
  for (const file of requiredFiles) {
    const filePath = path.join(baseDir, file)
    const exists = await fileExists(filePath)
    
    if (exists) {
      console.log(`✅ ${file}`)
    } else {
      console.log(`❌ ${file} - 缺失`)
      missingFiles.push(file)
    }
  }
  
  console.log('\n' + '='.repeat(50))
  
  if (missingFiles.length === 0) {
    console.log('✅ 所有必需文件都已创建！')
    console.log(`📊 总计: ${requiredFiles.length} 个文件`)
  } else {
    console.log(`❌ 缺少 ${missingFiles.length} 个文件：`)
    missingFiles.forEach(file => console.log(`   - ${file}`))
    process.exit(1)
  }
}

// 运行验证
verifyStructure().catch(error => {
  console.error('验证失败:', error)
  process.exit(1)
})
