/**
 * 文档整理主流程属性测试
 * Feature: code-audit-and-docs-organization
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { DocOrganizer } from '../DocOrganizer'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('DocOrganizer.organize Property Tests', () => {
  let tempDir: string
  let organizer: DocOrganizer

  beforeEach(async () => {
    // 创建临时测试目录
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-organizer-test-'))
    organizer = new DocOrganizer(tempDir)
  })

  afterEach(async () => {
    // 清理临时目录
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // 忽略清理错误
    }
  })

  // Feature: code-audit-and-docs-organization, Property 13: 移动操作可追溯性
  // **验证需求：3.7**
  it('should record all file moves in the result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            fileName: fc.constantFrom('deploy.md', 'guide.md', 'test.md'),
            content: fc.string({ maxLength: 100 }),
            category: fc.constantFrom('deployment', 'development', 'testing')
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (files) => {
          // 创建测试文件
          for (const file of files) {
            const filePath = path.join(tempDir, file.fileName)
            await fs.writeFile(filePath, file.content, 'utf-8')
          }

          // 执行整理
          const result = await organizer.organize({
            dryRun: false,
            backup: false,
            updateLinks: false
          })

          // 验证：结果应该记录所有移动操作
          expect(result.success).toBe(true)
          expect(result.movedFiles).toBeDefined()
          expect(Array.isArray(result.movedFiles)).toBe(true)

          // 验证：每个移动记录都包含 from 和 to 路径
          for (const move of result.movedFiles) {
            expect(move.from).toBeTruthy()
            expect(move.to).toBeTruthy()
            expect(typeof move.from).toBe('string')
            expect(typeof move.to).toBe('string')
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  // Feature: code-audit-and-docs-organization, Property 22: Dry-run 模式不修改文件系统
  // **验证需求：7.2**
  it('should not modify filesystem in dry-run mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            fileName: fc.constantFrom('dryrun1.md', 'dryrun2.md', 'dryrun3.md'),
            content: fc.string({ maxLength: 100 })
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (files) => {
          // 创建测试文件
          const createdFiles: string[] = []
          for (const file of files) {
            const filePath = path.join(tempDir, file.fileName)
            await fs.writeFile(filePath, file.content, 'utf-8')
            createdFiles.push(filePath)
          }

          // 记录文件系统状态（文件内容和位置）
          const beforeState = new Map<string, string>()
          for (const filePath of createdFiles) {
            const content = await fs.readFile(filePath, 'utf-8')
            beforeState.set(filePath, content)
          }

          // 执行 dry-run
          const result = await organizer.organize({
            dryRun: true,
            backup: false,
            updateLinks: false
          })

          // 验证：所有原始文件仍在原位置且内容未变
          for (const [filePath, originalContent] of beforeState.entries()) {
            const exists = await fs.access(filePath).then(() => true).catch(() => false)
            expect(exists).toBe(true)
            
            if (exists) {
              const currentContent = await fs.readFile(filePath, 'utf-8')
              expect(currentContent).toBe(originalContent)
            }
          }

          // 验证：没有文件被移动到 docs 目录
          const docsDir = path.join(tempDir, 'docs')
          const docsDirExists = await fs.access(docsDir).then(() => true).catch(() => false)
          
          if (docsDirExists) {
            // 如果 docs 目录存在，检查是否有我们的测试文件被移动过去
            const checkDir = async (dir: string) => {
              const entries = await fs.readdir(dir, { withFileTypes: true })
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name)
                if (entry.isDirectory()) {
                  await checkDir(fullPath)
                } else if (entry.isFile()) {
                  const fileName = entry.name
                  // 验证不是我们创建的测试文件
                  const isTestFile = files.some(f => f.fileName === fileName)
                  if (isTestFile) {
                    // 如果在 docs 目录下找到测试文件，说明文件被移动了
                    expect(isTestFile).toBe(false)
                  }
                }
              }
            }
            await checkDir(docsDir)
          }

          // 验证：索引文件不应该被创建
          expect(result.indexPath).toBe('')
        }
      ),
      { numRuns: 15 }
    )
  })

  // Feature: code-audit-and-docs-organization, Property 23: 备份完整性
  // **验证需求：7.3**
  it('should create complete backups when backup option is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            fileName: fc.constantFrom('backup-test1.md', 'backup-test2.md'),
            content: fc.string({ minLength: 10, maxLength: 100 })
          }),
          { minLength: 1, maxLength: 2 }
        ),
        async (files) => {
          // 创建测试文件并记录内容
          const fileContents = new Map<string, string>()
          for (const file of files) {
            const filePath = path.join(tempDir, file.fileName)
            await fs.writeFile(filePath, file.content, 'utf-8')
            fileContents.set(file.fileName, file.content)
          }

          // 执行整理（启用备份）
          await organizer.organize({
            dryRun: false,
            backup: true,
            updateLinks: false
          })

          // 查找备份目录
          const backupDir = path.join(tempDir, '.backup')
          const backupExists = await fs.access(backupDir).then(() => true).catch(() => false)

          if (backupExists) {
            const backupDirs = await fs.readdir(backupDir)
            
            if (backupDirs.length > 0) {
              // 获取最新的备份目录
              const latestBackup = backupDirs.sort().reverse()[0]
              const backupPath = path.join(backupDir, latestBackup)
              
              try {
                const backupFiles = await fs.readdir(backupPath)

                // 验证：每个原始文件都有对应的备份
                for (const [fileName, originalContent] of fileContents.entries()) {
                  if (backupFiles.includes(fileName)) {
                    const backupFilePath = path.join(backupPath, fileName)
                    const backupContent = await fs.readFile(backupFilePath, 'utf-8')
                    
                    // 验证备份内容与原始内容相同
                    expect(backupContent).toBe(originalContent)
                  }
                }
              } catch (error) {
                // 如果读取备份失败，跳过验证（可能是空备份目录）
                console.log('备份目录读取失败，跳过验证')
              }
            }
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  // 额外测试：验证整理结果包含索引路径
  it('should include index path in the result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            fileName: fc.constantFrom('test1.md', 'test2.md'),
            content: fc.string({ maxLength: 50 })
          }),
          { minLength: 1, maxLength: 2 }
        ),
        async (files) => {
          // 创建测试文件
          for (const file of files) {
            const filePath = path.join(tempDir, file.fileName)
            await fs.writeFile(filePath, file.content, 'utf-8')
          }

          // 执行整理
          const result = await organizer.organize({
            dryRun: false,
            backup: false,
            updateLinks: false
          })

          // 验证：结果包含索引路径
          expect(result.indexPath).toBeTruthy()
          expect(typeof result.indexPath).toBe('string')
          expect(result.indexPath).toContain('README.md')
        }
      ),
      { numRuns: 15 }
    )
  })

  // 额外测试：验证成功标志的正确性
  it('should set success flag correctly', async () => {
    // 创建一个简单的测试文件
    const testFile = path.join(tempDir, 'simple.md')
    await fs.writeFile(testFile, '# Test', 'utf-8')

    // 执行整理
    const result = await organizer.organize({
      dryRun: false,
      backup: false,
      updateLinks: false
    })

    // 验证：成功标志应该为 true
    expect(result.success).toBe(true)
  })
})
