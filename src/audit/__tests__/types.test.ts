/**
 * 核心类型定义测试
 */

import { describe, it, expect } from 'vitest'
import type {
  AuditResult,
  AuditConfig,
  CheckResult,
  Issue,
  AuditSummary
} from '../types'

describe('核心类型定义', () => {
  it('应该能够创建有效的 Issue 对象', () => {
    const issue: Issue = {
      file: 'src/test.ts',
      line: 10,
      column: 5,
      severity: 'warning',
      message: '缺少中文注释',
      rule: 'missing-chinese-comment'
    }

    expect(issue.file).toBe('src/test.ts')
    expect(issue.severity).toBe('warning')
  })

  it('应该能够创建有效的 CheckResult 对象', () => {
    const checkResult: CheckResult = {
      name: 'eslint',
      passed: true,
      issues: [],
      metrics: {
        filesChecked: 100,
        errors: 0,
        warnings: 5
      }
    }

    expect(checkResult.name).toBe('eslint')
    expect(checkResult.passed).toBe(true)
    expect(checkResult.metrics?.filesChecked).toBe(100)
  })

  it('应该能够创建有效的 AuditSummary 对象', () => {
    const summary: AuditSummary = {
      totalFiles: 150,
      totalIssues: 23,
      errorCount: 0,
      warningCount: 23,
      infoCount: 0
    }

    expect(summary.totalFiles).toBe(150)
    expect(summary.totalIssues).toBe(23)
  })

  it('应该能够创建有效的 AuditResult 对象', () => {
    const result: AuditResult = {
      success: false,
      timestamp: '2024-01-15T10:30:00Z',
      environment: 'development',
      checks: [
        {
          name: 'eslint',
          passed: true,
          issues: []
        }
      ],
      summary: {
        totalFiles: 150,
        totalIssues: 23,
        errorCount: 0,
        warningCount: 23,
        infoCount: 0
      }
    }

    expect(result.success).toBe(false)
    expect(result.checks).toHaveLength(1)
    expect(result.summary.totalIssues).toBe(23)
  })

  it('应该能够创建有效的 AuditConfig 对象', () => {
    const config: AuditConfig = {
      checks: {
        eslint: true,
        comments: true,
        debug: true,
        todos: true
      },
      thresholds: {
        commentCoverage: 0.6,
        commentQuality: 60
      },
      output: {
        format: 'json',
        path: './audit-report.json'
      },
      ci: false,
      fix: false
    }

    expect(config.checks.eslint).toBe(true)
    expect(config.thresholds.commentCoverage).toBe(0.6)
    expect(config.output.format).toBe('json')
  })
})
