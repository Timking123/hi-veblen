/**
 * 数据一致性检查工具
 * 检查数据库记录与文件系统的一致性
 * 
 * 需求: 8.4, 15.1 - 提供数据一致性检查工具
 * 
 * 使用方法:
 * npm run check:consistency
 */

import * as fs from 'fs'
import * as path from 'path'
import { getDatabase } from '../database/init'
import { createLogger } from '../utils/logger'

const logger = createLogger('ConsistencyCheck')

// 路径常量
const PROJECT_ROOT = path.resolve(__dirname, '../../..')
const ADMIN_FILE_ROOT = path.join(PROJECT_ROOT, 'file')
const PUBLIC_ROOT = path.join(PROJECT_ROOT, '../../public')

/**
 * 问题类型
 */
type IssueType = 
  | 'missing_file'           // 数据库有记录但文件不存在
  | 'orphan_file'            // 文件存在但数据库无记录
  | 'missing_public_file'    // 公共目录缺少当前简历
  | 'file_mismatch'          // 公共目录的文件与激活版本不一致

/**
 * 问题严重级别
 */
type Severity = 'critical' | 'high' | 'medium' | 'low'

/**
 * 问题接口
 */
interface Issue {
  type: IssueType
  severity: Severity
  description: string
  record?: unknown
  filePath?: string
  suggestedFix: string
}

/**
 * 一致性检查报告
 */
interface ConsistencyReport {
  totalIssues: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  issues: Issue[]
}

/**
 * 计算文件哈希值
 */
async function getFileHash(filePath: string): Promise<string> {
  const crypto = await import('crypto')
  const content = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * 检查简历版本的一致性
 */
async function checkResumeConsistency(): Promise<Issue[]> {
  const issues: Issue[] = []
  const db = getDatabase()
  
  try {
    // 1. 检查所有简历版本
    const result = db.exec('SELECT version, filename, file_path FROM resume_versions')
    
    if (result.length > 0 && result[0]?.values) {
      for (const row of result[0].values) {
        const [version, filename, filePath] = row
        const fullPath = path.join(ADMIN_FILE_ROOT, filePath as string)
        
        if (!fs.existsSync(fullPath)) {
          issues.push({
            type: 'missing_file',
            severity: 'high',
            description: `简历版本 ${version} 的文件不存在`,
            record: { version, filename, filePath },
            filePath: fullPath,
            suggestedFix: '从备份恢复或删除数据库记录'
          })
        }
      }
    }
    
    // 2. 检查激活简历的公共副本
    const activeResult = db.exec('SELECT version, filename, file_path FROM resume_versions WHERE is_active = 1')
    
    if (activeResult.length > 0 && activeResult[0]?.values && activeResult[0].values.length > 0) {
      const [version, filename, filePath] = activeResult[0].values[0] as [number, string, string]
      const sourcePath = path.join(ADMIN_FILE_ROOT, filePath)
      const publicPath = path.join(PUBLIC_ROOT, 'resume.pdf')
      
      if (!fs.existsSync(publicPath)) {
        issues.push({
          type: 'missing_public_file',
          severity: 'critical',
          description: '公共目录缺少当前简历',
          record: { version, filename, filePath },
          filePath: publicPath,
          suggestedFix: '运行同步脚本: npm run sync:files'
        })
      } else if (fs.existsSync(sourcePath)) {
        // 检查内容是否一致
        const sourceHash = await getFileHash(sourcePath)
        const publicHash = await getFileHash(publicPath)
        
        if (sourceHash !== publicHash) {
          issues.push({
            type: 'file_mismatch',
            severity: 'high',
            description: '公共目录的简历与激活版本不一致',
            record: { version, filename, filePath },
            filePath: publicPath,
            suggestedFix: '运行同步脚本: npm run sync:files'
          })
        }
      }
    }
    
    // 3. 检查孤立文件
    const resumeDir = path.join(ADMIN_FILE_ROOT, 'resume')
    if (fs.existsSync(resumeDir)) {
      const files = fs.readdirSync(resumeDir)
      
      for (const file of files) {
        const filePath = `resume/${file}`
        const checkResult = db.exec(
          'SELECT COUNT(*) as count FROM resume_versions WHERE file_path = ?',
          [filePath]
        )
        
        const count = checkResult[0]?.values?.[0]?.[0] as number || 0
        
        if (count === 0) {
          issues.push({
            type: 'orphan_file',
            severity: 'medium',
            description: `文件 ${file} 没有对应的数据库记录`,
            filePath: path.join(resumeDir, file),
            suggestedFix: '删除文件或创建数据库记录'
          })
        }
      }
    }
  } catch (error) {
    logger.error('检查简历一致性失败', { 
      error: error instanceof Error ? error.message : String(error) 
    })
  }
  
  return issues
}

/**
 * 检查音频文件的一致性
 */
function checkAudioConsistency(): Issue[] {
  const issues: Issue[] = []
  
  // 检查音频目录
  const audioDir = path.join(ADMIN_FILE_ROOT, 'audio')
  const publicAudioDir = path.join(PUBLIC_ROOT, 'audio')
  
  if (fs.existsSync(audioDir)) {
    const checkDirectory = (subDir: string) => {
      const adminSubDir = path.join(audioDir, subDir)
      const publicSubDir = path.join(publicAudioDir, subDir)
      
      if (fs.existsSync(adminSubDir)) {
        const files = fs.readdirSync(adminSubDir)
        
        for (const file of files) {
          const publicFilePath = path.join(publicSubDir, file)
          
          if (!fs.existsSync(publicFilePath)) {
            issues.push({
              type: 'missing_public_file',
              severity: 'medium',
              description: `公共目录缺少音频文件: ${subDir}/${file}`,
              filePath: publicFilePath,
              suggestedFix: '运行同步脚本: npm run sync:files'
            })
          }
        }
      }
    }
    
    // 检查 BGM 和 SFX 目录
    checkDirectory('bgm')
    checkDirectory('sfx')
  }
  
  return issues
}

/**
 * 生成一致性检查报告
 */
async function generateReport(): Promise<ConsistencyReport> {
  logger.info('开始数据一致性检查...')
  
  const allIssues: Issue[] = []
  
  // 检查简历
  const resumeIssues = await checkResumeConsistency()
  allIssues.push(...resumeIssues)
  
  // 检查音频
  const audioIssues = checkAudioConsistency()
  allIssues.push(...audioIssues)
  
  // 统计问题数量
  const report: ConsistencyReport = {
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
    highIssues: allIssues.filter(i => i.severity === 'high').length,
    mediumIssues: allIssues.filter(i => i.severity === 'medium').length,
    lowIssues: allIssues.filter(i => i.severity === 'low').length,
    issues: allIssues
  }
  
  return report
}

/**
 * 打印报告
 */
function printReport(report: ConsistencyReport): void {
  console.log('\n========== 数据一致性检查报告 ==========\n')
  
  console.log(`总问题数: ${report.totalIssues}`)
  console.log(`  - 严重 (Critical): ${report.criticalIssues}`)
  console.log(`  - 高 (High): ${report.highIssues}`)
  console.log(`  - 中 (Medium): ${report.mediumIssues}`)
  console.log(`  - 低 (Low): ${report.lowIssues}`)
  console.log()
  
  if (report.totalIssues === 0) {
    console.log('✓ 未发现数据不一致问题')
  } else {
    console.log('发现以下问题:\n')
    
    // 按严重级别分组显示
    const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low']
    
    for (const severity of severityOrder) {
      const issuesOfSeverity = report.issues.filter(i => i.severity === severity)
      
      if (issuesOfSeverity.length > 0) {
        console.log(`\n[${severity.toUpperCase()}] 级别问题:`)
        
        for (const issue of issuesOfSeverity) {
          console.log(`  - ${issue.description}`)
          if (issue.filePath) {
            console.log(`    文件路径: ${issue.filePath}`)
          }
          console.log(`    建议修复: ${issue.suggestedFix}`)
        }
      }
    }
  }
  
  console.log('\n========================================\n')
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    const report = await generateReport()
    printReport(report)
    
    // 如果有严重或高级别问题，退出码为 1
    if (report.criticalIssues > 0 || report.highIssues > 0) {
      process.exit(1)
    }
  } catch (error) {
    logger.error('一致性检查失败', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

export { generateReport, printReport }
