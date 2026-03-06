/**
 * 数据库迁移脚本：创建 file_sync_log 表
 * 用于记录文件同步操作的审计日志
 * 
 * 需求: 8.4, 15.1 - 提供数据一致性检查工具
 */

import { Database as SqlJsDatabase } from 'sql.js'

/**
 * 执行迁移：创建 file_sync_log 表
 * @param db 数据库实例
 */
export function up(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS file_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,          -- 操作类型: 'sync' | 'delete' | 'cleanup'
      source_path TEXT NOT NULL,        -- 源文件路径
      target_path TEXT,                 -- 目标文件路径
      file_type TEXT NOT NULL,          -- 文件类型: 'resume' | 'audio' | 'image'
      status TEXT NOT NULL,             -- 状态: 'success' | 'failed'
      error_message TEXT,               -- 错误信息
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // 创建索引以提高查询性能
  db.run(`CREATE INDEX IF NOT EXISTS idx_file_sync_log_created_at ON file_sync_log(created_at)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_file_sync_log_status ON file_sync_log(status)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_file_sync_log_file_type ON file_sync_log(file_type)`)
  
  console.log('✓ 迁移成功: 创建 file_sync_log 表')
}

/**
 * 回滚迁移：删除 file_sync_log 表
 * @param db 数据库实例
 */
export function down(db: SqlJsDatabase): void {
  db.run('DROP TABLE IF EXISTS file_sync_log')
  console.log('✓ 回滚成功: 删除 file_sync_log 表')
}
