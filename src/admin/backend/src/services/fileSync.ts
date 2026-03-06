/**
 * 文件同步服务模块
 * 负责在后台文件目录和前端公共目录之间同步文件
 * 
 * 需求: 1.1 - 简历文件使用统一的存储路径
 * 需求: 1.3 - 后台设置当前简历时更新前端可访问的位置
 * 需求: 4.1 - 后台上传新简历并设置为当前版本时将文件复制到前端可访问的公共目录
 * 需求: 4.2 - 后台切换当前简历版本时更新前端公共目录中的简历文件
 * 需求: 4.5 - 确保文件复制操作的原子性避免部分更新
 */

import path from 'path'
import fs from 'fs'
import { getDatabase } from '../database/init'
import { createLogger } from '../utils/logger'

// 创建文件同步服务日志记录器
const logger = createLogger('fileSync')

// ========== 路径常量 ==========

/** 后台文件存储根目录 */
const ADMIN_FILE_ROOT = path.resolve(__dirname, '../../file')

/** 前端公共目录根路径 */
const PUBLIC_ROOT = path.resolve(__dirname, '../../../../public')

// ========== 类型定义 ==========

/**
 * 同步结果接口
 */
export interface SyncResult {
  success: boolean
  sourcePath?: string
  targetPath?: string
  error?: string
}

/**
 * 清理结果接口
 */
export interface CleanupResult {
  success: boolean
  filesRemoved: number
  error?: string
}

/**
 * 文件同步日志记录接口
 */
interface FileSyncLog {
  operation: 'sync' | 'delete' | 'cleanup'
  sourcePath: string
  targetPath?: string
  fileType: 'resume' | 'audio' | 'image'
  status: 'success' | 'failed'
  errorMessage?: string
}

// ========== 文件同步服务类 ==========

/**
 * 文件同步服务类
 * 提供文件在后台目录和公共目录之间同步的核心功能
 */
export class FileSyncService {
  /**
   * 同步当前激活的简历到公共目录
   * 使用临时文件 + 原子重命名确保原子性
   * 
   * 需求: 1.3, 4.1, 4.2, 4.5
   * 
   * @returns 同步结果
   */
  async syncActiveResumeToPublic(): Promise<SyncResult> {
    try {
      // 1. 获取当前激活的简历版本
      const db = getDatabase()
      const result = db.exec(`
        SELECT version, filename, file_path 
        FROM resume_versions 
        WHERE is_active = 1
      `)

      if (result.length === 0 || !result[0].values || result[0].values.length === 0) {
        logger.warn('没有激活的简历版本')
        return {
          success: false,
          error: '没有激活的简历版本'
        }
      }

      const [version, filename, filePath] = result[0].values[0]
      const sourcePath = path.join(ADMIN_FILE_ROOT, filePath as string)
      const targetPath = path.join(PUBLIC_ROOT, 'resume.pdf')
      const tempPath = path.join(PUBLIC_ROOT, `.resume.pdf.tmp.${Date.now()}`)

      // 2. 验证源文件存在
      if (!fs.existsSync(sourcePath)) {
        const error = `源文件不存在: ${sourcePath}`
        logger.error('简历同步失败', { error, version, filePath })
        await this.logFileSync({
          operation: 'sync',
          sourcePath,
          targetPath,
          fileType: 'resume',
          status: 'failed',
          errorMessage: error
        })
        return {
          success: false,
          sourcePath,
          targetPath,
          error
        }
      }

      // 3. 确保公共目录存在
      const publicDir = path.dirname(targetPath)
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }

      // 4. 复制到临时文件
      fs.copyFileSync(sourcePath, tempPath)

      // 5. 原子重命名（覆盖旧文件）
      fs.renameSync(tempPath, targetPath)

      // 6. 记录同步日志
      await this.logFileSync({
        operation: 'sync',
        sourcePath,
        targetPath,
        fileType: 'resume',
        status: 'success'
      })

      logger.info('简历同步成功', {
        version,
        filename,
        sourcePath,
        targetPath
      })

      return {
        success: true,
        sourcePath,
        targetPath
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('简历同步失败', { error: errorMessage })
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * 同步音频文件到公共目录
   * 支持符号链接和文件复制（根据操作系统）
   * 
   * 需求: 5.1, 5.2
   * 
   * @param audioPath 音频文件相对路径（相对于 ADMIN_FILE_ROOT）
   * @returns 同步结果
   */
  async syncAudioToPublic(audioPath: string): Promise<SyncResult> {
    try {
      const sourcePath = path.join(ADMIN_FILE_ROOT, audioPath)
      const targetPath = path.join(PUBLIC_ROOT, audioPath)

      // 1. 验证源文件存在
      if (!fs.existsSync(sourcePath)) {
        const error = `源文件不存在: ${sourcePath}`
        logger.error('音频同步失败', { error, audioPath })
        await this.logFileSync({
          operation: 'sync',
          sourcePath,
          targetPath,
          fileType: 'audio',
          status: 'failed',
          errorMessage: error
        })
        return {
          success: false,
          sourcePath,
          targetPath,
          error
        }
      }

      // 2. 确保目标目录存在
      const targetDir = path.dirname(targetPath)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // 3. 如果目标文件已存在，先删除
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath)
      }

      // 4. 尝试创建符号链接（Linux/Mac），失败则使用复制（Windows）
      try {
        fs.symlinkSync(sourcePath, targetPath)
        logger.info('音频同步成功（符号链接）', { audioPath, sourcePath, targetPath })
      } catch (symlinkError) {
        // 符号链接失败，使用文件复制
        fs.copyFileSync(sourcePath, targetPath)
        logger.info('音频同步成功（文件复制）', { audioPath, sourcePath, targetPath })
      }

      // 5. 记录同步日志
      await this.logFileSync({
        operation: 'sync',
        sourcePath,
        targetPath,
        fileType: 'audio',
        status: 'success'
      })

      return {
        success: true,
        sourcePath,
        targetPath
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('音频同步失败', { error: errorMessage, audioPath })
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * 清理公共目录中的过期文件
   * 
   * @returns 清理结果
   */
  async cleanupPublicDirectory(): Promise<CleanupResult> {
    try {
      let filesRemoved = 0

      // 1. 清理临时文件（.tmp 文件）
      const publicDir = PUBLIC_ROOT
      if (fs.existsSync(publicDir)) {
        const files = fs.readdirSync(publicDir)
        
        for (const file of files) {
          if (file.endsWith('.tmp')) {
            const filePath = path.join(publicDir, file)
            try {
              fs.unlinkSync(filePath)
              filesRemoved++
              logger.info('清理临时文件', { file: filePath })
            } catch (error) {
              logger.warn('清理临时文件失败', { 
                file: filePath, 
                error: error instanceof Error ? error.message : String(error)
              })
            }
          }
        }
      }

      // 2. 记录清理日志
      await this.logFileSync({
        operation: 'cleanup',
        sourcePath: publicDir,
        fileType: 'resume',
        status: 'success'
      })

      logger.info('公共目录清理完成', { filesRemoved })

      return {
        success: true,
        filesRemoved
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('公共目录清理失败', { error: errorMessage })
      
      return {
        success: false,
        filesRemoved: 0,
        error: errorMessage
      }
    }
  }

  /**
   * 记录文件同步日志到数据库
   * 
   * @param log 同步日志记录
   */
  private async logFileSync(log: FileSyncLog): Promise<void> {
    try {
      const db = getDatabase()
      
      // 确保 file_sync_log 表存在
      db.run(`
        CREATE TABLE IF NOT EXISTS file_sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation TEXT NOT NULL,
          source_path TEXT NOT NULL,
          target_path TEXT,
          file_type TEXT NOT NULL,
          status TEXT NOT NULL,
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // 插入日志记录
      db.run(`
        INSERT INTO file_sync_log (operation, source_path, target_path, file_type, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        log.operation,
        log.sourcePath,
        log.targetPath || null,
        log.fileType,
        log.status,
        log.errorMessage || null
      ])
    } catch (error) {
      // 日志记录失败不应该影响主流程
      logger.error('记录文件同步日志失败', { 
        error: error instanceof Error ? error.message : String(error),
        log
      })
    }
  }
}

// ========== 导出单例实例 ==========

/** 文件同步服务单例实例 */
export const fileSyncService = new FileSyncService()
