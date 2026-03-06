/**
 * 文件工具函数测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import {
  fileExists,
  ensureDir,
  getRelativePath,
  resolveRelativePath
} from '../fileUtils'

describe('文件工具函数', () => {
  const testDir = path.join(process.cwd(), 'test-temp')

  beforeEach(async () => {
    // 创建测试目录
    await ensureDir(testDir)
  })

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {
      // 忽略清理错误
    }
  })

  describe('fileExists', () => {
    it('应该在文件存在时返回 true', async () => {
      const testFile = path.join(testDir, 'test.txt')
      await fs.writeFile(testFile, 'test content')

      const exists = await fileExists(testFile)
      expect(exists).toBe(true)
    })

    it('应该在文件不存在时返回 false', async () => {
      const testFile = path.join(testDir, 'nonexistent.txt')

      const exists = await fileExists(testFile)
      expect(exists).toBe(false)
    })
  })

  describe('ensureDir', () => {
    it('应该创建不存在的目录', async () => {
      const newDir = path.join(testDir, 'new-dir')

      await ensureDir(newDir)

      const stats = await fs.stat(newDir)
      expect(stats.isDirectory()).toBe(true)
    })

    it('应该能够创建嵌套目录', async () => {
      const nestedDir = path.join(testDir, 'a', 'b', 'c')

      await ensureDir(nestedDir)

      const stats = await fs.stat(nestedDir)
      expect(stats.isDirectory()).toBe(true)
    })

    it('应该在目录已存在时不报错', async () => {
      const existingDir = path.join(testDir, 'existing')
      await fs.mkdir(existingDir)

      await expect(ensureDir(existingDir)).resolves.not.toThrow()
    })
  })

  describe('getRelativePath', () => {
    it('应该正确计算相对路径', () => {
      const from = '/project/docs/guide.md'
      const to = '/project/src/utils/helper.ts'

      const relative = getRelativePath(from, to)
      // 规范化路径分隔符以支持跨平台
      const normalized = relative.replace(/\\/g, '/')
      expect(normalized).toBe('../src/utils/helper.ts')
    })

    it('应该处理同级目录的相对路径', () => {
      const from = '/project/docs/guide.md'
      const to = '/project/docs/api.md'

      const relative = getRelativePath(from, to)
      expect(relative).toBe('api.md')
    })
  })

  describe('resolveRelativePath', () => {
    it('应该正确解析相对路径', () => {
      const from = '/project/docs/guide.md'
      const relativePath = '../src/utils/helper.ts'

      const resolved = resolveRelativePath(from, relativePath)
      expect(resolved).toBe(path.resolve('/project/src/utils/helper.ts'))
    })

    it('应该处理当前目录的相对路径', () => {
      const from = '/project/docs/guide.md'
      const relativePath = './api.md'

      const resolved = resolveRelativePath(from, relativePath)
      expect(resolved).toBe(path.resolve('/project/docs/api.md'))
    })
  })
})
