/**
 * AuditTool 单元测试
 * 
 * 测试审计工具的核心功能，包括完整审计流程、选择性检查和自动修复
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AuditTool } from '../AuditTool'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'

describe('AuditTool Unit Tests', () => {
  let tempDir: string

  beforeEach(async () => {
    // 为每个测试创建临时目录
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-test-'))
  })

  afterEach(async () => {
    // 清理临时目录
    await fs.remove(tempDir)
  })

  describe('完整审计流程', () => {
    it('should run complete audit with all checks enabled', async () => {
      // 创建测试文件
      await fs.writeFile(
        path.join(tempDir, 'test.ts'),
        '// 测试文件\nfunction test() {}\nconsole.debug("test")\n// TODO: improve',
        'utf-8'
      )

      // 运行完整审计
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: true, debug: true, todos: true },
          fix: false
        },
        rootDir: tempDir
      })
      const result = await tool.run()

      // 验证结果
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('checks')
      expect(result).toHaveProperty('summary')

      // 验证检查项
      expect(result.checks.length).toBeGreaterThan(0)
      
      // 验证包含注释检查
      const commentCheck = result.checks.find(c => c.name === 'comments')
      expect(commentCheck).toBeDefined()
      
      // 验证包含调试代码检查
      const debugCheck = result.checks.find(c => c.name === 'debug')
      expect(debugCheck).toBeDefined()
      expect(debugCheck?.issues.length).toBeGreaterThan(0)
      
      // 验证包含待办标记检查
      const todoCheck = result.checks.find(c => c.name === 'todos')
      expect(todoCheck).toBeDefined()
      expect(todoCheck?.issues.length).toBeGreaterThan(0)
    })

    it('should handle empty directory', async () => {
      // 运行审计（空目录）
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: false, debug: true, todos: true },
          fix: false
        },
        rootDir: tempDir
      })
      const result = await tool.run()

      // 验证结果（空目录应该成功）
      expect(result.summary.totalFiles).toBe(0)
      expect(result.summary.totalIssues).toBe(0)
      // 注意：success 可能为 false 如果启用了注释检查且质量门槛未达标
      // 这里我们只检查调试代码和待办标记，应该成功
      expect(result.success).toBe(true)
    })
  })

  describe('选择性检查', () => {
    it('should only run enabled checks', async () => {
      // 创建测试文件
      await fs.writeFile(
        path.join(tempDir, 'test.ts'),
        'console.debug("test")\n// TODO: fix',
        'utf-8'
      )

      // 只运行调试代码检查
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: false, debug: true, todos: false },
          fix: false
        },
        rootDir: tempDir
      })
      const result = await tool.run()

      // 验证只有调试代码检查
      expect(result.checks.length).toBe(1)
      expect(result.checks[0].name).toBe('debug')
      expect(result.checks[0].issues.length).toBeGreaterThan(0)
    })

    it('should run multiple selected checks', async () => {
      // 创建测试文件
      await fs.writeFile(
        path.join(tempDir, 'test.ts'),
        'console.debug("test")\n// TODO: fix',
        'utf-8'
      )

      // 运行调试代码和待办标记检查
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: false, debug: true, todos: true },
          fix: false
        },
        rootDir: tempDir
      })
      const result = await tool.run()

      // 验证包含两个检查
      expect(result.checks.length).toBe(2)
      
      const debugCheck = result.checks.find(c => c.name === 'debug')
      expect(debugCheck).toBeDefined()
      
      const todoCheck = result.checks.find(c => c.name === 'todos')
      expect(todoCheck).toBeDefined()
    })
  })

  describe('自动修复功能', () => {
    it('should fix debug code when fix is enabled', async () => {
      const testFile = path.join(tempDir, 'test.ts')
      
      // 创建包含调试代码的文件
      await fs.writeFile(
        testFile,
        'function test() {\n  console.debug("test")\n  return 1\n}',
        'utf-8'
      )

      // 运行审计并修复
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: false, debug: true, todos: false },
          fix: true
        },
        rootDir: tempDir
      })
      await tool.run()

      // 验证文件已被修复
      const content = await fs.readFile(testFile, 'utf-8')
      expect(content).not.toContain('console.debug')
    })

    it('should not modify files when fix is disabled', async () => {
      const testFile = path.join(tempDir, 'test.ts')
      const originalContent = 'function test() {\n  console.debug("test")\n  return 1\n}'
      
      // 创建包含调试代码的文件
      await fs.writeFile(testFile, originalContent, 'utf-8')

      // 运行审计但不修复
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: false, debug: true, todos: false },
          fix: false
        },
        rootDir: tempDir
      })
      await tool.run()

      // 验证文件未被修改
      const content = await fs.readFile(testFile, 'utf-8')
      expect(content).toBe(originalContent)
    })
  })

  describe('质量门槛验证', () => {
    it('should fail when comment quality is below threshold', async () => {
      // 创建低质量文件（缺少注释）
      await fs.writeFile(
        path.join(tempDir, 'test.ts'),
        'function test() {}\nfunction foo() {}\nfunction bar() {}',
        'utf-8'
      )

      // 运行审计，设置高质量门槛
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: true, debug: false, todos: false },
          thresholds: {
            commentCoverage: 0.5,
            commentQuality: 80
          },
          fix: false
        },
        rootDir: tempDir
      })
      const result = await tool.run()

      // 验证：低质量应该导致失败
      expect(result.success).toBe(false)
    })

    it('should pass when comment quality meets threshold', async () => {
      // 创建高质量文件（有注释）
      await fs.writeFile(
        path.join(tempDir, 'test.ts'),
        '/**\n * 测试函数\n */\nfunction test() {}\n\n/**\n * Foo 函数\n */\nfunction foo() {}',
        'utf-8'
      )

      // 运行审计，设置较低质量门槛
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: true, debug: false, todos: false },
          thresholds: {
            commentCoverage: 0.1,
            commentQuality: 30
          },
          fix: false
        },
        rootDir: tempDir
      })
      const result = await tool.run()

      // 验证：高质量应该通过
      expect(result.success).toBe(true)
    })
  })

  describe('结果聚合', () => {
    it('should correctly aggregate summary information', async () => {
      // 创建包含多种问题的文件
      await fs.writeFile(
        path.join(tempDir, 'test1.ts'),
        'console.debug("test")\n// TODO: fix',
        'utf-8'
      )
      await fs.writeFile(
        path.join(tempDir, 'test2.ts'),
        'console.debug("test2")\n// FIXME: improve',
        'utf-8'
      )

      // 运行审计
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: false, debug: true, todos: true },
          fix: false
        },
        rootDir: tempDir
      })
      const result = await tool.run()

      // 验证摘要信息
      expect(result.summary.totalFiles).toBe(2)
      expect(result.summary.totalIssues).toBeGreaterThan(0)
      
      // 验证问题计数
      const totalCounted = result.summary.errorCount + 
                          result.summary.warningCount + 
                          result.summary.infoCount
      expect(totalCounted).toBe(result.summary.totalIssues)
    })
  })

  describe('增量检查模式', () => {
    it('should only check specified files in incremental mode', async () => {
      // 创建多个文件
      await fs.writeFile(
        path.join(tempDir, 'file1.ts'),
        'console.debug("file1")',
        'utf-8'
      )
      await fs.writeFile(
        path.join(tempDir, 'file2.ts'),
        'console.debug("file2")',
        'utf-8'
      )

      // 运行增量检查，只检查 file1.ts
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: false, debug: true, todos: false },
          fix: false
        },
        rootDir: tempDir,
        incremental: true,
        changedFiles: [path.join(tempDir, 'file1.ts')]
      })
      const result = await tool.run()

      // 验证结果
      expect(result.checks.length).toBeGreaterThan(0)
      
      const debugCheck = result.checks.find(c => c.name === 'debug')
      if (debugCheck && debugCheck.issues.length > 0) {
        // 所有问题应该来自 file1.ts
        for (const issue of debugCheck.issues) {
          expect(issue.file).toContain('file1.ts')
        }
      }
    })
  })

  describe('错误处理', () => {
    it('should handle invalid file paths gracefully', async () => {
      // 运行审计，指定不存在的目录
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: true, debug: true, todos: true },
          fix: false
        },
        rootDir: path.join(tempDir, 'nonexistent')
      })
      
      // 应该不抛出异常
      const result = await tool.run()
      expect(result).toBeDefined()
    })
  })

  describe('报告生成', () => {
    it('should generate JSON report', async () => {
      // 创建测试文件
      await fs.writeFile(
        path.join(tempDir, 'test.ts'),
        'console.debug("test")',
        'utf-8'
      )

      // 运行审计
      const tool = new AuditTool({
        config: {
          checks: { eslint: false, comments: false, debug: true, todos: false },
          output: {
            format: 'json',
            path: path.join(tempDir, 'report')
          },
          fix: false
        },
        rootDir: tempDir
      })
      await tool.run()

      // 验证报告文件已生成
      const reportPath = path.join(tempDir, 'report.json')
      const reportExists = await fs.pathExists(reportPath)
      expect(reportExists).toBe(true)

      // 验证报告内容
      const reportContent = await fs.readFile(reportPath, 'utf-8')
      const report = JSON.parse(reportContent)
      expect(report).toHaveProperty('success')
      expect(report).toHaveProperty('checks')
      expect(report).toHaveProperty('summary')
    })
  })
})
