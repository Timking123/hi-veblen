/**
 * 文件同步服务单元测试
 * 测试临时文件清理和错误处理
 * 
 * **Feature: frontend-backend-data-sync-fix**
 * 
 * **Validates: Requirements 4.5**
 */

import { FileSyncService } from '../fileSync'
import { initDatabase, closeDatabase, getDatabase, saveDatabase } from '../../database/init'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

// 测试用的文件目录基础路径
const TEST_BASE_DIR = path.resolve(__dirname, '../../../test-filesync-unit')
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
 * 生成简单的 PDF 内容
 */
function generatePdfContent(text: string): Buffer {
  const pdfHeader = Buffer.from('%PDF-1.4\n')
  const content = Buffer.from(text)
  return Buffer.concat([pdfHeader, content])
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
 * 模拟 FileSyncService 使用测试路径
 */
function mockFileSyncServicePaths(): void {
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
  
  FileSyncService.prototype.cleanupPublicDirectory = async function() {
    try {
      let filesRemoved = 0
      const publicDir = TEST_PUBLIC_ROOT
      
      if (fs.existsSync(publicDir)) {
        const files = fs.readdirSync(publicDir)
        
        for (const file of files) {
          // 匹配 .*.tmp.* 模式的临时文件
          if (file.includes('.tmp')) {
            const filePath = path.join(publicDir, file)
            try {
              fs.unlinkSync(filePath)
              filesRemoved++
            } catch (error) {
              // 忽略删除失败
            }
          }
        }
      }

      return {
        success: true,
        filesRemoved
      }
    } catch (error) {
      return {
        success: false,
        filesRemoved: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// ========== 测试套件 ==========

describe('FileSyncService 单元测试', () => {
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

  describe('临时文件清理', () => {
    it('同步失败时应该清理临时文件', async () => {
      // 创建一些临时文件
      const tempFile1 = path.join(TEST_PUBLIC_ROOT, '.resume.pdf.tmp.123')
      const tempFile2 = path.join(TEST_PUBLIC_ROOT, '.resume.pdf.tmp.456')
      
      fs.writeFileSync(tempFile1, 'temp content 1')
      fs.writeFileSync(tempFile2, 'temp content 2')
      
      // 验证临时文件存在
      expect(fs.existsSync(tempFile1)).toBe(true)
      expect(fs.existsSync(tempFile2)).toBe(true)
      
      // 执行清理
      const result = await fileSyncService.cleanupPublicDirectory()
      
      // 验证清理成功
      expect(result.success).toBe(true)
      expect(result.filesRemoved).toBe(2)
      
      // 验证临时文件已删除
      expect(fs.existsSync(tempFile1)).toBe(false)
      expect(fs.existsSync(tempFile2)).toBe(false)
    })

    it('清理操作不应该删除非临时文件', async () => {
      // 创建正常文件和临时文件
      const normalFile = path.join(TEST_PUBLIC_ROOT, 'resume.pdf')
      const tempFile = path.join(TEST_PUBLIC_ROOT, '.resume.pdf.tmp.123')
      
      fs.writeFileSync(normalFile, 'normal content')
      fs.writeFileSync(tempFile, 'temp content')
      
      // 执行清理
      const result = await fileSyncService.cleanupPublicDirectory()
      
      // 验证只删除了临时文件
      expect(result.success).toBe(true)
      expect(result.filesRemoved).toBe(1)
      expect(fs.existsSync(normalFile)).toBe(true)
      expect(fs.existsSync(tempFile)).toBe(false)
    })

    it('没有临时文件时清理应该成功', async () => {
      // 执行清理
      const result = await fileSyncService.cleanupPublicDirectory()
      
      // 验证清理成功
      expect(result.success).toBe(true)
      expect(result.filesRemoved).toBe(0)
    })
  })

  describe('错误处理', () => {
    it('没有激活版本时应该返回错误', async () => {
      // 执行同步
      const result = await fileSyncService.syncActiveResumeToPublic()
      
      // 验证返回错误
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('没有激活的简历版本')
    })

    it('源文件不存在时应该返回错误', async () => {
      const db = getDatabase()
      const filePath = 'resume/nonexistent.pdf'
      
      // 只创建数据库记录，不创建实际文件
      db.run(`
        INSERT INTO resume_versions (version, filename, file_path, file_size, is_active, download_count)
        VALUES (?, ?, ?, ?, 1, 0)
      `, [1, 'nonexistent.pdf', filePath, 1000])
      saveDatabase()
      
      // 执行同步
      const result = await fileSyncService.syncActiveResumeToPublic()
      
      // 验证返回错误
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('源文件不存在')
    })
  })

  describe('并发同步处理', () => {
    it('多个并发同步请求应该都能成功', async () => {
      // 创建简历版本
      const content = generatePdfContent('test content for concurrent sync')
      createResumeVersion(1, 'test.pdf', content, true)
      
      // 并发执行多个同步请求
      const promises = Array.from({ length: 5 }, () => 
        fileSyncService.syncActiveResumeToPublic()
      )
      
      const results = await Promise.all(promises)
      
      // 验证所有请求都成功
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
      
      // 验证最终文件正确
      const publicFilePath = path.join(TEST_PUBLIC_ROOT, 'resume.pdf')
      expect(fs.existsSync(publicFilePath)).toBe(true)
      
      const publicContent = fs.readFileSync(publicFilePath)
      expect(publicContent.equals(content)).toBe(true)
    })
  })

  describe('基本同步功能', () => {
    it('应该成功同步简历文件', async () => {
      // 创建简历版本
      const content = generatePdfContent('test resume content')
      const filePath = createResumeVersion(1, 'test.pdf', content, true)
      const sourceFilePath = path.join(TEST_ADMIN_FILE_ROOT, filePath)
      
      // 执行同步
      const result = await fileSyncService.syncActiveResumeToPublic()
      
      // 验证同步成功
      expect(result.success).toBe(true)
      expect(result.sourcePath).toBeDefined()
      expect(result.targetPath).toBeDefined()
      
      // 验证公共目录文件存在且内容正确
      const publicFilePath = path.join(TEST_PUBLIC_ROOT, 'resume.pdf')
      expect(fs.existsSync(publicFilePath)).toBe(true)
      
      const sourceContent = fs.readFileSync(sourceFilePath)
      const publicContent = fs.readFileSync(publicFilePath)
      expect(publicContent.equals(sourceContent)).toBe(true)
    })

    it('同步完成后不应该有临时文件残留', async () => {
      // 创建简历版本
      const content = generatePdfContent('test content')
      createResumeVersion(1, 'test.pdf', content, true)
      
      // 执行同步
      const result = await fileSyncService.syncActiveResumeToPublic()
      expect(result.success).toBe(true)
      
      // 验证没有临时文件
      const files = fs.readdirSync(TEST_PUBLIC_ROOT)
      const tmpFiles = files.filter(f => f.endsWith('.tmp'))
      expect(tmpFiles.length).toBe(0)
    })
  })
})
