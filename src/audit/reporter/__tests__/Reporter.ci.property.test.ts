/**
 * Reporter CI 模式属性测试
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import * as fs from 'fs-extra'
import * as path from 'path'
import { Reporter } from '../Reporter'
import type { AuditResult, IssueSeverity } from '../../types'

describe('Reporter CI Mode Property Tests', () => {
  let testDir: string
  let reporter: Reporter
  let consoleLogSpy: any

  beforeEach(async () => {
    const parentDir = path.resolve(process.cwd(), '.test-temp')
    await fs.ensureDir(parentDir)
    testDir = await fs.mkdtemp(path.join(parentDir, 'reporter-ci-property-'))
    reporter = new Reporter()
    
    // 监听 console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(async () => {
    expect(path.dirname(path.resolve(testDir))).toBe(path.resolve(process.cwd(), '.test-temp'))
    await fs.remove(testDir)
    consoleLogSpy.mockRestore()
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
    timestamp: fc.date({ noInvalidDate: true }).map(d => d.toISOString()),
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

  // 固定覆盖摘要与明细不一致、以及无问题的 JUnit 报告。
  const emptyResult = {
    success: false,
    timestamp: '1970-01-01T00:00:00.000Z',
    environment: 'test',
    checks: [{ name: 'eslint', passed: false, issues: [], metrics: null }],
    summary: { totalFiles: 0, totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 }
  }
  const inconsistentResult = {
    ...emptyResult,
    checks: [2, 3].map(count => ({
      name: 'eslint', passed: false, metrics: null,
      issues: Array.from({ length: count }, () => ({
        file: 'test.ts', line: 1, column: null, severity: 'error' as const,
        message: '固定错误', rule: null
      }))
    })),
    summary: { ...emptyResult.summary, errorCount: 1 }
  }

  // Feature: code-audit-and-docs-organization, Property 34: CI 模式输出简洁性
  // **验证需求：10.2**
  it('CI 模式的输出应该比普通模式更简洁', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        async (result) => {
          // 清空之前的调用
          consoleLogSpy.mockClear()

          // 调用 CI 模式
          reporter.logCI(result)

          // 获取所有 console.log 调用
          const ciCalls = consoleLogSpy.mock.calls
          const ciOutput = ciCalls.map((call: any[]) => call.join(' ')).join('\n')
          const ciLineCount = ciCalls.length

          // CI 输出应该包含关键信息
          expect(ciOutput).toContain('代码审计结果')
          expect(ciOutput).toContain(result.summary.totalFiles.toString())
          expect(ciOutput).toContain(result.summary.totalIssues.toString())

          // CI 输出应该相对简洁（不超过合理的行数）
          // 预算按实际错误明细计算；随机摘要计数不保证与 checks 一致。
          const actualErrors = result.checks.flatMap(check => check.issues)
            .filter(issue => issue.severity === 'error').length
          const maxExpectedLines = 6 + result.checks.length * 2 + actualErrors
          expect(ciLineCount).toBeLessThanOrEqual(maxExpectedLines)
        }
      ),
      { numRuns: 102, examples: [[inconsistentResult], [emptyResult]] }
    )
  })

  // Feature: code-audit-and-docs-organization, Property 35: JUnit XML 格式有效性
  // **验证需求：10.3**
  it('生成的 JUnit XML 应该符合 XML 格式规范', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        async (result) => {
          const outputPath = path.join(testDir, 'junit.xml')
          
          await reporter.generateJUnit(result, outputPath)
          const xml = await fs.readFile(outputPath, 'utf-8')

          // 验证 XML 声明
          expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')

          // 验证根元素
          expect(xml).toContain('<testsuites')
          expect(xml).toContain('</testsuites>')

          // 验证包含测试套件
          expect(xml).toContain('<testsuite')
          expect(xml).toContain('</testsuite>')

          // 验证基本属性
          expect(xml).toContain('name=')
          expect(xml).toContain('tests=')
          expect(xml).toContain('failures=')
          expect(xml).toContain('errors=')

          // 用 XML 解析器验证结构，声明不是元素，标签计数也无法识别错误嵌套。
          const document = new DOMParser().parseFromString(xml, 'application/xml')
          expect(document.querySelector('parsererror')).toBeNull()
          expect(document.documentElement.tagName).toBe('testsuites')
          expect(document.querySelectorAll('testsuite')).toHaveLength(result.checks.length)
        }
      ),
      { numRuns: 101, examples: [[emptyResult]] }
    )
  })

  it('JUnit XML 应该包含所有检查结果', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        async (result) => {
          const outputPath = path.join(testDir, 'junit.xml')
          
          await reporter.generateJUnit(result, outputPath)
          const xml = await fs.readFile(outputPath, 'utf-8')

          // 每个检查应该有对应的 testsuite
          for (const check of result.checks) {
            expect(xml).toContain(`name="${check.name}"`)
          }

          // 验证摘要信息
          expect(xml).toContain(`failures="${result.summary.errorCount}"`)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('JUnit XML 应该正确转义特殊字符', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          success: fc.boolean(),
          timestamp: fc.date({ noInvalidDate: true }).map(d => d.toISOString()),
          environment: fc.constant('test'),
          checks: fc.array(
            fc.record({
              name: fc.constant('test'),
              passed: fc.constant(false),
              issues: fc.array(
                fc.record({
                  file: fc.constant('test.ts'),
                  line: fc.constant(1),
                  severity: fc.constant('error') as fc.Arbitrary<IssueSeverity>,
                  message: fc.oneof(
                    fc.constant('Message with <tags>'),
                    fc.constant('Message with & ampersand'),
                    fc.constant('Message with "quotes"'),
                    fc.constant("Message with 'apostrophes'")
                  )
                }),
                { minLength: 1, maxLength: 3 }
              )
            }),
            { minLength: 1, maxLength: 2 }
          ),
          summary: fc.record({
            totalFiles: fc.constant(1),
            totalIssues: fc.constant(1),
            errorCount: fc.constant(1),
            warningCount: fc.constant(0),
            infoCount: fc.constant(0)
          })
        }),
        async (result) => {
          const outputPath = path.join(testDir, 'junit.xml')
          
          await reporter.generateJUnit(result, outputPath)
          const xml = await fs.readFile(outputPath, 'utf-8')

          // 验证特殊字符被正确转义
          if (xml.includes('tags')) {
            expect(xml).toContain('&lt;tags&gt;')
            expect(xml).not.toContain('<tags>')
          }
          if (xml.includes('ampersand')) {
            expect(xml).toContain('&amp;')
          }
          if (xml.includes('quotes')) {
            expect(xml).toContain('&quot;')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it.each(['error', 'warning', 'info'] as const)('JUnit XML 应该保留 %s 的路径和元数据原文', async severity => {
    const specialText = '<tag>&"quoted"\'value'
    const result: AuditResult = {
      ...emptyResult,
      checks: [{
        name: specialText,
        passed: false,
        issues: [{ file: specialText, line: 1, column: 0, severity, message: specialText, rule: specialText }]
      }, { name: specialText, passed: true, issues: [] }]
    }
    const outputPath = path.join(testDir, 'special-characters.xml')
    await reporter.generateJUnit(result, outputPath)
    const document = new DOMParser().parseFromString(await fs.readFile(outputPath, 'utf-8'), 'application/xml')

    expect(document.querySelector('parsererror')).toBeNull()
    expect(document.querySelector('testsuite')?.getAttribute('name')).toBe(specialText)
    expect(document.querySelector('testcase')?.getAttribute('name')).toBe(`${specialText}:1`)
    expect(document.querySelector('testcase')?.getAttribute('classname')).toBe(`audit.${specialText}`)
    const emptyTestcase = document.querySelectorAll('testsuite')[1].querySelector('testcase')
    expect(emptyTestcase?.getAttribute('name')).toBe(specialText)
    expect(emptyTestcase?.getAttribute('classname')).toBe(`audit.${specialText}`)
    if (severity === 'error') {
      expect(document.querySelector('failure')?.getAttribute('type')).toBe(specialText)
      expect(document.querySelector('failure')?.getAttribute('message')).toBe(specialText)
      expect(document.querySelector('failure')?.textContent).toContain(`Location: ${specialText}:1:0`)
    } else {
      expect(document.querySelector('failure')).toBeNull()
    }
  })

  it('CI 模式应该输出所有检查的状态', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        async (result) => {
          consoleLogSpy.mockClear()

          reporter.logCI(result)

          const output = consoleLogSpy.mock.calls
            .map((call: any[]) => call.join(' '))
            .join('\n')

          // 每个检查都应该在输出中
          for (const check of result.checks) {
            expect(output).toContain(check.name)
          }

          // 应该显示通过/失败状态
          expect(output).toMatch(/[✓✗]/)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('CI 模式在有错误时应该输出错误详情', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          success: fc.constant(false),
          timestamp: fc.date({ noInvalidDate: true }).map(d => d.toISOString()),
          environment: fc.constant('test'),
          checks: fc.array(
            fc.record({
              name: fc.constantFrom('eslint', 'comments'),
              passed: fc.constant(false),
              issues: fc.array(
                fc.record({
                  file: fc.string({ minLength: 5, maxLength: 20 }),
                  line: fc.integer({ min: 1, max: 100 }),
                  severity: fc.constant('error') as fc.Arbitrary<IssueSeverity>,
                  message: fc.string({ minLength: 10, maxLength: 50 })
                }),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          summary: fc.record({
            totalFiles: fc.integer({ min: 1, max: 10 }),
            totalIssues: fc.integer({ min: 1, max: 20 }),
            errorCount: fc.integer({ min: 1, max: 10 }),
            warningCount: fc.integer({ min: 0, max: 10 }),
            infoCount: fc.constant(0)
          })
        }),
        async (result) => {
          consoleLogSpy.mockClear()

          reporter.logCI(result)

          const output = consoleLogSpy.mock.calls
            .map((call: any[]) => call.join(' '))
            .join('\n')

          // 应该包含错误详情部分
          expect(output).toContain('错误详情')

          // 应该包含错误的文件和行号
          for (const check of result.checks) {
            const errors = check.issues.filter(i => i.severity === 'error')
            for (const error of errors) {
              expect(output).toContain(error.file)
              expect(output).toContain(error.line.toString())
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('JUnit XML 应该正确统计失败数量', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditResultArbitrary,
        async (result) => {
          const outputPath = path.join(testDir, 'junit.xml')
          
          await reporter.generateJUnit(result, outputPath)
          const xml = await fs.readFile(outputPath, 'utf-8')

          // 提取 failures 属性值
          const failuresMatch = xml.match(/failures="(\d+)"/)
          if (failuresMatch) {
            const reportedFailures = parseInt(failuresMatch[1], 10)
            expect(reportedFailures).toBe(result.summary.errorCount)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
