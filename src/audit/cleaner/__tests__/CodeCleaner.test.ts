/**
 * CodeCleaner 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import { CodeCleaner } from '../CodeCleaner'

describe('CodeCleaner', () => {
  let testDir: string
  let cleaner: CodeCleaner

  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.test-temp', `test-${Date.now()}`)
    await fs.ensureDir(testDir)
    cleaner = new CodeCleaner(testDir)
  })

  afterEach(async () => {
    await fs.remove(testDir)
  })

  describe('scanDebugCode', () => {
    it('应该扫描并找到所有 console.debug 语句', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
function test() {
  console.debug("test message")
  console.log("normal log")
  console.debug("another debug")
}
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const locations = await cleaner.scanDebugCode()

      expect(locations).toHaveLength(2)
      expect(locations[0].code).toContain('console.debug("test message")')
      expect(locations[1].code).toContain('console.debug("another debug")')
    })

    it('应该正确报告行号和列号', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `const x = 1
  console.debug("test")
const y = 2`
      await fs.writeFile(testFile, content, 'utf-8')

      const locations = await cleaner.scanDebugCode()

      expect(locations).toHaveLength(1)
      expect(locations[0].line).toBe(2)
      expect(locations[0].column).toBe(2) // 2 个空格后
    })

    it('应该处理空文件', async () => {
      const testFile = path.join(testDir, 'empty.ts')
      await fs.writeFile(testFile, '', 'utf-8')

      const locations = await cleaner.scanDebugCode()

      expect(locations).toHaveLength(0)
    })

    it('应该处理没有 console.debug 的文件', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
function test() {
  console.log("log")
  console.error("error")
}
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const locations = await cleaner.scanDebugCode()

      expect(locations).toHaveLength(0)
    })

    it('应该处理同一行有多个 console.debug 的情况', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = 'console.debug("a"); console.debug("b")'
      await fs.writeFile(testFile, content, 'utf-8')

      const locations = await cleaner.scanDebugCode()

      expect(locations).toHaveLength(2)
      expect(locations[0].line).toBe(1)
      expect(locations[1].line).toBe(1)
      expect(locations[0].column).toBeLessThan(locations[1].column)
    })
  })

  describe('cleanDebugCode', () => {
    it('批量模式应该删除所有 console.debug', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
console.debug("debug 1")
console.log("log")
console.debug("debug 2")
console.error("error")
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const result = await cleaner.cleanDebugCode({
        mode: 'batch',
        dryRun: false,
        backup: false
      })

      expect(result.success).toBe(true)
      expect(result.removedCount).toBe(2)

      const cleanedContent = await fs.readFile(testFile, 'utf-8')
      expect(cleanedContent).not.toContain('console.debug')
      expect(cleanedContent).toContain('console.log')
      expect(cleanedContent).toContain('console.error')
    })

    it('dry-run 模式不应该修改文件', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = 'console.debug("test")'
      await fs.writeFile(testFile, content, 'utf-8')

      const result = await cleaner.cleanDebugCode({
        mode: 'batch',
        dryRun: true,
        backup: false
      })

      expect(result.success).toBe(true)
      expect(result.removedCount).toBe(1)

      const afterContent = await fs.readFile(testFile, 'utf-8')
      expect(afterContent).toBe(content)
    })

    it('backup 模式应该创建备份文件', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = 'console.debug("test")'
      await fs.writeFile(testFile, content, 'utf-8')

      await cleaner.cleanDebugCode({
        mode: 'batch',
        dryRun: false,
        backup: true
      })

      // 检查是否创建了备份文件
      const files = await fs.readdir(testDir)
      const backupFiles = files.filter(f => f.startsWith('test.ts.backup.'))
      expect(backupFiles.length).toBeGreaterThan(0)

      // 验证备份文件内容
      const backupPath = path.join(testDir, backupFiles[0])
      const backupContent = await fs.readFile(backupPath, 'utf-8')
      expect(backupContent).toBe(content)
    })

    it('应该保留其他 console 方法', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
console.debug("debug")
console.log("log")
console.warn("warn")
console.error("error")
console.info("info")
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      await cleaner.cleanDebugCode({
        mode: 'batch',
        dryRun: false,
        backup: false
      })

      const cleanedContent = await fs.readFile(testFile, 'utf-8')
      expect(cleanedContent).not.toContain('console.debug')
      expect(cleanedContent).toContain('console.log')
      expect(cleanedContent).toContain('console.warn')
      expect(cleanedContent).toContain('console.error')
      expect(cleanedContent).toContain('console.info')
    })

    it('应该处理多个文件', async () => {
      const file1 = path.join(testDir, 'file1.ts')
      const file2 = path.join(testDir, 'file2.ts')
      
      await fs.writeFile(file1, 'console.debug("file1")', 'utf-8')
      await fs.writeFile(file2, 'console.debug("file2")', 'utf-8')

      const result = await cleaner.cleanDebugCode({
        mode: 'batch',
        dryRun: false,
        backup: false
      })

      expect(result.removedCount).toBe(2)

      const content1 = await fs.readFile(file1, 'utf-8')
      const content2 = await fs.readFile(file2, 'utf-8')
      
      expect(content1).not.toContain('console.debug')
      expect(content2).not.toContain('console.debug')
    })
  })
})
