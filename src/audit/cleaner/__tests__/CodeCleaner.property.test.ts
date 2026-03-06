/**
 * CodeCleaner 属性测试
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import * as fs from 'fs-extra'
import * as path from 'path'
import { CodeCleaner } from '../CodeCleaner'
import type { DebugCodeLocation } from '../types'

describe('CodeCleaner Property Tests', () => {
  let testDir: string

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = path.join(process.cwd(), '.test-temp', `test-${Date.now()}`)
    await fs.ensureDir(testDir)
  })

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testDir)
  })

  // Feature: code-audit-and-docs-organization, Property 5: 报告完整性
  // **验证需求：4.2**
  it('应该在报告中包含所有发现的 console.debug 位置', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成包含 console.debug 的代码行
        fc.array(
          fc.record({
            fileName: fc.constantFrom('test1.ts', 'test2.js', 'test3.vue'),
            lines: fc.array(
              fc.oneof(
                fc.constant('console.debug("test message")'),
                fc.constant('  console.debug(value)'),
                fc.constant('console.log("normal log")'),
                fc.constant('const x = 42'),
                fc.constant('// 这是注释')
              ),
              { minLength: 1, maxLength: 20 }
            )
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (fileConfigs) => {
          // 创建测试文件
          for (const config of fileConfigs) {
            const filePath = path.join(testDir, config.fileName)
            await fs.writeFile(filePath, config.lines.join('\n'), 'utf-8')
          }

          const cleaner = new CodeCleaner(testDir)
          const locations = await cleaner.scanDebugCode()

          // 计算预期的 console.debug 数量
          let expectedCount = 0
          for (const config of fileConfigs) {
            for (const line of config.lines) {
              if (line.includes('console.debug')) {
                expectedCount++
              }
            }
          }

          // 验证报告包含所有 console.debug
          expect(locations.length).toBe(expectedCount)

          // 验证每个位置都包含必要信息
          for (const location of locations) {
            expect(location.file).toBeTruthy()
            expect(location.line).toBeGreaterThan(0)
            expect(location.column).toBeGreaterThanOrEqual(0)
            expect(location.code).toContain('console.debug')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: code-audit-and-docs-organization, Property 14: 选择性代码删除
  // **验证需求：4.5**
  it('批量清理模式应该只删除 console.debug，保留其他 console 方法', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.constant('console.debug("debug message")'),
            fc.constant('console.log("log message")'),
            fc.constant('console.error("error message")'),
            fc.constant('console.warn("warning message")'),
            fc.constant('console.info("info message")')
          ),
          { minLength: 5, maxLength: 20 }
        ),
        async (lines) => {
          const testFile = path.join(testDir, 'test.ts')
          await fs.writeFile(testFile, lines.join('\n'), 'utf-8')

          // 统计原始的各种 console 调用
          const originalDebugCount = lines.filter(l => l.includes('console.debug')).length
          const originalLogCount = lines.filter(l => l.includes('console.log')).length
          const originalErrorCount = lines.filter(l => l.includes('console.error')).length
          const originalWarnCount = lines.filter(l => l.includes('console.warn')).length
          const originalInfoCount = lines.filter(l => l.includes('console.info')).length

          const cleaner = new CodeCleaner(testDir)
          const result = await cleaner.cleanDebugCode({
            mode: 'batch',
            dryRun: false,
            backup: false
          })

          // 验证删除的数量
          expect(result.removedCount).toBe(originalDebugCount)

          // 读取清理后的文件
          const cleanedContent = await fs.readFile(testFile, 'utf-8')
          const cleanedLines = cleanedContent.split('\n')

          // 验证 console.debug 被删除
          const remainingDebugCount = cleanedLines.filter(l => l.includes('console.debug')).length
          expect(remainingDebugCount).toBe(0)

          // 验证其他 console 方法被保留
          const remainingLogCount = cleanedLines.filter(l => l.includes('console.log')).length
          const remainingErrorCount = cleanedLines.filter(l => l.includes('console.error')).length
          const remainingWarnCount = cleanedLines.filter(l => l.includes('console.warn')).length
          const remainingInfoCount = cleanedLines.filter(l => l.includes('console.info')).length

          expect(remainingLogCount).toBe(originalLogCount)
          expect(remainingErrorCount).toBe(originalErrorCount)
          expect(remainingWarnCount).toBe(originalWarnCount)
          expect(remainingInfoCount).toBe(originalInfoCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('dry-run 模式不应该修改任何文件', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string(),
          { minLength: 5, maxLength: 20 }
        ),
        async (lines) => {
          const testFile = path.join(testDir, 'test.ts')
          const originalContent = lines.join('\n')
          await fs.writeFile(testFile, originalContent, 'utf-8')

          const cleaner = new CodeCleaner(testDir)
          await cleaner.cleanDebugCode({
            mode: 'batch',
            dryRun: true,
            backup: false
          })

          // 验证文件内容未改变
          const afterContent = await fs.readFile(testFile, 'utf-8')
          expect(afterContent).toBe(originalContent)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('扫描结果应该包含准确的行号和列号', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            prefix: fc.constantFrom('', '  ', '    ', '\t'),
            hasDebug: fc.boolean()
          }),
          { minLength: 5, maxLength: 15 }
        ),
        async (lineConfigs) => {
          const lines = lineConfigs.map(config => 
            config.hasDebug 
              ? `${config.prefix}console.debug("test")`
              : `${config.prefix}const x = 42`
          )

          const testFile = path.join(testDir, 'test.ts')
          await fs.writeFile(testFile, lines.join('\n'), 'utf-8')

          const cleaner = new CodeCleaner(testDir)
          const locations = await cleaner.scanDebugCode()

          // 验证每个位置的行号和列号
          for (const location of locations) {
            const lineIndex = location.line - 1
            expect(lineIndex).toBeGreaterThanOrEqual(0)
            expect(lineIndex).toBeLessThan(lines.length)

            const line = lines[lineIndex]
            expect(line).toContain('console.debug')
            
            // 验证列号指向 console.debug 的开始位置
            const expectedColumn = line.indexOf('console.debug')
            expect(location.column).toBe(expectedColumn)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('应该正确处理包含多个 console.debug 的单行代码', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (debugCount) => {
          // 创建包含多个 console.debug 的行
          const debugCalls = Array(debugCount).fill('console.debug("test")').join('; ')
          const testFile = path.join(testDir, 'test.ts')
          await fs.writeFile(testFile, debugCalls, 'utf-8')

          const cleaner = new CodeCleaner(testDir)
          const locations = await cleaner.scanDebugCode()

          // 应该检测到所有的 console.debug
          expect(locations.length).toBe(debugCount)

          // 所有位置应该在同一行
          const uniqueLines = new Set(locations.map(l => l.line))
          expect(uniqueLines.size).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })
})
