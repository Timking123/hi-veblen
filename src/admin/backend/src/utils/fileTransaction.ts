/**
 * 文件操作事务管理器
 * 确保文件操作和数据库操作的原子性
 */

import * as fs from 'fs-extra'
import * as path from 'path'
import { Logger } from './logger'

const logger = new Logger('FileTransaction')

export interface FileOperation {
  type: 'create' | 'update' | 'delete' | 'copy'
  path: string
  backupPath?: string
  content?: Buffer
  sourcePath?: string // 用于 copy 操作
}

export interface TransactionResult {
  success: boolean
  completedOperations: FileOperation[]
  error?: string
}

/**
 * 文件事务管理器类
 */
export class FileTransactionManager {
  private backupDir: string
  private transactionId: string
  
  constructor(backupDir: string = '.file-transaction-backup') {
    this.backupDir = backupDir
    this.transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }
  
  /**
   * 执行文件事务
   * @param operations 文件操作列表
   * @param dbOperations 数据库操作函数
   * @returns 事务结果
   */
  async executeTransaction(
    operations: FileOperation[],
    dbOperations: () => Promise<void>
  ): Promise<TransactionResult> {
    const completedOperations: FileOperation[] = []
    
    try {
      // 确保备份目录存在
      await fs.ensureDir(this.backupDir)
      
      // 1. 执行文件操作（带备份）
      for (const operation of operations) {
        await this.executeFileOperation(operation)
        completedOperations.push(operation)
      }
      
      // 2. 执行数据库操作
      await dbOperations()
      
      // 3. 清理备份
      await this.cleanupBackup()
      
      logger.info('文件事务执行成功', {
        transactionId: this.transactionId,
        operationCount: operations.length
      })
      
      return {
        success: true,
        completedOperations
      }
    } catch (error) {
      // 回滚文件操作
      logger.error('文件事务失败，开始回滚', {
        transactionId: this.transactionId,
        error: error instanceof Error ? error.message : String(error),
        completedOperations: completedOperations.length
      })
      
      await this.rollback(completedOperations)
      
      return {
        success: false,
        completedOperations,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  /**
   * 执行单个文件操作
   * @param operation 文件操作
   */
  private async executeFileOperation(operation: FileOperation): Promise<void> {
    const { type, path: filePath, content, sourcePath } = operation
    
    switch (type) {
      case 'create':
        // 创建文件前备份（如果已存在）
        if (await fs.pathExists(filePath)) {
          operation.backupPath = await this.backupFile(filePath)
        }
        
        // 确保目录存在
        await fs.ensureDir(path.dirname(filePath))
        
        // 写入文件
        if (content) {
          await fs.writeFile(filePath, content)
        }
        break
        
      case 'update':
        // 更新文件前备份
        if (await fs.pathExists(filePath)) {
          operation.backupPath = await this.backupFile(filePath)
        }
        
        // 写入新内容
        if (content) {
          await fs.writeFile(filePath, content)
        }
        break
        
      case 'delete':
        // 删除文件前备份
        if (await fs.pathExists(filePath)) {
          operation.backupPath = await this.backupFile(filePath)
          await fs.remove(filePath)
        }
        break
        
      case 'copy':
        // 复制文件前备份目标（如果已存在）
        if (await fs.pathExists(filePath)) {
          operation.backupPath = await this.backupFile(filePath)
        }
        
        // 确保目录存在
        await fs.ensureDir(path.dirname(filePath))
        
        // 复制文件（使用临时文件 + 原子重命名）
        if (sourcePath) {
          const tempPath = `${filePath}.tmp.${Date.now()}`
          await fs.copyFile(sourcePath, tempPath)
          await fs.rename(tempPath, filePath)
        }
        break
    }
    
    logger.debug('文件操作执行成功', {
      transactionId: this.transactionId,
      type,
      path: filePath
    })
  }
  
  /**
   * 备份文件
   * @param filePath 文件路径
   * @returns 备份文件路径
   */
  private async backupFile(filePath: string): Promise<string> {
    const backupPath = path.join(
      this.backupDir,
      this.transactionId,
      filePath.replace(/[/\\:]/g, '_')
    )
    
    await fs.ensureDir(path.dirname(backupPath))
    await fs.copyFile(filePath, backupPath)
    
    logger.debug('文件备份成功', {
      transactionId: this.transactionId,
      originalPath: filePath,
      backupPath
    })
    
    return backupPath
  }
  
  /**
   * 回滚文件操作
   * @param operations 已执行的操作列表
   */
  async rollback(operations: FileOperation[]): Promise<void> {
    // 反向执行回滚
    for (let i = operations.length - 1; i >= 0; i--) {
      const operation = operations[i]
      
      if (!operation) {
        continue
      }
      
      try {
        await this.rollbackOperation(operation)
      } catch (error) {
        logger.error('回滚操作失败', {
          transactionId: this.transactionId,
          operation: operation.type,
          path: operation.path,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
    
    logger.info('文件事务回滚完成', {
      transactionId: this.transactionId,
      operationCount: operations.length
    })
  }
  
  /**
   * 回滚单个操作
   * @param operation 文件操作
   */
  private async rollbackOperation(operation: FileOperation): Promise<void> {
    const { type, path: filePath, backupPath } = operation
    
    switch (type) {
      case 'create':
        // 删除创建的文件
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath)
        }
        
        // 如果有备份，恢复原文件
        if (backupPath && await fs.pathExists(backupPath)) {
          await fs.copyFile(backupPath, filePath)
        }
        break
        
      case 'update':
      case 'copy':
        // 恢复备份
        if (backupPath && await fs.pathExists(backupPath)) {
          await fs.copyFile(backupPath, filePath)
        }
        break
        
      case 'delete':
        // 恢复删除的文件
        if (backupPath && await fs.pathExists(backupPath)) {
          await fs.ensureDir(path.dirname(filePath))
          await fs.copyFile(backupPath, filePath)
        }
        break
    }
    
    logger.debug('操作回滚成功', {
      transactionId: this.transactionId,
      type,
      path: filePath
    })
  }
  
  /**
   * 清理备份文件
   */
  private async cleanupBackup(): Promise<void> {
    const transactionBackupDir = path.join(this.backupDir, this.transactionId)
    
    if (await fs.pathExists(transactionBackupDir)) {
      await fs.remove(transactionBackupDir)
      
      logger.debug('事务备份清理成功', {
        transactionId: this.transactionId
      })
    }
  }
}

/**
 * 创建文件事务管理器实例
 * @param backupDir 备份目录
 * @returns 文件事务管理器实例
 */
export function createFileTransaction(backupDir?: string): FileTransactionManager {
  return new FileTransactionManager(backupDir)
}
