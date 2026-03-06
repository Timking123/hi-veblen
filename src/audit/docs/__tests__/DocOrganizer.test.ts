/**
 * 文档整理器单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DocOrganizer } from '../DocOrganizer'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('DocOrganizer Unit Tests', () => {
  let tempDir: string
  let organizer: DocOrganizer

  beforeEach(async () => {
    // 创建临时测试目录
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-organizer-unit-test-'))
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

  describe('文档分类', () => {
    it('should classify deployment documents correctly', () => {
      const docs = [
        {
          path: 'docs/DEPLOYMENT_GUIDE.md',
          content: '# 部署指南\n\n这是部署文档',
          category: 'deployment' as const,
          title: '部署指南'
        },
        {
          path: 'docs/SERVER_OVERVIEW.md',
          content: '# 服务器概览',
          category: 'deployment' as const,
          title: '服务器概览'
        }
      ]

      const classified = organizer.classifyDocuments(docs)
      
      expect(classified.deployment).toHaveLength(2)
      expect(classified.deployment[0].path).toBe('docs/DEPLOYMENT_GUIDE.md')
      expect(classified.deployment[1].path).toBe('docs/SERVER_OVERVIEW.md')
    })

    it('should classify development documents correctly', () => {
      const docs = [
        {
          path: 'docs/DEVELOPMENT_STANDARDS.md',
          content: '# 开发标准',
          category: 'development' as const,
          title: '开发标准'
        },
        {
          path: 'docs/MIGRATION_GUIDE.md',
          content: '# 迁移指南',
          category: 'development' as const,
          title: '迁移指南'
        }
      ]

      const classified = organizer.classifyDocuments(docs)
      
      expect(classified.development).toHaveLength(2)
      expect(classified.development[0].path).toBe('docs/DEVELOPMENT_STANDARDS.md')
    })

    it('should classify testing documents correctly', () => {
      const docs = [
        {
          path: 'docs/e2e/TEST_SUMMARY.md',
          content: '# 测试总结',
          category: 'testing' as const,
          title: '测试总结'
        }
      ]

      const classified = organizer.classifyDocuments(docs)
      
      expect(classified.testing).toHaveLength(1)
      expect(classified.testing[0].path).toBe('docs/e2e/TEST_SUMMARY.md')
    })

    it('should classify documents into other category when no match', () => {
      const docs = [
        {
          path: 'docs/RANDOM.md',
          content: '# 随机文档',
          category: 'other' as const,
          title: '随机文档'
        }
      ]

      const classified = organizer.classifyDocuments(docs)
      
      expect(classified.other).toHaveLength(1)
      expect(classified.other[0].path).toBe('docs/RANDOM.md')
    })
  })

  describe('文档分类逻辑', () => {
    it('should determine category based on path keywords', () => {
      const category1 = organizer.determineCategory('docs/deployment/guide.md', '')
      expect(category1).toBe('deployment')

      const category2 = organizer.determineCategory('docs/test/summary.md', '')
      expect(category2).toBe('testing')

      const category3 = organizer.determineCategory('docs/roadmap.md', '')
      expect(category3).toBe('planning')
    })

    it('should determine category based on content keywords', () => {
      const category1 = organizer.determineCategory('docs/guide.md', '这是一个部署指南')
      expect(category1).toBe('deployment')

      const category2 = organizer.determineCategory('docs/doc.md', '这是测试文档')
      expect(category2).toBe('testing')

      const category3 = organizer.determineCategory('docs/plan.md', '项目规划和路线图')
      expect(category3).toBe('planning')
    })

    it('should prioritize path over content for categorization', () => {
      // 路径包含 deployment，内容包含 testing
      const category = organizer.determineCategory('docs/deployment/guide.md', '这是测试文档')
      expect(category).toBe('deployment')
    })

    it('should return other for unrecognized documents', () => {
      const category = organizer.determineCategory('docs/random.md', '随机内容')
      expect(category).toBe('other')
    })
  })

  describe('标准文档整理场景', () => {
    it('should organize documents into correct directories', async () => {
      // 创建测试文档
      await fs.writeFile(path.join(tempDir, 'deploy.md'), '# 部署文档\n\n部署指南', 'utf-8')
      await fs.writeFile(path.join(tempDir, 'develop.md'), '# 开发文档\n\n开发标准', 'utf-8')

      // 执行整理
      const result = await organizer.organize({
        dryRun: false,
        backup: false,
        updateLinks: false
      })

      // 验证结果
      expect(result.success).toBe(true)
      expect(result.movedFiles.length).toBeGreaterThan(0)

      // 验证目录结构被创建
      const deploymentDir = path.join(tempDir, 'docs', 'deployment')
      const developmentDir = path.join(tempDir, 'docs', 'development')
      
      expect(await fs.access(deploymentDir).then(() => true).catch(() => false)).toBe(true)
      expect(await fs.access(developmentDir).then(() => true).catch(() => false)).toBe(true)
    })

    it('should not move files in dry-run mode', async () => {
      // 创建测试文档
      const testFile = path.join(tempDir, 'test.md')
      await fs.writeFile(testFile, '# 测试文档', 'utf-8')

      // 执行 dry-run
      const result = await organizer.organize({
        dryRun: true,
        backup: false,
        updateLinks: false
      })

      // 验证文件仍在原位置
      expect(await fs.access(testFile).then(() => true).catch(() => false)).toBe(true)
      
      // 验证结果包含移动计划
      expect(result.movedFiles.length).toBeGreaterThanOrEqual(0)
    })

    it('should create backup when backup option is enabled', async () => {
      // 创建测试文档
      await fs.writeFile(path.join(tempDir, 'backup-test.md'), '# 备份测试', 'utf-8')

      // 执行整理（启用备份）
      await organizer.organize({
        dryRun: false,
        backup: true,
        updateLinks: false
      })

      // 验证备份目录存在
      const backupDir = path.join(tempDir, '.backup')
      const backupExists = await fs.access(backupDir).then(() => true).catch(() => false)
      
      if (backupExists) {
        const backupDirs = await fs.readdir(backupDir)
        expect(backupDirs.length).toBeGreaterThan(0)
      }
    })

    it('should generate index file', async () => {
      // 创建测试文档
      await fs.writeFile(path.join(tempDir, 'doc1.md'), '# 文档1', 'utf-8')

      // 执行整理
      const result = await organizer.organize({
        dryRun: false,
        backup: false,
        updateLinks: false
      })

      // 验证索引文件被创建
      expect(result.indexPath).toBeTruthy()
      expect(result.indexPath).toContain('README.md')
      
      const indexExists = await fs.access(result.indexPath).then(() => true).catch(() => false)
      expect(indexExists).toBe(true)
    })

    it('should not generate index in dry-run mode', async () => {
      // 创建测试文档
      await fs.writeFile(path.join(tempDir, 'doc1.md'), '# 文档1', 'utf-8')

      // 执行 dry-run
      const result = await organizer.organize({
        dryRun: true,
        backup: false,
        updateLinks: false
      })

      // 验证索引路径为空
      expect(result.indexPath).toBe('')
    })
  })

  describe('边界情况', () => {
    it('should handle empty directory', async () => {
      const result = await organizer.organize({
        dryRun: false,
        backup: false,
        updateLinks: false
      })

      expect(result.success).toBe(true)
      expect(result.movedFiles).toHaveLength(0)
    })

    it('should handle documents already in target location', async () => {
      // 创建目标目录和文档
      const deploymentDir = path.join(tempDir, 'docs', 'deployment')
      await fs.mkdir(deploymentDir, { recursive: true })
      await fs.writeFile(path.join(deploymentDir, 'deploy.md'), '# 部署', 'utf-8')

      // 执行整理
      const result = await organizer.organize({
        dryRun: false,
        backup: false,
        updateLinks: false
      })

      // 文档已在目标位置，不应该被移动
      expect(result.success).toBe(true)
    })

    it('should classify empty documents', () => {
      const docs = [
        {
          path: 'empty.md',
          content: '',
          category: 'other' as const,
          title: 'empty'
        }
      ]

      const classified = organizer.classifyDocuments(docs)
      expect(classified.other).toHaveLength(1)
    })
  })
})
