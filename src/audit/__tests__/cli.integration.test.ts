/**
 * CLI 集成测试
 * 
 * 测试命令行接口的基本功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawnSync } from 'child_process'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'

describe('CLI Integration Tests', () => {
  let tempDir: string
  const cliPath = path.resolve('src/audit/cli.ts')
  const tsxPath = path.resolve('node_modules/tsx/dist/cli.mjs')
  const runCLI = (...args: string[]) => {
    // 使用锁定安装的解释器；临时 cwd 不能触发 npx 联网下载。
    const result = spawnSync(process.execPath, [tsxPath, cliPath, ...args], {
      encoding: 'utf-8', cwd: tempDir, timeout: 15000,
    })
    expect(result.error).toBeUndefined()
    return result
  }
  const help = (...args: string[]) => {
    const result = runCLI(...args)
    expect(result.status, result.stderr).toBe(0)
    return result.stdout
  }

  beforeEach(async () => {
    // 为每个测试创建临时目录
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-test-'))
  })

  afterEach(async () => {
    // 清理临时目录
    await fs.remove(tempDir)
  })

  describe('audit 命令', () => {
    it('should display help for audit command', () => {
      const output = help('audit', '--help')

      expect(output).toContain('运行代码审计')
      expect(output).toContain('--comments')
      expect(output).toContain('--debug')
      expect(output).toContain('--todos')
    })

    it('should run audit command successfully', () => {
      // 创建测试文件
      const testFile = path.join(tempDir, 'test.ts')
      fs.writeFileSync(testFile, '// 测试文件\nfunction test() {}', 'utf-8')

      const result = runCLI('audit', '--debug')
      expect(result.status, result.stderr).toBe(0)
      const report = fs.readJsonSync(path.join(tempDir, 'audit-report.json'))
      expect(report.success).toBe(true)
      expect(report.summary.totalFiles).toBe(1)
      expect(report.checks).toEqual([expect.objectContaining({
        name: 'debug', passed: true, issues: [], metrics: { debugCodeCount: 0 },
      })])
    })

    it('报告无法写入时必须返回失败退出码', () => {
      const occupied = path.join(tempDir, 'occupied')
      fs.writeFileSync(occupied, '保留原有文件', 'utf-8')
      const result = runCLI('audit', '--debug', '--output', path.join(occupied, 'report'))
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('审计失败')
      expect(fs.readFileSync(occupied, 'utf-8')).toBe('保留原有文件')
    })

    it('真实子进程必须读到调试代码和待办哨兵', () => {
      const testFile = path.join(tempDir, 'sentinel.ts')
      fs.writeFileSync(testFile, "console.debug('合成哨兵')\n// FIXME: 合成待办\n", 'utf-8')
      const result = runCLI('audit', '--debug', '--todos')
      // FIXME 属于高优先级问题，真实质量门应拒绝该合成输入。
      expect(result.status, result.stderr).toBe(1)
      const report = fs.readJsonSync(path.join(tempDir, 'audit-report.json'))
      expect(report.success).toBe(false)
      expect(report.summary.totalFiles).toBe(1)
      expect(report.checks).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'debug', passed: false, issues: [expect.objectContaining({ file: testFile, line: 1, rule: 'no-debug-code' })] }),
        expect.objectContaining({ name: 'todos', issues: [expect.objectContaining({ file: testFile, line: 2 })] }),
      ]))
    })
  })

  describe('migrate-eslint 命令', () => {
    it('should display help for migrate-eslint command', () => {
      const output = help('migrate-eslint', '--help')

      expect(output).toContain('迁移 ESLint 配置')
      expect(output).toContain('--dry-run')
      expect(output).toContain('--backup')
    })
  })

  describe('organize-docs 命令', () => {
    it('should display help for organize-docs command', () => {
      const output = help('organize-docs', '--help')

      expect(output).toContain('整理文档结构')
      expect(output).toContain('--dry-run')
      expect(output).toContain('--backup')
    })
  })

  describe('版本和帮助', () => {
    it('should display version', () => {
      const output = help('--version')

      expect(output).toContain('1.0.0')
    })

    it('should display help', () => {
      const output = help('--help')

      expect(output).toContain('代码审计和文档整理工具')
      expect(output).toContain('audit')
      expect(output).toContain('migrate-eslint')
      expect(output).toContain('organize-docs')
    })
  })
})
