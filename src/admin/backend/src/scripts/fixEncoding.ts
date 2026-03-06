/**
 * 文件名编码修复工具
 * 检测和修复文件名编码问题
 * 
 * 需求: 15.3 - 提供脚本修复文件名编码问题
 * 
 * 使用方法:
 * npm run fix:encoding
 */

import { getDatabase, saveDatabase } from '../database/init'
import { createLogger } from '../utils/logger'
import { isValidUtf8, normalizeFilename } from '../utils/fileEncoding'

const logger = createLogger('EncodingFixScript')

/**
 * 修复记录接口
 */
interface Fix {
  fileId: number
  tableName: string
  originalFilename: string
  fixedFilename?: string
  status: 'success' | 'failed' | 'skipped'
  error?: string
}

/**
 * 修复报告接口
 */
interface FixReport {
  totalChecked: number
  totalFixed: number
  totalFailed: number
  totalSkipped: number
  fixes: Fix[]
}

/**
 * 检测并转换编码
 * 尝试从常见的错误编码转换为 UTF-8
 */
function detectAndConvertEncoding(filename: string): string {
  // 如果已经是有效的 UTF-8，直接返回
  if (isValidUtf8(filename)) {
    return filename
  }
  
  // 尝试从 GBK/GB2312 转换（中文 Windows 常见编码）
  try {
    const iconv = require('iconv-lite')
    
    // 尝试 GBK 解码
    const buffer = Buffer.from(filename, 'binary')
    const decoded = iconv.decode(buffer, 'gbk')
    
    if (isValidUtf8(decoded)) {
      return decoded
    }
  } catch {
    // 转换失败，继续尝试其他方法
  }
  
  // 如果无法转换，使用规范化函数清理
  return normalizeFilename(filename)
}

/**
 * 检查并修复简历文件名编码
 */
function fixResumeEncoding(): Fix[] {
  const fixes: Fix[] = []
  const db = getDatabase()
  
  try {
    const result = db.exec('SELECT id, filename FROM resume_versions')
    
    if (result.length > 0 && result[0]?.values) {
      for (const row of result[0].values) {
        const [id, filename] = row as [number, string]
        
        // 检查文件名是否为有效 UTF-8
        if (!isValidUtf8(filename)) {
          try {
            // 尝试修复编码
            const fixedFilename = detectAndConvertEncoding(filename)
            
            // 更新数据库记录
            db.run('UPDATE resume_versions SET filename = ? WHERE id = ?', [fixedFilename, id])
            
            fixes.push({
              fileId: id,
              tableName: 'resume_versions',
              originalFilename: filename,
              fixedFilename,
              status: 'success'
            })
            
            logger.info('修复简历文件名编码', { id, originalFilename: filename, fixedFilename })
          } catch (error) {
            fixes.push({
              fileId: id,
              tableName: 'resume_versions',
              originalFilename: filename,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error)
            })
            
            logger.error('修复简历文件名编码失败', { 
              id, 
              filename, 
              error: error instanceof Error ? error.message : String(error) 
            })
          }
        } else {
          fixes.push({
            fileId: id,
            tableName: 'resume_versions',
            originalFilename: filename,
            status: 'skipped'
          })
        }
      }
    }
  } catch (error) {
    logger.error('检查简历文件名编码失败', { 
      error: error instanceof Error ? error.message : String(error) 
    })
  }
  
  return fixes
}

/**
 * 检查并修复留言文件名编码
 */
function fixMessageEncoding(): Fix[] {
  const fixes: Fix[] = []
  const db = getDatabase()
  
  try {
    const result = db.exec('SELECT id, nickname, file_path FROM messages')
    
    if (result.length > 0 && result[0]?.values) {
      for (const row of result[0].values) {
        const [id, nickname, filePath] = row as [number, string, string | null]
        
        // 检查昵称是否为有效 UTF-8
        if (!isValidUtf8(nickname)) {
          try {
            // 尝试修复编码
            const fixedNickname = detectAndConvertEncoding(nickname)
            
            // 更新数据库记录
            db.run('UPDATE messages SET nickname = ? WHERE id = ?', [fixedNickname, id])
            
            fixes.push({
              fileId: id,
              tableName: 'messages',
              originalFilename: nickname,
              fixedFilename: fixedNickname,
              status: 'success'
            })
            
            logger.info('修复留言昵称编码', { id, originalNickname: nickname, fixedNickname })
          } catch (error) {
            fixes.push({
              fileId: id,
              tableName: 'messages',
              originalFilename: nickname,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error)
            })
            
            logger.error('修复留言昵称编码失败', { 
              id, 
              nickname, 
              error: error instanceof Error ? error.message : String(error) 
            })
          }
        } else {
          fixes.push({
            fileId: id,
            tableName: 'messages',
            originalFilename: nickname,
            status: 'skipped'
          })
        }
      }
    }
  } catch (error) {
    logger.error('检查留言编码失败', { 
      error: error instanceof Error ? error.message : String(error) 
    })
  }
  
  return fixes
}

/**
 * 生成修复报告
 */
function generateFixReport(): FixReport {
  logger.info('开始检查文件名编码...')
  
  const allFixes: Fix[] = []
  
  // 检查简历
  const resumeFixes = fixResumeEncoding()
  allFixes.push(...resumeFixes)
  
  // 检查留言
  const messageFixes = fixMessageEncoding()
  allFixes.push(...messageFixes)
  
  // 保存数据库更改
  if (allFixes.some(f => f.status === 'success')) {
    saveDatabase()
    logger.info('数据库更改已保存')
  }
  
  // 统计结果
  const report: FixReport = {
    totalChecked: allFixes.length,
    totalFixed: allFixes.filter(f => f.status === 'success').length,
    totalFailed: allFixes.filter(f => f.status === 'failed').length,
    totalSkipped: allFixes.filter(f => f.status === 'skipped').length,
    fixes: allFixes
  }
  
  return report
}

/**
 * 打印修复报告
 */
function printReport(report: FixReport): void {
  console.log('\n========== 文件名编码修复报告 ==========\n')
  
  console.log(`总检查数: ${report.totalChecked}`)
  console.log(`已修复: ${report.totalFixed}`)
  console.log(`失败: ${report.totalFailed}`)
  console.log(`跳过（无需修复）: ${report.totalSkipped}`)
  console.log()
  
  if (report.totalFixed > 0) {
    console.log('已修复的文件:\n')
    
    for (const fix of report.fixes) {
      if (fix.status === 'success') {
        console.log(`  ✓ [${fix.tableName}] ID ${fix.fileId}`)
        console.log(`    原文件名: ${fix.originalFilename}`)
        console.log(`    新文件名: ${fix.fixedFilename}`)
      }
    }
    console.log()
  }
  
  if (report.totalFailed > 0) {
    console.log('修复失败的文件:\n')
    
    for (const fix of report.fixes) {
      if (fix.status === 'failed') {
        console.log(`  ✗ [${fix.tableName}] ID ${fix.fileId}`)
        console.log(`    文件名: ${fix.originalFilename}`)
        console.log(`    错误: ${fix.error}`)
      }
    }
  }
  
  console.log('\n========================================\n')
}

/**
 * 主函数
 */
function main(): void {
  try {
    const report = generateFixReport()
    printReport(report)
    
    if (report.totalFailed > 0) {
      logger.warn(`编码修复完成，但有 ${report.totalFailed} 个文件失败`)
      process.exit(1)
    } else if (report.totalFixed > 0) {
      logger.info(`编码修复完成，共修复 ${report.totalFixed} 个文件`)
    } else {
      logger.info('未发现需要修复的编码问题')
    }
  } catch (error) {
    logger.error('编码修复失败', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

export { generateFixReport, printReport }
