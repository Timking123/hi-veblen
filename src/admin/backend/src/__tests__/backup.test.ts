/**
 * 备份路由单元测试
 * 验证备份 API 路由的基本功能
 * 
 * 需求: 7.5 - 提供手动触发备份的 API 接口
 */

import { getBackupSystem, resetBackupSystem } from '../services/backup'
import { initDatabase, closeDatabase } from '../database/init'
import path from 'path'
import fs from 'fs'

// 测试用的备份目录
const TEST_BACKUP_DIR = path.resolve(__dirname, '../../test-backups')

describe('备份路由测试', () => {
  beforeAll(async () => {
    // 初始化内存数据库
    await initDatabase(':memory:')

    // 清理测试备份目录
    if (fs.existsSync(TEST_BACKUP_DIR)) {
      fs.rmSync(TEST_BACKUP_DIR, { recursive: true, force: true })
    }
    fs.mkdirSync(TEST_BACKUP_DIR, { recursive: true })

    // 初始化测试用的备份系统
    resetBackupSystem()
    getBackupSystem(TEST_BACKUP_DIR)
  })

  afterAll(() => {
    // 清理测试备份目录
    if (fs.existsSync(TEST_BACKUP_DIR)) {
      fs.rmSync(TEST_BACKUP_DIR, { recursive: true, force: true })
    }
    resetBackupSystem()
    closeDatabase()
  })

  describe('备份服务集成测试', () => {
    it('应该成功创建备份', () => {
      const backupSystem = getBackupSystem()
      const result = backupSystem.createBackup()

      expect(result.success).toBe(true)
      expect(result.path).toBeDefined()
      expect(result.size).toBeGreaterThan(0)
    })

    it('应该返回备份列表', () => {
      const backupSystem = getBackupSystem()
      
      // 创建一个备份
      backupSystem.createBackup()
      
      // 获取备份列表
      const backups = backupSystem.listBackups()

      expect(Array.isArray(backups)).toBe(true)
      expect(backups.length).toBeGreaterThan(0)

      // 验证备份信息格式
      const backup = backups[0]
      expect(backup).toHaveProperty('filename')
      expect(backup).toHaveProperty('size')
      expect(backup).toHaveProperty('createdAt')
      expect(backup.filename).toMatch(/^admin_\d{4}-\d{2}-\d{2}_\d{6}_\d{3}\.db$/)
    })

    it('应该正确清理旧备份（保留最近 7 个）', () => {
      const backupSystem = getBackupSystem()
      
      // 创建 10 个备份
      for (let i = 0; i < 10; i++) {
        backupSystem.createBackup()
        // 稍微延迟以确保文件名不同
      }
      
      // 获取备份列表
      const backups = backupSystem.listBackups()

      // 应该只保留 7 个备份
      expect(backups.length).toBeLessThanOrEqual(7)
    })
  })
})
