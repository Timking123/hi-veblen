/**
 * Reporter 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import { Reporter } from '../Reporter'
import type { AuditResult } from '../../types'

describe('Reporter', () => {
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

  const createMockResult = (overrides?: Partial<AuditResult>): AuditResult => ({
    success: true,
    timestamp: new Date().toISOString(),
    environment: 'test',
    checks: [
      {
        name: 'eslint',
        passed: true,
        issues: [],
        metrics: {
          filesChecked: 10,
          errors: 0,
          warnings: 2
        }
      }
    ],
    summary: {
      totalFiles: 10,
      totalIssues: 2,
      errorCount: 0,
      warningCount: 2,
      infoCount: 0
    },
    ...overrides
  })

  describe('generateJSON', () => {
    it('应该生成有效的 JSON 文件', async () => {
      const result = createMockResult()
      const outputPath = path.join(testDir, 'report.json')

      await reporter.generateJSON(result, outputPath)

      expect(await fs.pathExists(outputPath)).toBe(true)
      
      const content = await fs.readFile(outputPath, 'utf-8')
      const parsed = JSON.parse(content)
      
      expect(parsed).toEqual(result)
    })

    it('应该创建不存在的目录', async () => {
      const result = createMockResult()
      const outputPath = path.join(testDir, 'nested', 'dir', 'report.json')

      await reporter.generateJSON(result, outputPath)

      expect(await fs.pathExists(outputPath)).toBe(true)
    })

    it('应该格式化 JSON 输出', async () => {
      const result = createMockResult()
      const outputPath = path.join(testDir, 'report.json')

      await reporter.generateJSON(result, outputPath)

      const content = await fs.readFile(outputPath, 'utf-8')
      
      // 格式化的 JSON 应该包含换行和缩进
      expect(content).toContain('\n')
      expect(content).toContain('  ')
    })
  })

  describe('generateHTML', () => {
    it('应该生成有效的 HTML 文件', async () => {
      const result = createMockResult()
      const outputPath = path.join(testDir, 'report.html')

      await reporter.generateHTML(result, outputPath)

      expect(await fs.pathExists(outputPath)).toBe(true)
      
      const html = await fs.readFile(outputPath, 'utf-8')
      
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html')
      expect(html).toContain('</html>')
    })

    it('应该包含审计结果信息', async () => {
      const result = createMockResult({
        environment: 'production',
        summary: {
          totalFiles: 50,
          totalIssues: 10,
          errorCount: 2,
          warningCount: 8,
          infoCount: 0
        }
      })
      const outputPath = path.join(testDir, 'report.html')

      await reporter.generateHTML(result, outputPath)

      const html = await fs.readFile(outputPath, 'utf-8')
      
      expect(html).toContain('production')
      expect(html).toContain('50')
      expect(html).toContain('10')
      expect(html).toContain('2')
      expect(html).toContain('8')
    })

    it('应该显示成功状态', async () => {
      const result = createMockResult({ success: true })
      const outputPath = path.join(testDir, 'report.html')

      await reporter.generateHTML(result, outputPath)

      const html = await fs.readFile(outputPath, 'utf-8')
      
      expect(html).toContain('通过')
      expect(html).toContain('success')
    })

    it('应该显示失败状态', async () => {
      const result = createMockResult({ 
        success: false,
        summary: {
          totalFiles: 10,
          totalIssues: 5,
          errorCount: 5,
          warningCount: 0,
          infoCount: 0
        }
      })
      const outputPath = path.join(testDir, 'report.html')

      await reporter.generateHTML(result, outputPath)

      const html = await fs.readFile(outputPath, 'utf-8')
      
      expect(html).toContain('失败')
      expect(html).toContain('failure')
    })

    it('应该包含所有检查结果', async () => {
      const result = createMockResult({
        checks: [
          {
            name: 'eslint',
            passed: true,
            issues: []
          },
          {
            name: 'comments',
            passed: false,
            issues: [
              {
                file: 'test.ts',
                line: 10,
                severity: 'warning',
                message: '缺少注释'
              }
            ]
          }
        ]
      })
      const outputPath = path.join(testDir, 'report.html')

      await reporter.generateHTML(result, outputPath)

      const html = await fs.readFile(outputPath, 'utf-8')
      
      expect(html).toContain('test.ts')
      expect(html).toContain('10')
      expect(html).toContain('缺少注释')
    })
  })

  describe('generateJUnit', () => {
    it('应该生成有效的 JUnit XML 文件', async () => {
      const result = createMockResult()
      const outputPath = path.join(testDir, 'junit.xml')

      await reporter.generateJUnit(result, outputPath)

      expect(await fs.pathExists(outputPath)).toBe(true)
      
      const xml = await fs.readFile(outputPath, 'utf-8')
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<testsuites')
      expect(xml).toContain('</testsuites>')
    })

    it('应该包含测试套件', async () => {
      const result = createMockResult({
        checks: [
          {
            name: 'eslint',
            passed: true,
            issues: []
          },
          {
            name: 'comments',
            passed: false,
            issues: [
              {
                file: 'test.ts',
                line: 10,
                severity: 'error',
                message: '错误信息'
              }
            ]
          }
        ]
      })
      const outputPath = path.join(testDir, 'junit.xml')

      await reporter.generateJUnit(result, outputPath)

      const xml = await fs.readFile(outputPath, 'utf-8')
      
      expect(xml).toContain('<testsuite name="eslint"')
      expect(xml).toContain('<testsuite name="comments"')
    })

    it('应该包含失败的测试用例', async () => {
      const result = createMockResult({
        checks: [
          {
            name: 'test',
            passed: false,
            issues: [
              {
                file: 'test.ts',
                line: 10,
                severity: 'error',
                message: '测试错误'
              }
            ]
          }
        ],
        summary: {
          totalFiles: 1,
          totalIssues: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0
        }
      })
      const outputPath = path.join(testDir, 'junit.xml')

      await reporter.generateJUnit(result, outputPath)

      const xml = await fs.readFile(outputPath, 'utf-8')
      
      expect(xml).toContain('<failure')
      expect(xml).toContain('测试错误')
      expect(xml).toContain('test.ts:10')
    })

    it('应该正确转义 XML 特殊字符', async () => {
      const result = createMockResult({
        checks: [
          {
            name: 'test',
            passed: false,
            issues: [
              {
                file: 'test.ts',
                line: 1,
                severity: 'error',
                message: 'Error with <tags> & "quotes"'
              }
            ]
          }
        ],
        summary: {
          totalFiles: 1,
          totalIssues: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0
        }
      })
      const outputPath = path.join(testDir, 'junit.xml')

      await reporter.generateJUnit(result, outputPath)

      const xml = await fs.readFile(outputPath, 'utf-8')
      
      expect(xml).toContain('&lt;tags&gt;')
      expect(xml).toContain('&amp;')
      expect(xml).toContain('&quot;')
    })
  })

  describe('logCI', () => {
    let consoleLogSpy: any

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleLogSpy.mockRestore()
    })

    it('应该输出审计摘要', () => {
      const result = createMockResult()

      reporter.logCI(result)

      const output = consoleLogSpy.mock.calls
        .map((call: any[]) => call.join(' '))
        .join('\n')

      expect(output).toContain('代码审计结果')
      expect(output).toContain('通过')
      expect(output).toContain('10') // totalFiles
    })

    it('应该输出每个检查的状态', () => {
      const result = createMockResult({
        checks: [
          {
            name: 'eslint',
            passed: true,
            issues: []
          },
          {
            name: 'comments',
            passed: false,
            issues: [{ file: 'test.ts', line: 1, severity: 'warning', message: 'test' }]
          }
        ]
      })

      reporter.logCI(result)

      const output = consoleLogSpy.mock.calls
        .map((call: any[]) => call.join(' '))
        .join('\n')

      expect(output).toContain('eslint')
      expect(output).toContain('comments')
      expect(output).toContain('✓')
      expect(output).toContain('✗')
    })

    it('应该在有错误时输出错误详情', () => {
      const result = createMockResult({
        success: false,
        checks: [
          {
            name: 'test',
            passed: false,
            issues: [
              {
                file: 'error.ts',
                line: 42,
                severity: 'error',
                message: '严重错误'
              }
            ]
          }
        ],
        summary: {
          totalFiles: 1,
          totalIssues: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0
        }
      })

      reporter.logCI(result)

      const output = consoleLogSpy.mock.calls
        .map((call: any[]) => call.join(' '))
        .join('\n')

      expect(output).toContain('错误详情')
      expect(output).toContain('error.ts')
      expect(output).toContain('42')
      expect(output).toContain('严重错误')
    })
  })
})
