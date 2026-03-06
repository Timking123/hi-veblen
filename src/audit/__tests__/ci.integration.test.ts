/**
 * CI/CD 集成测试
 * 测试 CI 模式输出、JUnit XML 报告生成和质量门槛验证
 * 
 * **验证需求：10.1, 10.2, 10.3, 10.4, 10.5**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import { AuditTool } from '../AuditTool'
import type { AuditConfig } from '../types'

describe('CI/CD 集成测试', () => {
  let testDir: string

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = path.join(__dirname, '__temp_ci__')
    await fs.ensureDir(testDir)
  })

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testDir)
  })

  describe('CI 模式输出', () => {
    it('应该在 CI 模式下输出简洁的日志', async () => {
      // 创建测试文件
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      await fs.writeFile(
        path.join(srcDir, 'test.ts'),
        `
export function test(): void {
  console.debug('debug')
}
`.trim()
      )

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
          path: path.join(testDir, 'ci-report')
        },
        ci: true,
        fix: false
      }

      const tool = new AuditTool({ rootDir: testDir, config })
      const result = await tool.run()

      // 验证结果结构
      expect(result).toBeDefined()
      expect(result.success).toBeDefined()
      expect(result.checks).toBeInstanceOf(Array)
      expect(result.summary).toBeDefined()

      // CI 模式应该生成报告
      const reportPath = `${config.output.path}.json`
      const reportExists = await fs.pathExists(reportPath)
      expect(reportExists).toBe(true)
    })

    it('应该在 CI 模式下正确标识失败状态', async () => {
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      // 创建质量不达标的文件
      await fs.writeFile(
        path.join(srcDir, 'bad.ts'),
        `
export function func1(): void {}
export function func2(): void {}
export function func3(): void {}
`.trim()
      )

      const config: AuditConfig = {
        rootDir: testDir,
        checks: {
          eslint: false,
          comments: true,
          debug: false,
          todos: false
        },
        thresholds: {
          commentCoverage: 0.8, // 高阈值
          commentQuality: 80    // 高阈值
        },
        output: {
          format: 'json',
          path: path.join(testDir, 'fail-report')
        },
        ci: true,
        fix: false
      }

      const tool = new AuditTool({ rootDir: testDir, config })
      const result = await tool.run()

      // 应该失败（因为注释质量不达标）
      expect(result.success).toBe(false)
    })
  })

  describe('JUnit XML 报告生成', () => {
    it('应该生成有效的 JUnit XML 报告', async () => {
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      await fs.writeFile(
        path.join(srcDir, 'example.ts'),
        `
/**
 * 示例函数
 */
export function example(): string {
  // TODO: 实现功能
  return 'example'
}
`.trim()
      )

      const reportPath = path.join(testDir, 'junit-report')
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
          format: 'junit',
          path: reportPath
        },
        ci: true,
        fix: false
      }

      const tool = new AuditTool({ rootDir: testDir, config })
      await tool.run()

      // 验证 JUnit XML 文件生成
      const xmlPath = `${reportPath}.xml`
      const xmlExists = await fs.pathExists(xmlPath)
      expect(xmlExists).toBe(true)

      // 验证 XML 内容
      const xmlContent = await fs.readFile(xmlPath, 'utf-8')
      expect(xmlContent).toContain('<?xml version="1.0"')
      expect(xmlContent).toContain('<testsuites')
      expect(xmlContent).toContain('<testsuite')
      expect(xmlContent).toContain('</testsuites>')

      // 验证包含检查结果
      expect(xmlContent).toContain('comments')
      expect(xmlContent).toContain('debug')
      expect(xmlContent).toContain('todos')
    })

    it('JUnit XML 报告应该包含失败的测试用例', async () => {
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      await fs.writeFile(
        path.join(srcDir, 'bad.ts'),
        `
export function noComment(): void {
  console.debug('test')
}
`.trim()
      )

      const reportPath = path.join(testDir, 'junit-fail')
      const config: AuditConfig = {
        rootDir: testDir,
        checks: {
          eslint: false,
          comments: true,
          debug: true,
          todos: false
        },
        thresholds: {
          commentCoverage: 0.9,
          commentQuality: 90
        },
        output: {
          format: 'junit',
          path: reportPath
        },
        ci: true,
        fix: false
      }

      const tool = new AuditTool({ rootDir: testDir, config })
      const result = await tool.run()

      expect(result.success).toBe(false)

      // 验证 XML 包含失败信息
      const xmlPath = `${reportPath}.xml`
      const xmlContent = await fs.readFile(xmlPath, 'utf-8')
      
      // 应该包含 failure 标签
      expect(xmlContent).toContain('<failure')
    })
  })

  describe('质量门槛验证', () => {
    it('应该在达到质量门槛时返回成功', async () => {
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      // 创建高质量代码
      await fs.writeFile(
        path.join(srcDir, 'good.ts'),
        `
/**
 * 优秀的函数
 * 有完整的中文注释
 */
export function goodFunction(): string {
  return 'good'
}

/**
 * 另一个优秀的函数
 * 也有完整的中文注释
 */
export function anotherGoodFunction(): number {
  return 42
}
`.trim()
      )

      const config: AuditConfig = {
        rootDir: testDir,
        checks: {
          eslint: false,
          comments: true,
          debug: true,
          todos: false
        },
        thresholds: {
          commentCoverage: 0.5,
          commentQuality: 60
        },
        output: {
          format: 'json',
          path: path.join(testDir, 'pass-report')
        },
        ci: true,
        fix: false
      }

      const tool = new AuditTool({ rootDir: testDir, config })
      const result = await tool.run()

      // 应该通过
      expect(result.success).toBe(true)
      expect(result.summary.errorCount).toBe(0)
    })

    it('应该在未达到注释覆盖率门槛时返回失败', async () => {
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      // 创建低覆盖率代码
      await fs.writeFile(
        path.join(srcDir, 'low-coverage.ts'),
        `
export function func1(): void {}
export function func2(): void {}
export function func3(): void {}
export function func4(): void {}
export function func5(): void {}
`.trim()
      )

      const config: AuditConfig = {
        rootDir: testDir,
        checks: {
          eslint: false,
          comments: true,
          debug: false,
          todos: false
        },
        thresholds: {
          commentCoverage: 0.8, // 要求 80% 覆盖率
          commentQuality: 50
        },
        output: {
          format: 'json',
          path: path.join(testDir, 'low-coverage-report')
        },
        ci: true,
        fix: false
      }

      const tool = new AuditTool({ rootDir: testDir, config })
      const result = await tool.run()

      // 应该失败
      expect(result.success).toBe(false)

      // 验证注释检查失败
      const commentCheck = result.checks.find(c => c.name === 'comments')
      expect(commentCheck).toBeDefined()
      expect(commentCheck?.passed).toBe(false)
    })

    it('应该在未达到注释质量门槛时返回失败', async () => {
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      // 创建低质量代码（有注释但质量不高）
      await fs.writeFile(
        path.join(srcDir, 'low-quality.ts'),
        `
// 简单注释
export function func1(): void {}

// 另一个简单注释
export function func2(): void {}
`.trim()
      )

      const config: AuditConfig = {
        rootDir: testDir,
        checks: {
          eslint: false,
          comments: true,
          debug: false,
          todos: false
        },
        thresholds: {
          commentCoverage: 0.3,
          commentQuality: 90 // 要求很高的质量
        },
        output: {
          format: 'json',
          path: path.join(testDir, 'low-quality-report')
        },
        ci: true,
        fix: false
      }

      const tool = new AuditTool({ rootDir: testDir, config })
      const result = await tool.run()

      // 应该失败
      expect(result.success).toBe(false)
    })

    it('应该在有错误时返回失败状态', async () => {
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      // 创建有问题的代码
      await fs.writeFile(
        path.join(srcDir, 'errors.ts'),
        `
export class MyClass {
  method(): void {
    console.debug('debug')
  }
}
`.trim()
      )

      const config: AuditConfig = {
        rootDir: testDir,
        checks: {
          eslint: false,
          comments: true,
          debug: true,
          todos: false
        },
        thresholds: {
          commentCoverage: 0.3,
          commentQuality: 40
        },
        output: {
          format: 'json',
          path: path.join(testDir, 'errors-report')
        },
        ci: true,
        fix: false
      }

      const tool = new AuditTool({ rootDir: testDir, config })
      const result = await tool.run()

      // 验证有错误
      expect(result.summary.errorCount).toBeGreaterThan(0)
    })
  })

  describe('报告格式验证', () => {
    it('应该支持多种报告格式', async () => {
      const srcDir = path.join(testDir, 'src')
      await fs.ensureDir(srcDir)

      await fs.writeFile(
        path.join(srcDir, 'test.ts'),
        `
/**
 * 测试函数
 */
export function test(): void {}
`.trim()
      )

      // 测试 JSON 格式
      const jsonConfig: AuditConfig = {
        rootDir: testDir,
        checks: {
          eslint: false,
          comments: true,
          debug: false,
          todos: false
        },
        thresholds: {
          commentCoverage: 0.3,
          commentQuality: 40
        },
        output: {
          format: 'json',
          path: path.join(testDir, 'report-json')
        },
        ci: true,
        fix: false
      }

      const jsonTool = new AuditTool({ rootDir: testDir, config: jsonConfig })
      await jsonTool.run()

      const jsonExists = await fs.pathExists(`${jsonConfig.output.path}.json`)
      expect(jsonExists).toBe(true)

      // 测试 HTML 格式
      const htmlConfig: AuditConfig = {
        ...jsonConfig,
        output: {
          format: 'html',
          path: path.join(testDir, 'report-html')
        }
      }

      const htmlTool = new AuditTool({ rootDir: testDir, config: htmlConfig })
      await htmlTool.run()

      const htmlExists = await fs.pathExists(`${htmlConfig.output.path}.html`)
      expect(htmlExists).toBe(true)

      // 测试 JUnit 格式
      const junitConfig: AuditConfig = {
        ...jsonConfig,
        output: {
          format: 'junit',
          path: path.join(testDir, 'report-junit')
        }
      }

      const junitTool = new AuditTool({ rootDir: testDir, config: junitConfig })
      await junitTool.run()

      const junitExists = await fs.pathExists(`${junitConfig.output.path}.xml`)
      expect(junitExists).toBe(true)
    })
  })
})
