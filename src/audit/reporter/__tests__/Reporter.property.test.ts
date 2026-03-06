/**
 * Reporter 属性测试
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import * as fs from 'fs-extra'
import * as path from 'path'
import { Reporter } from '../Reporter'
import type { AuditResult, CheckResult, Issue, IssueSeverity } from '../../types'

describe('Reporter Property Tests', () => {
  let testDir: string
  let reporter: Reporter

  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.test-temp', `test-${Date.now()}`)
    await fs.ensureDir(testDir)
    reporter = new Reporter()
  })

  afterEach(async () => {
    await fs.remove(testDir)
  })

  // 生成审计结果的 arbitrary
  const issueArbitrary = fc.record({
    file: fc.string({ minLength: 1, maxLength: 50 }),
    line: fc.integer({ min: 1, max: 1000 }),
    column: fc.option(fc.integer({ min: 0, max: 100 })),
    severity: fc.constantFrom('error', 'warning', 'info') as fc.Arbitrary<IssueSeverity>,
    message: fc.string({ minLength: 5, maxLength: 100 }),
    rule: fc.option(fc.string({ minLength: 3, maxLength: 20 }))
  })

  const checkResultArbitrary = fc.record({
    name: fc.constantFrom('eslint', 'comments', 'debug', 'todos'),
    passed: fc.boolean(),
    issues: fc.array(issueArbitrary, { maxLength: 10 }),
    metrics: fc.option(fc.record({
      filesChecked: fc.integer({ min: 0, max: 100 }),
      errors: fc.integer({ min: 0, max: 50 }),
      warnings: fc.integer({ min: 0, max: 50 })
    }))
  })

  const auditResultArbitrary = fc.record({
    success: fc.boolean(),
    timestamp: fc.date().map(d => d.toISOString()),
    environment: fc.constantFrom('development', 'production', 'test'),
    checks: fc.array(checkResultArbitrary, { minLength: 1, maxLength: 5 }),
    summary: fc.record({
      totalFiles: fc.integer({ min: 0, max: 100 }),
      totalIssues: fc.integer({ min: 0, max: 100 }),
      errorCount: fc.integer({ min: 0, max: 50 }),
      warningCount: fc.integer({ min: 0, max: 50 }),
      infoCount: fc.integer({ min: 0, max: 50 })
    })
  })

  // Feature: code-audit-and-docs-organization, Property 7: JSON 序列化往返
  // **验证需求：2.6**
  it('JSON 报告序列化后应该可以完整还原', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        async (result) => {
          const outputPath = path.join(testDir, 'report.json')
          
          // 生成 JSON 报告
          await reporter.generateJSON(result, outputPath)

          // 读取并解析
          const content = await fs.readFile(outputPath, 'utf-8')
          const parsed = JSON.parse(content)

          // 验证结构完整性
          expect(parsed).toEqual(result)
          expect(parsed.success).toBe(result.success)
          expect(parsed.timestamp).toBe(result.timestamp)
          expect(parsed.environment).toBe(result.environment)
          expect(parsed.checks).toHaveLength(result.checks.length)
          expect(parsed.summary).toEqual(result.summary)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: code-audit-and-docs-organization, Property 20: HTML 报告格式有效性
  // **验证需求：6.5**
  it('生成的 HTML 应该是有效的 HTML5 文档', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        async (result) => {
          const outputPath = path.join(testDir, 'report.html')
          
          // 生成 HTML 报告
          await reporter.generateHTML(result, outputPath)

          // 读取 HTML
          const html = await fs.readFile(outputPath, 'utf-8')

          // 验证基本 HTML 结构
          expect(html).toContain('<!DOCTYPE html>')
          expect(html).toContain('<html')
          expect(html).toContain('</html>')
          expect(html).toContain('<head>')
          expect(html).toContain('</head>')
          expect(html).toContain('<body>')
          expect(html).toContain('</body>')

          // 验证必要的元素
          expect(html).toContain('<meta charset="UTF-8">')
          expect(html).toContain('<title>')
          
          // 验证包含审计结果信息
          expect(html).toContain('代码审计报告')
          expect(html).toContain(result.environment)
          
          // 验证包含摘要信息
          expect(html).toContain(result.summary.totalFiles.toString())
          expect(html).toContain(result.summary.totalIssues.toString())
          expect(html).toContain(result.summary.errorCount.toString())
          expect(html).toContain(result.summary.warningCount.toString())

          // 验证包含检查结果
          for (const check of result.checks) {
            // 检查名称应该出现在 HTML 中
            const hasCheckName = html.includes(check.name) || 
                                 html.includes('ESLint') || 
                                 html.includes('注释') ||
                                 html.includes('调试') ||
                                 html.includes('待办')
            expect(hasCheckName).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('HTML 报告应该包含所有问题的详细信息', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        async (result) => {
          const outputPath = path.join(testDir, 'report.html')
          
          await reporter.generateHTML(result, outputPath)
          const html = await fs.readFile(outputPath, 'utf-8')

          // 验证每个问题都在 HTML 中
          for (const check of result.checks) {
            for (const issue of check.issues) {
              // 文件路径应该出现
              expect(html).toContain(issue.file)
              
              // 行号应该出现
              expect(html).toContain(issue.line.toString())
              
              // 问题消息应该出现
              expect(html).toContain(issue.message)
              
              // 严重程度应该出现
              expect(html).toContain(issue.severity)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('JSON 报告应该包含所有检查结果', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        async (result) => {
          const outputPath = path.join(testDir, 'report.json')
          
          await reporter.generateJSON(result, outputPath)
          const content = await fs.readFile(outputPath, 'utf-8')
          const parsed = JSON.parse(content)

          // 验证所有检查都被包含
          expect(parsed.checks).toHaveLength(result.checks.length)
          
          for (let i = 0; i < result.checks.length; i++) {
            const originalCheck = result.checks[i]
            const parsedCheck = parsed.checks[i]
            
            expect(parsedCheck.name).toBe(originalCheck.name)
            expect(parsedCheck.passed).toBe(originalCheck.passed)
            expect(parsedCheck.issues).toHaveLength(originalCheck.issues.length)
            
            // 验证每个问题
            for (let j = 0; j < originalCheck.issues.length; j++) {
              const originalIssue = originalCheck.issues[j]
              const parsedIssue = parsedCheck.issues[j]
              
              expect(parsedIssue.file).toBe(originalIssue.file)
              expect(parsedIssue.line).toBe(originalIssue.line)
              expect(parsedIssue.severity).toBe(originalIssue.severity)
              expect(parsedIssue.message).toBe(originalIssue.message)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('生成的文件应该可以被成功创建', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        fc.constantFrom('json', 'html'),
        async (result, format) => {
          const outputPath = path.join(testDir, `report.${format}`)
          
          if (format === 'json') {
            await reporter.generateJSON(result, outputPath)
          } else {
            await reporter.generateHTML(result, outputPath)
          }

          // 验证文件存在
          const exists = await fs.pathExists(outputPath)
          expect(exists).toBe(true)

          // 验证文件不为空
          const stats = await fs.stat(outputPath)
          expect(stats.size).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('HTML 报告应该正确显示成功/失败状态', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        async (result) => {
          const outputPath = path.join(testDir, 'report.html')
          
          await reporter.generateHTML(result, outputPath)
          const html = await fs.readFile(outputPath, 'utf-8')

          if (result.success) {
            expect(html).toContain('通过')
            expect(html).toContain('success')
          } else {
            expect(html).toContain('失败')
            expect(html).toContain('failure')
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
