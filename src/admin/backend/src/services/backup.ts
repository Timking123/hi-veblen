/**
 * 数据库备份服务
 * 提供 SQLite 数据库的自动备份和手动备份功能
 * 
 * 需求: 7.1 - 每 24 小时自动创建一次数据库备份文件
 * 需求: 7.2 - 保留最近 7 个备份文件，自动删除更早的备份
 * 需求: 7.3 - 备份操作完成时记录备份文件路径和大小到日志
 * 需求: 7.4 - 备份操作失败时记录错误日志并在下一个备份周期重试
 * 需求: 7.5 - 提供手动触发备份的 API 接口
 */

import fs from 'fs'
import path from 'path'
import { getDatabase } from '../database/init'
import { createLogger } from '../utils/logger'

// 创建备份服务日志记录器
const logger = createLogger('backup')

/**
 * 备份结果接口
 */
export interface BackupResult {
  success: boolean
  path?: string
  size?: number
  error?: string
}

/**
 * 备份文件信息接口
 */
export interface BackupInfo {
  filename: string
  size: number
  createdAt: Date
}

/**
 * 数据库备份系统类
 * 负责管理 SQLite 数据库的自动备份和手动备份
 */
export class BackupSystem {
  private backupDir: string
  private maxBackups: number = 7
  private intervalMs: number = 24 * 60 * 60 * 1000  // 24小时
  private timer: NodeJS.Timeout | null = null

  /**
   * 构造函数
   * @param backupDir - 备份文件存储目录
   */
  constructor(backupDir: string) {
    this.backupDir = backupDir
    
    // 确保备份目录存在
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
      logger.info('备份目录已创建', { backupDir: this.backupDir })
    }
  }

  /**
   * 启动自动备份定时器
   * 需求: 7.1 - 每 24 小时自动创建一次数据库备份文件
   */
  start(): void {
    if (this.timer) {
      logger.warn('自动备份已在运行中')
      return
    }

    logger.info('启动自动备份系统', {
      intervalHours: this.intervalMs / 1000 / 60 / 60,
      maxBackups: this.maxBackups
    })

    // 立即执行一次备份
    this.createBackup()

    // 设置定时器
    this.timer = setInterval(() => {
      this.createBackup()
    }, this.intervalMs)
  }

  /**
   * 停止自动备份定时器
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      logger.info('自动备份系统已停止')
    }
  }

  /**
   * 创建数据库备份
   * 需求: 7.3 - 备份操作完成时记录备份文件路径和大小到日志
   * 需求: 7.4 - 备份操作失败时记录错误日志并在下一个备份周期重试
   * 
   * @returns BackupResult - 备份结果
   */
  createBackup(): BackupResult {
    try {
      logger.info('开始创建数据库备份...')

      // 获取数据库实例
      const db = getDatabase()

      // 生成备份文件名：admin_YYYY-MM-DD_HHmmss.db
      const now = new Date()
      const filename = this.generateBackupFilename(now)
      const backupPath = path.join(this.backupDir, filename)

      // 导出数据库数据
      const data = db.export()
      const buffer = Buffer.from(data)

      // 写入备份文件
      fs.writeFileSync(backupPath, buffer)

      // 获取文件大小
      const stats = fs.statSync(backupPath)
      const size = stats.size

      // 记录成功日志
      logger.info('备份创建成功', {
        path: backupPath,
        size: this.formatFileSize(size)
      })

      // 清理旧备份
      this.cleanOldBackups()

      return {
        success: true,
        path: backupPath,
        size
      }
    } catch (error) {
      // 记录错误日志
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('备份创建失败，将在下一个备份周期重试', { error: errorMessage })

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * 清理旧备份文件
   * 需求: 7.2 - 保留最近 7 个备份文件，自动删除更早的备份
   */
  private cleanOldBackups(): void {
    try {
      const backups = this.listBackups()

      // 如果备份数量超过限制，删除最旧的备份
      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups)
        
        logger.info('清理旧备份', { count: toDelete.length })

        for (const backup of toDelete) {
          const filePath = path.join(this.backupDir, backup.filename)
          fs.unlinkSync(filePath)
          logger.debug('已删除旧备份', { filename: backup.filename })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('清理旧备份失败', { error: errorMessage })
    }
  }

  /**
   * 获取备份文件列表
   * 按创建时间降序排序（最新的在前）
   * 
   * @returns BackupInfo[] - 备份文件信息列表
   */
  listBackups(): BackupInfo[] {
    try {
      // 读取备份目录
      const files = fs.readdirSync(this.backupDir)

      // 过滤出备份文件（匹配 admin_YYYY-MM-DD_HHmmss_SSS.db 格式）
      const backupFiles = files.filter(file => 
        /^admin_\d{4}-\d{2}-\d{2}_\d{6}_\d{3}\.db$/.test(file)
      )

      // 获取文件信息
      const backups: BackupInfo[] = backupFiles.map(filename => {
        const filePath = path.join(this.backupDir, filename)
        const stats = fs.statSync(filePath)
        
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime
        }
      })

      // 按创建时间降序排序（最新的在前）
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      return backups
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('获取备份列表失败', { error: errorMessage })
      return []
    }
  }

  /**
   * 生成备份文件名
   * 格式：admin_YYYY-MM-DD_HHmmss_SSS.db（包含毫秒）
   * 
   * @param date - 日期对象
   * @returns string - 备份文件名
   */
  private generateBackupFilename(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0')

    return `admin_${year}-${month}-${day}_${hours}${minutes}${seconds}_${milliseconds}.db`
  }

  /**
   * 格式化文件大小
   * 
   * @param bytes - 字节数
   * @returns string - 格式化后的文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`
    } else {
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    }
  }
}

// 导出单例实例
let backupSystemInstance: BackupSystem | null = null

/**
 * 获取备份系统单例实例
 * 
 * @param backupDir - 备份目录（可选，首次调用时必须提供）
 * @returns BackupSystem - 备份系统实例
 */
export function getBackupSystem(backupDir?: string): BackupSystem {
  if (!backupSystemInstance) {
    if (!backupDir) {
      // 默认备份目录
      backupDir = path.resolve(__dirname, '../../data/backups')
    }
    backupSystemInstance = new BackupSystem(backupDir)
  }
  return backupSystemInstance
}

/**
 * 重置备份系统单例（仅用于测试）
 */
export function resetBackupSystem(): void {
  if (backupSystemInstance) {
    backupSystemInstance.stop()
    backupSystemInstance = null
  }
}
