/**
 * 数据库配置文件
 * 包含数据库路径和连接配置
 */

import path from 'path'

/**
 * 数据库配置接口
 */
export interface DatabaseConfig {
  /** 数据库文件路径 */
  path: string
  /** 是否启用 WAL 模式（提升并发性能） */
  walMode: boolean
  /** 是否启用外键约束 */
  foreignKeys: boolean
  /** 是否启用详细日志 */
  verbose: boolean
}

/**
 * 获取数据库文件路径
 * 根据环境变量或默认路径返回数据库文件位置
 */
export function getDatabasePath(): string {
  // 优先使用环境变量指定的路径
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH
  }
  
  // 默认路径：admin/backend/data/admin.db
  return path.resolve(__dirname, '../../data/admin.db')
}

/**
 * 获取测试数据库文件路径
 * 用于单元测试和集成测试
 */
export function getTestDatabasePath(): string {
  if (process.env.TEST_DATABASE_PATH) {
    return process.env.TEST_DATABASE_PATH
  }
  
  // 测试数据库使用内存数据库或临时文件
  return ':memory:'
}

/**
 * 数据库配置
 * 根据环境返回相应的配置
 */
export const databaseConfig: DatabaseConfig = {
  path: process.env.NODE_ENV === 'test' ? getTestDatabasePath() : getDatabasePath(),
  walMode: process.env.NODE_ENV !== 'test', // 测试环境不使用 WAL 模式
  foreignKeys: true,
  verbose: process.env.NODE_ENV === 'development'
}

export default databaseConfig
