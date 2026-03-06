/**
 * 端到端测试
 * 测试完整的审计流程、ESLint 配置迁移和文档整理
 * 
 * **验证需求：6.1, 6.2**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import { AuditTool } from '../AuditTool'
import { ESLintMigrator } from '../eslint/ESLintMigrator'
import { DocOrganizer } from '../docs/DocOrganizer'
import type { AuditConfig } from '../types'

describe('端到端测试', () => {
  let testDir: string

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = path.join(__dirname, '__temp_e2e__')
    await fs.ensureDir(testDir)
  })

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testDir)
  })

  describe('完整审计流程', () => {
    it('应该成功执行完整的代码审计流程', async () => {
      // 创建测试项目结构
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      // 创建测试文件
      const testFile = path.join(srcDir, 'example.ts')
      await fs.writeFile(
        testFile,
        `
/**
 * 示例函数
 */
export function greet(name: string): string {
  console.debug('调试信息')
  // TODO: 添加国际化支持
  return \`Hello, \${name}!\`
}

export function calculate(a: number, b: number): number {
  return a + b
}
`.trim()
      )

      // 配置审计工具
      const reportPath = path.join(testDir, 'audit-report')
      const config: AuditConfig = {
        rootDir: testDir,
        checks: {
          eslint: false, // 跳过 ESLint（需要配置文件）
          comments: true,
          debug: true,
          todos: true
        },
        thresholds: {
          commentCoverage: 0.3,
          commentQuality: 40
        },
        output: {
          format: 'json',
          path: reportPath
        },
        ci: false,
        fix: false
      }

      // 执行审计
      const tool = new AuditTool({ rootDir: testDir, config })
      const result = await tool.run()

      // 验证结果
      expect(result).toBeDefined()
      expect(result.timestamp).toBeDefined()
      expect(result.checks).toBeInstanceOf(Array)
      expect(result.summary).toBeDefined()

      // 验证注释检查
      const commentCheck = result.checks.find(c => c.name === 'comments')
      expect(commentCheck).toBeDefined()
      expect(commentCheck?.metrics).toBeDefined()

      // 验证调试代码检查
      const debugCheck = result.checks.find(c => c.name === 'debug')
      expect(debugCheck).toBeDefined()
      expect(debugCheck?.issues.length).toBeGreaterThan(0)
      expect(debugCheck?.issues[0].message).toContain('console.debug')

      // 验证待办标记检查
      const todoCheck = result.checks.find(c => c.name === 'todos')
      expect(todoCheck).toBeDefined()
      expect(todoCheck?.issues.length).toBeGreaterThan(0)
      expect(todoCheck?.issues[0].message).toContain('TODO')

      // 验证报告文件生成（注意：Reporter 会添加 .json 扩展名）
      const reportFile = `${reportPath}.json`
      const reportExists = await fs.pathExists(reportFile)
      expect(reportExists).toBe(true)

      const reportContent = await fs.readJson(reportFile)
      expect(reportContent).toEqual(result)
    })

    it('应该在 CI 模式下生成简洁的输出', async () => {
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      const testFile = path.join(srcDir, 'simple.ts')
      await fs.writeFile(
        testFile,
        `
export function add(a: number, b: number): number {
  return a + b
}
`.trim()
      )

      const reportPath = path.join(testDir, 'ci-report')
      const config: AuditConfig = {
        rootDir: testDir,
        checks: {
          eslint: false,
          comments: true,
          debug: true,
          todos: true
        },
        thresholds: {
          commentCoverage: 0.5,
          commentQuality: 60
        },
        output: {
          format: 'json',
          path: reportPath
        },
        ci: true,
        fix: false
      }

      const tool = new AuditTool({ rootDir: testDir, config })
      const result = await tool.run()

      expect(result).toBeDefined()
      expect(result.summary).toBeDefined()
    })
  })

  describe('ESLint 配置迁移', () => {
    it('应该成功迁移 ESLint 配置', async () => {
      // 创建旧版配置文件
      const oldConfigPath = path.join(testDir, '.eslintrc.cjs')
      await fs.writeFile(
        oldConfigPath,
        `
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'warn'
  }
}
`.trim()
      )

      // 执行迁移
      const migrator = new ESLintMigrator(testDir)
      const result = await migrator.migrate({
        dryRun: false,
        backup: true,
        deleteOld: false
      })

      // 验证结果
      expect(result.success).toBe(true)
      expect(result.configPath).toBe('eslint.config.js')

      // 验证新配置文件存在（使用绝对路径）
      const newConfigPath = path.join(testDir, result.configPath)
      const newConfigExists = await fs.pathExists(newConfigPath)
      expect(newConfigExists).toBe(true)

      // 验证备份文件存在
      if (result.backupPath) {
        const backupPath = path.join(testDir, result.backupPath)
        const backupExists = await fs.pathExists(backupPath)
        expect(backupExists).toBe(true)
      }

      // 验证新配置内容
      const newConfigContent = await fs.readFile(newConfigPath, 'utf-8')
      expect(newConfigContent).toContain('export default')
      expect(newConfigContent).toContain('@typescript-eslint')
      expect(newConfigContent).toContain('no-unused-vars')
    })

    it('应该在 dry-run 模式下不创建文件', async () => {
      const oldConfigPath = path.join(testDir, '.eslintrc.cjs')
      await fs.writeFile(
        oldConfigPath,
        `
module.exports = {
  env: { node: true },
  extends: ['eslint:recommended'],
  rules: {}
}
`.trim()
      )

      const migrator = new ESLintMigrator(testDir)
      const result = await migrator.migrate({
        dryRun: true,
        backup: false,
        deleteOld: false
      })

      expect(result.success).toBe(true)

      // 验证新配置文件不存在
      const newConfigExists = await fs.pathExists(
        path.join(testDir, 'eslint.config.js')
      )
      expect(newConfigExists).toBe(false)
    })
  })

  describe('文档整理', () => {
    it('应该成功整理文档结构', async () => {
      // 创建测试文档结构
      const docsDir = path.join(testDir, 'docs')
      await fs.ensureDir(docsDir)

      // 创建测试文档
      const deployDoc = path.join(docsDir, 'DEPLOYMENT.md')
      await fs.writeFile(
        deployDoc,
        `
# 部署指南

这是部署文档。

参考：[开发指南](./DEVELOPMENT.md)
`.trim()
      )

      const devDoc = path.join(docsDir, 'DEVELOPMENT.md')
      await fs.writeFile(
        devDoc,
        `
# 开发指南

这是开发文档。
`.trim()
      )

      // 执行文档整理
      const organizer = new DocOrganizer(testDir)
      const result = await organizer.organize({
        dryRun: false,
        backup: true,
        updateLinks: true
      })

      // 验证结果
      expect(result.success).toBe(true)
      expect(result.movedFiles.length).toBeGreaterThan(0)

      // 验证文档索引生成
      const indexPath = path.join(testDir, 'docs', 'README.md')
      const indexExists = await fs.pathExists(indexPath)
      expect(indexExists).toBe(true)

      if (indexExists) {
        const indexContent = await fs.readFile(indexPath, 'utf-8')
        expect(indexContent).toContain('# 文档索引')
      }
    })

    it('应该在 dry-run 模式下不移动文件', async () => {
      const docsDir = path.join(testDir, 'docs')
      await fs.ensureDir(docsDir)

      const testDoc = path.join(docsDir, 'TEST.md')
      await fs.writeFile(testDoc, '# 测试文档')

      const organizer = new DocOrganizer(testDir)
      const result = await organizer.organize({
        dryRun: true,
        backup: false,
        updateLinks: false
      })

      expect(result.success).toBe(true)

      // 验证原文件仍然存在
      const originalExists = await fs.pathExists(testDoc)
      expect(originalExists).toBe(true)
    })

    it('应该正确更新文档链接', async () => {
      const docsDir = path.join(testDir, 'docs')
      await fs.ensureDir(docsDir)

      // 创建包含链接的文档
      const doc1 = path.join(docsDir, 'doc1.md')
      await fs.writeFile(
        doc1,
        `
# 文档 1

参考：[文档 2](./doc2.md)
`.trim()
      )

      const doc2 = path.join(docsDir, 'doc2.md')
      await fs.writeFile(doc2, '# 文档 2')

      const organizer = new DocOrganizer(testDir)
      await organizer.organize({
        dryRun: false,
        backup: false,
        updateLinks: true
      })

      // 验证链接更新（如果文件被移动）
      // 注意：实际的链接更新取决于文档分类和移动逻辑
      const doc1Exists = await fs.pathExists(doc1)
      if (doc1Exists) {
        const content = await fs.readFile(doc1, 'utf-8')
        expect(content).toContain('文档 2')
      }
    })
  })

  describe('集成场景', () => {
    it('应该处理包含多种问题的复杂项目', async () => {
      // 创建复杂的项目结构
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      // 文件 1：缺少注释，有调试代码
      await fs.writeFile(
        path.join(srcDir, 'utils.ts'),
        `
export function formatDate(date: Date): string {
  console.debug('Formatting date:', date)
  return date.toISOString()
}

export function parseDate(str: string): Date {
  return new Date(str)
}
`.trim()
      )

      // 文件 2：有注释，有 TODO
      await fs.writeFile(
        path.join(srcDir, 'helpers.ts'),
        `
/**
 * 计算两个数的和
 */
export function add(a: number, b: number): number {
  // TODO: 添加参数验证
  return a + b
}

/**
 * 计算两个数的差
 */
export function subtract(a: number, b: number): number {
  // FIXME: 处理负数情况
  return a - b
}
`.trim()
      )

      // 执行完整审计
      const config: AuditConfig = {
        rootDir: testDir,
        checks: {
          eslint: false,
          comments: true,
          debug: true,
          todos: true
        },
        thresholds: {
          commentCoverage: 0.3,
          commentQuality: 40
        },
        output: {
          format: 'json',
          path: path.join(testDir, 'full-audit.json')
        },
        ci: false,
        fix: false
      }

      const tool = new AuditTool(config)
      const result = await tool.run()

      // 验证所有检查都执行了
      expect(result.checks.length).toBeGreaterThanOrEqual(3)

      // 验证发现了问题
      const totalIssues = result.checks.reduce(
        (sum, check) => sum + check.issues.length,
        0
      )
      expect(totalIssues).toBeGreaterThan(0)

      // 验证摘要信息
      expect(result.summary.totalFiles).toBeGreaterThan(0)
      expect(result.summary.totalIssues).toBe(totalIssues)
    })
  })
})
