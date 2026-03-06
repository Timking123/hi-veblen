/**
 * 备份管理路由模块
 * 提供数据库备份的手动触发和列表查询功能
 * 
 * 路由列表:
 * - POST /create - 手动触发备份
 * - GET /list - 获取备份列表
 * 
 * 需求: 7.5 - 提供手动触发备份的 API 接口
 */

import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getBackupSystem } from '../services/backup'

const router = Router()

/**
 * POST /create
 * 手动触发数据库备份
 * 需要认证: 是
 * 
 * 响应格式:
 * {
 *   success: boolean,
 *   message: string,
 *   data?: {
 *     path: string,
 *     size: number
 *   },
 *   error?: string
 * }
 */
router.post('/create', authMiddleware, (_req: Request, res: Response) => {
  try {
    console.log('[备份API] 收到手动备份请求')
    
    const backupSystem = getBackupSystem()
    const result = backupSystem.createBackup()

    if (result.success) {
      res.json({
        success: true,
        message: '备份创建成功',
        data: {
          path: result.path!,
          size: result.size!
        }
      })
    } else {
      res.status(500).json({
        success: false,
        message: '备份创建失败',
        error: result.error
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[备份API] 手动备份失败:', errorMessage)
    
    res.status(500).json({
      success: false,
      message: '备份创建失败',
      error: errorMessage
    })
  }
})

/**
 * GET /list
 * 获取备份文件列表
 * 需要认证: 是
 * 
 * 响应格式:
 * {
 *   success: boolean,
 *   data: Array<{
 *     filename: string,
 *     size: number,
 *     createdAt: string (ISO 8601)
 *   }>
 * }
 */
router.get('/list', authMiddleware, (_req: Request, res: Response) => {
  try {
    const backupSystem = getBackupSystem()
    const backups = backupSystem.listBackups()

    // 转换日期为 ISO 8601 字符串
    const backupsData = backups.map(backup => ({
      filename: backup.filename,
      size: backup.size,
      createdAt: backup.createdAt.toISOString()
    }))

    res.json({
      success: true,
      data: backupsData
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[备份API] 获取备份列表失败:', errorMessage)
    
    res.status(500).json({
      success: false,
      message: '获取备份列表失败',
      error: errorMessage
    })
  }
})

export default router
