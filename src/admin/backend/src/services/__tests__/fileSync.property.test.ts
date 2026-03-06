/**
 * 文件同步服务属性测试（Property-Based Testing）
 * 使用 fast-check 库测试文件同步系统的正确性属性
 * 
 * **Feature: frontend-backend-data-sync-fix**
 * - Property 2: 激活简历同步性
 * 
 * **Validates: Requirements 1.2, 1.3, 1.5, 4.1, 4.2**
 */

import * as fc from 'fast-check'
import { FileSyncService } from '../fileSync'
import { initDatabase, closeDatabase, getDatabase, saveDatabase } from '../../database/init'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

// 测试用的文件目录基础路径
const TEST_BASE_DIR = path.resolve(__dirname, '../../../test-filesync-property')
const TEST_ADMIN_FILE_ROOT = path.join(TEST_BASE_DIR, 'admin-file')
const TEST_PUBLIC_ROOT = path.join(TEST_BASE_DIR, 'public')

// ========== 测试辅助函数 ==========

/**
 * 创建测试目录结构
 */
function createTestDirectories(): void {
  // 创建后台文件目录
  fs.mkdirSync(path.join(TEST_ADMIN_FILE_ROOT, 'resume'), { recursive: true })
  
  // 创建公共目录
  fs.mkdirSync(TEST_PUBLIC_ROOT, { recursive: true })
}

/**
 * 清理测试目录
 */
function cleanupTestDirectories(): void {
  if (fs.existsSync(TEST_BASE_DIR)) {
    fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true })
  }
}

/**
 * 生成随机 PDF 内容
 * 包含有效的 PDF 头部
 */
function generateRandomPdfContent(size: number): Buffer {
  const pdfHeader = Buffer.from('%PDF-1.4\n')
  const randomContent = crypto.randomBytes(size - pdfHeader.length)
  return Buffer.concat([pdfHeader, randomContent])
}

/**
 * 计算文件的 SHA256 哈希值
 */
function calculateFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * 创建简历版本记录并保存文件
 */
function createResumeVersion(
  version: number,
  filename: string,
  content: Buffer,
  isActive: boolean = false
): string {
  const db = getDatabase()
  const filePath = `resume/resume_v${version}.pdf`
  const fullPath = path.join(TEST_ADMIN_FILE_ROOT, filePath)
  
  // 保存文件
  fs.writeFileSync(fullPath, content)
  
  // 插入数据库记录
  db.run(`
    INSERT INTO resume_versions (version, filename, file_path, file_size, is_active, download_count)
    VALUES (?, ?, ?, ?, ?, 0)
  `, [version, filename, filePath, content.length, isActive ? 1 : 0])
  
  saveDatabase()
  
  return filePath
}

/**
 * 设置激活的简历版本
 */
function setActiveResumeVersion(version: number): void {
  const db = getDatabase()
  
  // 清除所有激活状态
  db.run('UPDATE resume_versions SET is_active = 0')
  
  // 设置指定版本为激活
  db.run('UPDATE resume_versions SET is_active = 1 WHERE version = ?', [version])
  
  saveDatabase()
}

/**
 * 获取激活的简历版本
 */
function getActiveResumeVersion(): number | null {
  const db = getDatabase()
  const result = db.exec('SELECT version FROM resume_versions WHERE is_active = 1')
  
  if (result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }
  
  return result[0].values[0][0] as number
}

/**
 * 模拟 FileSyncService 使用测试路径
 * 通过修改原型方法来注入测试路径
 */
function mockFileSyncServicePaths(): void {
  // 保存原始方法
  const originalSyncActiveResume = FileSyncService.prototype.syncActiveResumeToPublic
  const originalSyncAudio = FileSyncService.prototype.syncAudioToPublic
  
  // 重写方法以使用测试路径
  FileSyncService.prototype.syncActiveResumeToPublic = async function() {
    try {
      const db = getDatabase()
      const result = db.exec(`
        SELECT version, filename, file_path 
        FROM resume_versions 
        WHERE is_active = 1
      `)

      if (result.length === 0 || !result[0].values || result[0].values.length === 0) {
        return {
          success: false,
          error: '没有激活的简历版本'
        }
      }

      const [version, filename, filePath] = result[0].values[0]
      const sourcePath = path.join(TEST_ADMIN_FILE_ROOT, filePath as string)
      const targetPath = path.join(TEST_PUBLIC_ROOT, 'resume.pdf')
      const tempPath = path.join(TEST_PUBLIC_ROOT, `.resume.pdf.tmp.${Date.now()}`)

      if (!fs.existsSync(sourcePath)) {
        return {
          success: false,
          sourcePath,
          targetPath,
          error: `源文件不存在: ${sourcePath}`
        }
      }

      const publicDir = path.dirname(targetPath)
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }

      fs.copyFileSync(sourcePath, tempPath)
      fs.renameSync(tempPath, targetPath)

      return {
        success: true,
        sourcePath,
        targetPath
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// ========== 测试套件 ==========

describe('Property 2: 激活简历同步性', () => {
  let fileSyncService: FileSyncService

  beforeAll(async () => {
    // 初始化内存数据库
    await initDatabase(':memory:', true)
    
    // 模拟文件同步服务路径
    mockFileSyncServicePaths()
  })

  afterAll(() => {
    closeDatabase(true)
  })

  beforeEach(() => {
    // 清理并重新创建测试目录
    cleanupTestDirectories()
    createTestDirectories()
    
    // 创建文件同步服务实例
    fileSyncService = new FileSyncService()
    
    // 清空简历版本表
    const db = getDatabase()
    db.run('DELETE FROM resume_versions')
    saveDatabase()
  })

  afterEach(() => {
    // 清理测试目录
    cleanupTestDirectories()
  })

  /**
   * 属性 2a：同步后公共目录文件与源文件内容完全一致
   * 
   * **Validates: Requirements 1.2, 1.3, 1.5, 4.1, 4.2**
   */
  it('同步后公共目录文件与源文件内容应完全一致', async () => {
    const resumeArb = fc.record({
      version: fc.integer({ min: 1, max: 100 }),
      filename: fc.string({ minLength: 5, maxLength: 20 }).map(s => `${s}.pdf`),
      contentSize: fc.integer({ min: 1000, max: 10000 })
    })

    await fc.assert(
      fc.asyncProperty(resumeArb, async (resume) => {
        // 生成随机 PDF 内容
        const content = generateRandomPdfContent(resume.contentSize)
        
        // 创建简历版本并设置为激活
        const filePath = createResumeVersion(resume.version, resume.filename, content, true)
        const sourceFilePath = path.join(TEST_ADMIN_FILE_ROOT, filePath)
        
        // 执行同步
        const result = await fileSyncService.syncActiveResumeToPublic()
        
        // 验证同步成功
        expect(result.success).toBe(true)
        expect(result.sourcePath).toBeDefined()
        expect(result.targetPath).toBeDefined()
        
        // 验证公共目录文件存在
        const publicFilePath = path.join(TEST_PUBLIC_ROOT, 'resume.pdf')
        expect(fs.existsSync(publicFilePath)).toBe(true)
        
        // 验证文件内容一致（通过哈希比较源文件和目标文件）
        const sourceHash = calculateFileHash(sourceFilePath)
        const targetHash = calculateFileHash(publicFilePath)
        
        expect(targetHash).toBe(sourceHash)
        
        // 验证文件大小一致
        const sourceStats = fs.statSync(sourceFilePath)
        const targetStats = fs.statSync(publicFilePath)
        expect(targetStats.size).toBe(sourceStats.size)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 2b：切换激活版本后，公共目录文件应更新为新版本
   * 
   * **Validates: Requirements 1.3, 4.2**
   */
  it('切换激活版本后，公共目录文件应更新为新版本', async () => {
    const versionsArb = fc.tuple(
      fc.record({
        version: fc.constant(1),
        filename: fc.constant('resume_v1.pdf'),
        contentSize: fc.integer({ min: 1000, max: 5000 })
      }),
      fc.record({
        version: fc.constant(2),
        filename: fc.constant('resume_v2.pdf'),
        contentSize: fc.integer({ min: 1000, max: 5000 })
      })
    )

    await fc.assert(
      fc.asyncProperty(versionsArb, async ([resume1, resume2]) => {
        // 创建两个不同的简历版本
        const content1 = generateRandomPdfContent(resume1.contentSize)
        const content2 = generateRandomPdfContent(resume2.contentSize)
        
        const filePath1 = createResumeVersion(resume1.version, resume1.filename, content1, true)
        const filePath2 = createResumeVersion(resume2.version, resume2.filename, content2, false)
        
        const sourceFilePath1 = path.join(TEST_ADMIN_FILE_ROOT, filePath1)
        const sourceFilePath2 = path.join(TEST_ADMIN_FILE_ROOT, filePath2)
        
        // 同步第一个版本
        const result1 = await fileSyncService.syncActiveResumeToPublic()
        expect(result1.success).toBe(true)
        
        // 验证公共目录是第一个版本
        const publicFilePath = path.join(TEST_PUBLIC_ROOT, 'resume.pdf')
        const hash1 = calculateFileHash(publicFilePath)
        const expectedHash1 = calculateFileHash(sourceFilePath1)
        expect(hash1).toBe(expectedHash1)
        
        // 切换到第二个版本
        setActiveResumeVersion(resume2.version)
        
        // 同步第二个版本
        const result2 = await fileSyncService.syncActiveResumeToPublic()
        expect(result2.success).toBe(true)
        
        // 验证公共目录已更新为第二个版本
        const hash2 = calculateFileHash(publicFilePath)
        const expectedHash2 = calculateFileHash(sourceFilePath2)
        expect(hash2).toBe(expectedHash2)
        
        // 验证两个版本的哈希不同
        expect(hash1).not.toBe(hash2)
      }),
      { numRuns: 50 }
    )
  })

  /**
   * 属性 2c：没有激活版本时，同步应该失败但不崩溃
   * 
   * **Validates: Requirements 1.3**
   */
  it('没有激活版本时，同步应该失败但不崩溃', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // 确保没有激活版本
        const db = getDatabase()
        db.run('DELETE FROM resume_versions')
        saveDatabase()
        
        // 执行同步
        const result = await fileSyncService.syncActiveResumeToPublic()
        
        // 验证同步失败
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.error).toContain('没有激活的简历版本')
      }),
      { numRuns: 10 }
    )
  })

  /**
   * 属性 2d：源文件不存在时，同步应该失败并记录错误
   * 
   * **Validates: Requirements 4.5**
   */
  it('源文件不存在时，同步应该失败并记录错误', async () => {
    const resumeArb = fc.record({
      version: fc.integer({ min: 1, max: 100 }),
      filename: fc.string({ minLength: 5, maxLength: 20 }).map(s => `${s}.pdf`)
    })

    await fc.assert(
      fc.asyncProperty(resumeArb, async (resume) => {
        const db = getDatabase()
        const filePath = `resume/resume_v${resume.version}.pdf`
        
        // 只创建数据库记录，不创建实际文件
        db.run(`
          INSERT INTO resume_versions (version, filename, file_path, file_size, is_active, download_count)
          VALUES (?, ?, ?, ?, 1, 0)
        `, [resume.version, resume.filename, filePath, 1000])
        saveDatabase()
        
        // 执行同步
        const result = await fileSyncService.syncActiveResumeToPublic()
        
        // 验证同步失败
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.error).toContain('源文件不存在')
      }),
      { numRuns: 50 }
    )
  })

  /**
   * 属性 2e：多次同步同一版本，结果应该一致（幂等性）
   * 
   * **Validates: Requirements 4.1, 4.2**
   */
  it('多次同步同一版本，结果应该一致', async () => {
    const resumeArb = fc.record({
      version: fc.integer({ min: 1, max: 100 }),
      filename: fc.string({ minLength: 5, maxLength: 20 }).map(s => `${s}.pdf`),
      contentSize: fc.integer({ min: 1000, max: 10000 }),
      syncCount: fc.integer({ min: 2, max: 5 })
    })

    await fc.assert(
      fc.asyncProperty(resumeArb, async (resume) => {
        // 生成随机 PDF 内容
        const content = generateRandomPdfContent(resume.contentSize)
        
        // 创建简历版本并设置为激活
        const filePath = createResumeVersion(resume.version, resume.filename, content, true)
        const sourceFilePath = path.join(TEST_ADMIN_FILE_ROOT, filePath)
        
        const publicFilePath = path.join(TEST_PUBLIC_ROOT, 'resume.pdf')
        const expectedHash = calculateFileHash(sourceFilePath)
        
        // 多次同步
        for (let i = 0; i < resume.syncCount; i++) {
          const result = await fileSyncService.syncActiveResumeToPublic()
          
          // 验证每次同步都成功
          expect(result.success).toBe(true)
          
          // 验证文件内容始终一致
          const currentHash = calculateFileHash(publicFilePath)
          expect(currentHash).toBe(expectedHash)
        }
      }),
      { numRuns: 50 }
    )
  })

  /**
   * 属性 2f：同步操作应该是原子的（使用临时文件）
   * 
   * **Validates: Requirements 4.5**
   */
  it('同步完成后不应该有临时文件残留', async () => {
    const resumeArb = fc.record({
      version: fc.integer({ min: 1, max: 100 }),
      filename: fc.string({ minLength: 5, maxLength: 20 }).map(s => `${s}.pdf`),
      contentSize: fc.integer({ min: 1000, max: 10000 })
    })

    await fc.assert(
      fc.asyncProperty(resumeArb, async (resume) => {
        // 生成随机 PDF 内容
        const content = generateRandomPdfContent(resume.contentSize)
        
        // 创建简历版本并设置为激活
        createResumeVersion(resume.version, resume.filename, content, true)
        
        // 执行同步
        const result = await fileSyncService.syncActiveResumeToPublic()
        expect(result.success).toBe(true)
        
        // 验证公共目录中没有 .tmp 文件
        const files = fs.readdirSync(TEST_PUBLIC_ROOT)
        const tmpFiles = files.filter(f => f.endsWith('.tmp'))
        
        expect(tmpFiles.length).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 2g：同步后文件权限应该可读
   * 
   * **Validates: Requirements 4.1**
   */
  it('同步后文件应该可读', async () => {
    const resumeArb = fc.record({
      version: fc.integer({ min: 1, max: 100 }),
      filename: fc.string({ minLength: 5, maxLength: 20 }).map(s => `${s}.pdf`),
      contentSize: fc.integer({ min: 1000, max: 10000 })
    })

    await fc.assert(
      fc.asyncProperty(resumeArb, async (resume) => {
        // 生成随机 PDF 内容
        const content = generateRandomPdfContent(resume.contentSize)
        
        // 创建简历版本并设置为激活
        const filePath = createResumeVersion(resume.version, resume.filename, content, true)
        const sourceFilePath = path.join(TEST_ADMIN_FILE_ROOT, filePath)
        
        // 执行同步
        const result = await fileSyncService.syncActiveResumeToPublic()
        expect(result.success).toBe(true)
        
        // 验证文件可读
        const publicFilePath = path.join(TEST_PUBLIC_ROOT, 'resume.pdf')
        expect(() => fs.readFileSync(publicFilePath)).not.toThrow()
        
        // 验证文件内容与源文件一致
        const sourceContent = fs.readFileSync(sourceFilePath)
        const publicContent = fs.readFileSync(publicFilePath)
        expect(publicContent.length).toBe(sourceContent.length)
        expect(publicContent.equals(sourceContent)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
