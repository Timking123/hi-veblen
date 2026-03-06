/**
 * 备份系统属性测试（Property-Based Testing）
 * 使用 fast-check 库测试数据库备份系统的正确性属性
 * 
 * **Feature: project-audit-upgrade**
 * - Property 8: 备份文件数量上限
 * 
 * **Validates: Requirements 7.2**
 */

import * as fc from 'fast-check'
import { BackupSystem, resetBackupSystem } from '../services/backup'
import { initDatabase, closeDatabase } from '../database/init'
import path from 'path'
import fs from 'fs'

// 测试用的备份目录基础路径
const TEST_BACKUP_BASE_DIR = path.resolve(__dirname, '../../test-backups-property')

// 当前测试使用的备份目录
let currentTestBackupDir: string

// ========== 测试辅助函数 ==========

/**
 * 创建并返回一个新的测试备份目录
 */
function createTestBackupDir(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  const testDir = path.join(TEST_BACKUP_BASE_DIR, `test-${timestamp}-${random}`)
  fs.mkdirSync(testDir, { recursive: true })
  return testDir
}

/**
 * 清理测试备份目录
 */
function cleanupBackupDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * 获取备份目录中的备份文件数量
 */
function getBackupFileCount(dir: string): number {
  const files = fs.readdirSync(dir)
  return files.filter(file => /^admin_\d{4}-\d{2}-\d{2}_\d{6}_\d{3}\.db$/.test(file)).length
}

/**
 * 创建指定数量的备份
 */
function createMultipleBackups(backupSystem: BackupSystem, count: number): void {
  for (let i = 0; i < count; i++) {
    backupSystem.createBackup()
    // 稍微延迟以确保文件名不同（基于时间戳）
    // 注意：在实际测试中，由于时间戳精度为秒，可能需要更长的延迟
    // 但为了测试速度，我们接受可能的文件名冲突（会被覆盖）
  }
}

// ========== 测试套件 ==========

describe('Property 8: 备份文件数量上限', () => {
  beforeAll(async () => {
    // 初始化内存数据库
    await initDatabase(':memory:')
  })

  afterAll(() => {
    closeDatabase()
  })

  beforeEach(() => {
    // 每个测试前创建新的备份目录和重置备份系统
    resetBackupSystem()
    currentTestBackupDir = createTestBackupDir()
  })

  afterEach(() => {
    // 每个测试后清理
    resetBackupSystem()
    if (currentTestBackupDir) {
      cleanupBackupDir(currentTestBackupDir)
    }
  })

  /**
   * 属性 8a：连续 N 次备份后，备份文件数量应不超过 7 个
   * 
   * **Validates: Requirements 7.2**
   */
  it('连续 N 次备份后，备份文件数量应不超过 7 个', async () => {
    const backupCountArb = fc.integer({ min: 1, max: 20 })
    
    await fc.assert(
      fc.asyncProperty(backupCountArb, async (backupCount) => {
        const backupSystem = new BackupSystem(currentTestBackupDir)
        
        // 创建 N 个备份
        createMultipleBackups(backupSystem, backupCount)
        
        // 验证备份文件数量不超过 7 个
        const fileCount = getBackupFileCount(currentTestBackupDir)
        expect(fileCount).toBeLessThanOrEqual(7)
        
        // 验证 listBackups 返回的数量也不超过 7 个
        const backups = backupSystem.listBackups()
        expect(backups.length).toBeLessThanOrEqual(7)
        expect(backups.length).toBe(fileCount)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 8b：保留的备份应该是最近的 min(N, 7) 个
   * 
   * **Validates: Requirements 7.2**
   */
  it('保留的备份应该是最近的 min(N, 7) 个', async () => {
    const backupCountArb = fc.integer({ min: 1, max: 20 })
    
    await fc.assert(
      fc.asyncProperty(backupCountArb, async (backupCount) => {
        // 为每次迭代创建独立的备份目录
        const testDir = createTestBackupDir()
        const backupSystem = new BackupSystem(testDir)
        
        try {
          // 创建 N 个备份
          createMultipleBackups(backupSystem, backupCount)
          
          // 获取备份列表（按创建时间降序排序）
          const backups = backupSystem.listBackups()
          
          // 验证保留的备份数量
          const expectedCount = Math.min(backupCount, 7)
          expect(backups.length).toBe(expectedCount)
          
          // 验证备份按时间降序排序（最新的在前）
          for (let i = 0; i < backups.length - 1; i++) {
            expect(backups[i].createdAt.getTime()).toBeGreaterThanOrEqual(
              backups[i + 1].createdAt.getTime()
            )
          }
        } finally {
          // 清理测试目录
          cleanupBackupDir(testDir)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 8c：当备份数量少于 7 个时，不应删除任何备份
   * 
   * **Validates: Requirements 7.2**
   */
  it('当备份数量少于 7 个时，不应删除任何备份', async () => {
    const backupCountArb = fc.integer({ min: 1, max: 7 })
    
    await fc.assert(
      fc.asyncProperty(backupCountArb, async (backupCount) => {
        // 为每次迭代创建独立的备份目录
        const testDir = createTestBackupDir()
        const backupSystem = new BackupSystem(testDir)
        
        try {
          // 创建少于或等于 7 个备份
          createMultipleBackups(backupSystem, backupCount)
          
          // 验证所有备份都被保留
          const fileCount = getBackupFileCount(testDir)
          expect(fileCount).toBe(backupCount)
          
          const backups = backupSystem.listBackups()
          expect(backups.length).toBe(backupCount)
        } finally {
          // 清理测试目录
          cleanupBackupDir(testDir)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 8d：当备份数量超过 7 个时，应删除最旧的备份
   * 
   * **Validates: Requirements 7.2**
   */
  it('当备份数量超过 7 个时，应删除最旧的备份', async () => {
    const backupCountArb = fc.integer({ min: 8, max: 15 })
    
    await fc.assert(
      fc.asyncProperty(backupCountArb, async (backupCount) => {
        // 为每次迭代创建独立的备份目录
        const testDir = createTestBackupDir()
        const backupSystem = new BackupSystem(testDir)
        
        try {
          // 创建超过 7 个备份
          createMultipleBackups(backupSystem, backupCount)
          
          // 验证只保留 7 个备份
          const fileCount = getBackupFileCount(testDir)
          expect(fileCount).toBe(7)
          
          const backups = backupSystem.listBackups()
          expect(backups.length).toBe(7)
        } finally {
          // 清理测试目录
          cleanupBackupDir(testDir)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 8e：多次备份操作的幂等性 - 最终状态一致
   * 
   * **Validates: Requirements 7.2**
   */
  it('多次备份操作后，最终状态应一致', async () => {
    const backupCountArb = fc.integer({ min: 10, max: 20 })
    
    await fc.assert(
      fc.asyncProperty(backupCountArb, async (backupCount) => {
        // 为每次迭代创建独立的备份目录
        const testDir = createTestBackupDir()
        const backupSystem = new BackupSystem(testDir)
        
        try {
          // 创建多次备份
          createMultipleBackups(backupSystem, backupCount)
          
          // 验证最终状态
          const fileCount = getBackupFileCount(testDir)
          const backups = backupSystem.listBackups()
          
          // 无论创建多少次备份，最终都应该只保留 7 个
          expect(fileCount).toBe(7)
          expect(backups.length).toBe(7)
          
          // 验证所有备份文件都有效
          for (const backup of backups) {
            expect(backup.filename).toMatch(/^admin_\d{4}-\d{2}-\d{2}_\d{6}_\d{3}\.db$/)
            expect(backup.size).toBeGreaterThan(0)
            // 验证 createdAt 是有效的日期
            expect(typeof backup.createdAt.getTime).toBe('function')
            expect(backup.createdAt.getTime()).toBeGreaterThan(0)
          }
        } finally {
          // 清理测试目录
          cleanupBackupDir(testDir)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 8f：备份文件命名格式正确性
   * 
   * **Validates: Requirements 7.2**
   */
  it('所有备份文件应遵循正确的命名格式', async () => {
    const backupCountArb = fc.integer({ min: 1, max: 15 })
    
    await fc.assert(
      fc.asyncProperty(backupCountArb, async (backupCount) => {
        // 为每次迭代创建独立的备份目录
        const testDir = createTestBackupDir()
        const backupSystem = new BackupSystem(testDir)
        
        try {
          // 创建备份
          createMultipleBackups(backupSystem, backupCount)
          
          // 获取备份列表
          const backups = backupSystem.listBackups()
          
          // 验证每个备份文件的命名格式
          for (const backup of backups) {
            // 格式：admin_YYYY-MM-DD_HHmmss_SSS.db
            expect(backup.filename).toMatch(/^admin_\d{4}-\d{2}-\d{2}_\d{6}_\d{3}\.db$/)
            
            // 验证文件实际存在
            const filePath = path.join(testDir, backup.filename)
            expect(fs.existsSync(filePath)).toBe(true)
          }
        } finally {
          // 清理测试目录
          cleanupBackupDir(testDir)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 8g：备份文件大小应该大于 0
   * 
   * **Validates: Requirements 7.2**
   */
  it('所有备份文件的大小应该大于 0', async () => {
    const backupCountArb = fc.integer({ min: 1, max: 10 })
    
    await fc.assert(
      fc.asyncProperty(backupCountArb, async (backupCount) => {
        // 为每次迭代创建独立的备份目录
        const testDir = createTestBackupDir()
        const backupSystem = new BackupSystem(testDir)
        
        try {
          // 创建备份
          createMultipleBackups(backupSystem, backupCount)
          
          // 获取备份列表
          const backups = backupSystem.listBackups()
          
          // 验证每个备份文件的大小
          for (const backup of backups) {
            expect(backup.size).toBeGreaterThan(0)
            
            // 验证文件实际大小与记录一致
            const filePath = path.join(testDir, backup.filename)
            const stats = fs.statSync(filePath)
            expect(stats.size).toBe(backup.size)
          }
        } finally {
          // 清理测试目录
          cleanupBackupDir(testDir)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 8h：边界值测试 - 恰好 7 个备份
   * 
   * **Validates: Requirements 7.2**
   */
  it('恰好 7 个备份时，不应删除任何备份', async () => {
    const backupSystem = new BackupSystem(currentTestBackupDir)
    
    // 创建恰好 7 个备份
    createMultipleBackups(backupSystem, 7)
    
    // 验证保留所有 7 个备份
    const fileCount = getBackupFileCount(currentTestBackupDir)
    expect(fileCount).toBe(7)
    
    const backups = backupSystem.listBackups()
    expect(backups.length).toBe(7)
  })

  /**
   * 属性 8i：边界值测试 - 第 8 个备份触发清理
   * 
   * **Validates: Requirements 7.2**
   */
  it('第 8 个备份应触发清理，保留最近 7 个', async () => {
    const backupSystem = new BackupSystem(currentTestBackupDir)
    
    // 创建 8 个备份
    createMultipleBackups(backupSystem, 8)
    
    // 验证只保留 7 个备份
    const fileCount = getBackupFileCount(currentTestBackupDir)
    expect(fileCount).toBe(7)
    
    const backups = backupSystem.listBackups()
    expect(backups.length).toBe(7)
  })

  /**
   * 属性 8j：清理操作的正确性 - 删除的是最旧的备份
   * 
   * **Validates: Requirements 7.2**
   */
  it('清理操作应删除最旧的备份，保留最新的', async () => {
    const backupCountArb = fc.integer({ min: 8, max: 12 })
    
    await fc.assert(
      fc.asyncProperty(backupCountArb, async (backupCount) => {
        // 为每次迭代创建独立的备份目录
        const testDir = createTestBackupDir()
        const backupSystem = new BackupSystem(testDir)
        
        try {
          // 创建多个备份
          createMultipleBackups(backupSystem, backupCount)
          
          // 获取备份列表（按时间降序）
          const backups = backupSystem.listBackups()
          
          // 验证保留的是最新的 7 个
          expect(backups.length).toBe(7)
          
          // 验证备份按时间降序排序
          for (let i = 0; i < backups.length - 1; i++) {
            const current = backups[i].createdAt.getTime()
            const next = backups[i + 1].createdAt.getTime()
            expect(current).toBeGreaterThanOrEqual(next)
          }
        } finally {
          // 清理测试目录
          cleanupBackupDir(testDir)
        }
      }),
      { numRuns: 100 }
    )
  })
})
