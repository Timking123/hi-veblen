/**
 * 文件同步工具
 * 同步所有文件到公共目录
 * 
 * 需求: 15.2 - 提供脚本同步现有简历文件到正确位置
 * 
 * 使用方法:
 * npm run sync:files
 */

import { fileSyncService } from '../services/fileSync'
import { getDatabase } from '../database/init'
import { createLogger } from '../utils/logger'
import * as fs from 'fs'
import * as path from 'path'

const logger = createLogger('FileSyncScript')

/**
 * 同步结果接口
 */
interface SyncResult {
  type: 'resume' | 'audio'
  status: 'success' | 'failed'
  message: string
  path?: string
}

/**
 * 同步报告接口
 */
interface SyncReport {
  total: number
  successful: number
  failed: number
  results: SyncResult[]
}

/**
 * 同步当前简历
 */
async function syncResume(): Promise<SyncResult> {
  try {
    logger.info('开始同步当前简历...')
    const result = await fileSyncService.syncActiveResumeToPublic()
    
    if (result.success) {
      return {
        type: 'resume',
        status: 'success',
        message: '简历同步成功',
        path: result.targetPath
      }
    } else {
      return {
        type: 'resume',
        status: 'failed',
        message: `简历同步失败: ${result.error}`
      }
    }
  } catch (error) {
    return {
      type: 'resume',
      status: 'failed',
      message: `简历同步失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 获取所有音频文件
 */
function getAllAudioFiles(): string[] {
  const audioFiles: string[] = []
  const PROJECT_ROOT = path.resolve(__dirname, '../../..')
  const ADMIN_FILE_ROOT = path.join(PROJECT_ROOT, 'file')
  const audioDir = path.join(ADMIN_FILE_ROOT, 'audio')
  
  if (!fs.existsSync(audioDir)) {
    return audioFiles
  }
  
  // 遍历 BGM 和 SFX 目录
  const subDirs = ['bgm', 'sfx']
  
  for (const subDir of subDirs) {
    const fullSubDir = path.join(audioDir, subDir)
    
    if (fs.existsSync(fullSubDir)) {
      const files = fs.readdirSync(fullSubDir)
      
      for (const file of files) {
        // 只处理音频文件
        const ext = path.extname(file).toLowerCase()
        if (ext === '.mp3' || ext === '.ogg') {
          audioFiles.push(`audio/${subDir}/${file}`)
        }
      }
    }
  }
  
  return audioFiles
}

/**
 * 同步所有音频文件
 */
async function syncAudioFiles(): Promise<SyncResult[]> {
  const results: SyncResult[] = []
  const audioFiles = getAllAudioFiles()
  
  logger.info(`找到 ${audioFiles.length} 个音频文件`)
  
  for (const audioPath of audioFiles) {
    try {
      logger.info(`同步音频文件: ${audioPath}`)
      const result = await fileSyncService.syncAudioToPublic(audioPath)
      
      if (result.success) {
        results.push({
          type: 'audio',
          status: 'success',
          message: `音频文件同步成功: ${audioPath}`,
          path: result.targetPath
        })
      } else {
        results.push({
          type: 'audio',
          status: 'failed',
          message: `音频文件同步失败: ${audioPath} - ${result.error}`
        })
      }
    } catch (error) {
      results.push({
        type: 'audio',
        status: 'failed',
        message: `音频文件同步失败: ${audioPath} - ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }
  
  return results
}

/**
 * 生成同步报告
 */
async function generateSyncReport(): Promise<SyncReport> {
  const results: SyncResult[] = []
  
  // 1. 同步当前简历
  const resumeResult = await syncResume()
  results.push(resumeResult)
  
  // 2. 同步所有音频文件
  const audioResults = await syncAudioFiles()
  results.push(...audioResults)
  
  // 3. 统计结果
  const report: SyncReport = {
    total: results.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length,
    results
  }
  
  return report
}

/**
 * 打印同步报告
 */
function printReport(report: SyncReport): void {
  console.log('\n========== 文件同步报告 ==========\n')
  
  console.log(`总文件数: ${report.total}`)
  console.log(`成功: ${report.successful}`)
  console.log(`失败: ${report.failed}`)
  console.log()
  
  if (report.failed > 0) {
    console.log('失败的文件:\n')
    
    for (const result of report.results) {
      if (result.status === 'failed') {
        console.log(`  ✗ ${result.message}`)
      }
    }
    console.log()
  }
  
  if (report.successful > 0) {
    console.log('成功的文件:\n')
    
    for (const result of report.results) {
      if (result.status === 'success') {
        console.log(`  ✓ ${result.message}`)
      }
    }
  }
  
  console.log('\n==================================\n')
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    logger.info('开始文件同步...')
    
    const report = await generateSyncReport()
    printReport(report)
    
    if (report.failed > 0) {
      logger.warn(`文件同步完成，但有 ${report.failed} 个文件失败`)
      process.exit(1)
    } else {
      logger.info('文件同步完成，所有文件同步成功')
    }
  } catch (error) {
    logger.error('文件同步失败', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

export { generateSyncReport, printReport }
