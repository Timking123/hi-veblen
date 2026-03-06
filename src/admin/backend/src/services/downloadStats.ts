/**
 * 下载统计服务模块
 * 统一管理简历下载统计，确保 resume_versions 表和 statistics 表的数据一致性
 * 
 * 需求: 2.1 - 从前端下载简历时增加对应版本的下载计数
 * 需求: 2.2 - 从后台下载简历时增加对应版本的下载计数
 * 需求: 2.3 - 查询简历版本列表时显示每个版本的准确下载次数
 * 需求: 2.4 - 在数据库的 resume_versions 表中持久化下载计数
 * 需求: 2.5 - 确保下载计数的原子性更新避免并发问题
 */

import { getDatabase, saveDatabase } from '../database/init'
import { createLogger } from '../utils/logger'

// 创建下载统计服务日志记录器
const logger = createLogger('downloadStats')

/**
 * 下载来源类型
 */
export type DownloadSource = 'frontend' | 'admin'

/**
 * 数据一致性检查结果
 */
export interface ConsistencyCheckResult {
  /** 是否一致 */
  consistent: boolean
  /** resume_versions 表中的总下载次数 */
  versionsTotal: number
  /** statistics 表中的总下载次数 */
  statisticsTotal: number
  /** 差异值 */
  difference: number
  /** 错误信息 */
  error?: string
}

/**
 * 记录简历下载（事务性更新两个表）
 * 需求: 2.1, 2.2, 2.4, 2.5 - 原子性更新 resume_versions 和 statistics 表
 * 
 * @param version - 简历版本号
 * @param source - 下载来源 ('frontend' | 'admin')
 * @returns Promise<void>
 */
export async function recordResumeDownload(version: number, source: DownloadSource): Promise<void> {
  const db = getDatabase()
  
  try {
    // 开始事务
    db.run('BEGIN TRANSACTION')
    
    // 1. 检查版本是否存在
    const checkResult = db.exec(
      'SELECT id FROM resume_versions WHERE version = ?',
      [version]
    )
    
    if (checkResult.length === 0 || !checkResult[0]?.values || checkResult[0].values.length === 0) {
      throw new Error(`简历版本 ${version} 不存在`)
    }
    
    // 2. 更新 resume_versions 表的下载计数
    db.run(
      'UPDATE resume_versions SET download_count = download_count + 1 WHERE version = ?',
      [version]
    )
    
    // 3. 更新 statistics 表的总下载计数
    db.run(
      'UPDATE statistics SET resume_downloads = resume_downloads + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
    )
    
    // 4. 提交事务
    db.run('COMMIT')
    
    // 5. 保存数据库
    saveDatabase()
    
    logger.info('记录简历下载成功', { version, source })
  } catch (error) {
    // 回滚事务
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      logger.error('回滚事务失败', { 
        error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError) 
      })
    }
    
    logger.error('记录简历下载失败', { 
      version, 
      source, 
      error: error instanceof Error ? error.message : String(error) 
    })
    throw error
  }
}

/**
 * 获取简历总下载次数
 * 需求: 2.3 - 查询简历版本列表时显示准确的下载次数
 * 
 * @returns Promise<number> 总下载次数
 */
export async function getTotalResumeDownloads(): Promise<number> {
  const db = getDatabase()
  
  try {
    const result = db.exec('SELECT resume_downloads FROM statistics WHERE id = 1')
    
    if (result.length > 0 && result[0]?.values?.[0]) {
      const total = result[0].values[0][0]
      return typeof total === 'number' ? total : 0
    }
    
    return 0
  } catch (error) {
    logger.error('获取简历总下载次数失败', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    return 0
  }
}

/**
 * 获取指定版本的下载次数
 * 需求: 2.3 - 查询简历版本列表时显示每个版本的准确下载次数
 * 
 * @param version - 简历版本号
 * @returns Promise<number> 下载次数
 */
export async function getVersionDownloads(version: number): Promise<number> {
  const db = getDatabase()
  
  try {
    const result = db.exec(
      'SELECT download_count FROM resume_versions WHERE version = ?',
      [version]
    )
    
    if (result.length > 0 && result[0]?.values?.[0]) {
      const count = result[0].values[0][0]
      return typeof count === 'number' ? count : 0
    }
    
    return 0
  } catch (error) {
    logger.error('获取版本下载次数失败', { 
      version, 
      error: error instanceof Error ? error.message : String(error) 
    })
    return 0
  }
}

/**
 * 检查数据一致性
 * 验证 resume_versions 表和 statistics 表的下载统计是否一致
 * 
 * @returns Promise<ConsistencyCheckResult> 一致性检查结果
 */
export async function checkStatsConsistency(): Promise<ConsistencyCheckResult> {
  const db = getDatabase()
  
  try {
    // 1. 获取 resume_versions 表中所有版本的下载次数总和
    const versionsResult = db.exec(
      'SELECT SUM(download_count) as total FROM resume_versions'
    )
    
    let versionsTotal = 0
    if (versionsResult.length > 0 && versionsResult[0]?.values?.[0]) {
      const total = versionsResult[0].values[0][0]
      versionsTotal = typeof total === 'number' ? total : 0
    }
    
    // 2. 获取 statistics 表中的总下载次数
    const statisticsResult = db.exec(
      'SELECT resume_downloads FROM statistics WHERE id = 1'
    )
    
    let statisticsTotal = 0
    if (statisticsResult.length > 0 && statisticsResult[0]?.values?.[0]) {
      const total = statisticsResult[0].values[0][0]
      statisticsTotal = typeof total === 'number' ? total : 0
    }
    
    // 3. 计算差异
    const difference = Math.abs(versionsTotal - statisticsTotal)
    const consistent = difference === 0
    
    if (!consistent) {
      logger.warn('下载统计数据不一致', { 
        versionsTotal, 
        statisticsTotal, 
        difference 
      })
    }
    
    return {
      consistent,
      versionsTotal,
      statisticsTotal,
      difference
    }
  } catch (error) {
    logger.error('检查数据一致性失败', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    return {
      consistent: false,
      versionsTotal: 0,
      statisticsTotal: 0,
      difference: 0,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * 修复数据一致性
 * 将 statistics 表的总下载次数同步为 resume_versions 表的总和
 * 
 * @returns Promise<boolean> 是否修复成功
 */
export async function repairStatsConsistency(): Promise<boolean> {
  const db = getDatabase()
  
  try {
    // 开始事务
    db.run('BEGIN TRANSACTION')
    
    // 1. 计算 resume_versions 表中所有版本的下载次数总和
    const versionsResult = db.exec(
      'SELECT SUM(download_count) as total FROM resume_versions'
    )
    
    let versionsTotal = 0
    if (versionsResult.length > 0 && versionsResult[0]?.values?.[0]) {
      const total = versionsResult[0].values[0][0]
      versionsTotal = typeof total === 'number' ? total : 0
    }
    
    // 2. 更新 statistics 表的总下载次数
    db.run(
      'UPDATE statistics SET resume_downloads = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [versionsTotal]
    )
    
    // 3. 提交事务
    db.run('COMMIT')
    
    // 4. 保存数据库
    saveDatabase()
    
    logger.info('修复数据一致性成功', { versionsTotal })
    return true
  } catch (error) {
    // 回滚事务
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      logger.error('回滚事务失败', { 
        error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError) 
      })
    }
    
    logger.error('修复数据一致性失败', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    return false
  }
}
