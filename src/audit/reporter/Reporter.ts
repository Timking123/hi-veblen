/**
 * 报告生成器
 * 负责生成 JSON、HTML 和 JUnit XML 格式的审计报告
 */

import * as fs from 'fs-extra'
import * as path from 'path'
import type { AuditResult } from '../types'

/**
 * 报告生成器类
 */
export class Reporter {
  /**
   * 生成 JSON 报告
   * @param result 审计结果
   * @param outputPath 输出路径
   */
  async generateJSON(result: AuditResult, outputPath: string): Promise<void> {
    await fs.ensureDir(path.dirname(outputPath))
    const json = JSON.stringify(result, null, 2)
    await fs.writeFile(outputPath, json, 'utf-8')
  }

  /**
   * 生成 HTML 报告
   * @param result 审计结果
   * @param outputPath 输出路径
   */
  async generateHTML(result: AuditResult, outputPath: string): Promise<void> {
    await fs.ensureDir(path.dirname(outputPath))
    const html = this.generateHTMLContent(result)
    await fs.writeFile(outputPath, html, 'utf-8')
  }

  /**
   * 生成 HTML 内容
   * @param result 审计结果
   * @returns HTML 字符串
   */
  private generateHTMLContent(result: AuditResult): string {
    const { success, timestamp, environment, checks, summary } = result

    const statusClass = success ? 'success' : 'failure'
    const statusText = success ? '通过' : '失败'

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>代码审计报告</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header .meta {
      opacity: 0.9;
      font-size: 14px;
    }
    .status {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      margin-top: 15px;
    }
    .status.success {
      background: #10b981;
      color: white;
    }
    .status.failure {
      background: #ef4444;
      color: white;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-item {
      text-align: center;
    }
    .summary-item .value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .summary-item .label {
      font-size: 14px;
      color: #6b7280;
      margin-top: 5px;
    }
    .summary-item.error .value {
      color: #ef4444;
    }
    .summary-item.warning .value {
      color: #f59e0b;
    }
    .checks {
      padding: 30px;
    }
    .check {
      margin-bottom: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .check-header {
      background: #f9fafb;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e5e7eb;
    }
    .check-title {
      font-size: 18px;
      font-weight: 600;
    }
    .check-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .check-badge.passed {
      background: #d1fae5;
      color: #065f46;
    }
    .check-badge.failed {
      background: #fee2e2;
      color: #991b1b;
    }
    .check-metrics {
      padding: 15px 20px;
      background: #fafafa;
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .metric {
      font-size: 14px;
      color: #6b7280;
    }
    .metric strong {
      color: #111827;
    }
    .issues {
      padding: 20px;
    }
    .issue {
      padding: 12px;
      margin-bottom: 10px;
      border-left: 4px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 4px;
    }
    .issue.error {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    .issue.warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }
    .issue.info {
      border-left-color: #3b82f6;
      background: #eff6ff;
    }
    .issue-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 5px;
    }
    .issue-severity {
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .issue-severity.error {
      background: #ef4444;
      color: white;
    }
    .issue-severity.warning {
      background: #f59e0b;
      color: white;
    }
    .issue-severity.info {
      background: #3b82f6;
      color: white;
    }
    .issue-location {
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
    }
    .issue-message {
      font-size: 14px;
      color: #374151;
      margin-top: 5px;
    }
    .no-issues {
      padding: 20px;
      text-align: center;
      color: #6b7280;
    }
    .footer {
      padding: 20px 30px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>代码审计报告</h1>
      <div class="meta">
        <div>生成时间: ${new Date(timestamp).toLocaleString('zh-CN')}</div>
        <div>运行环境: ${environment}</div>
      </div>
      <div class="status ${statusClass}">${statusText}</div>
    </div>

    <div class="summary">
      <div class="summary-item">
        <div class="value">${summary.totalFiles}</div>
        <div class="label">检查文件数</div>
      </div>
      <div class="summary-item">
        <div class="value">${summary.totalIssues}</div>
        <div class="label">问题总数</div>
      </div>
      <div class="summary-item error">
        <div class="value">${summary.errorCount}</div>
        <div class="label">错误</div>
      </div>
      <div class="summary-item warning">
        <div class="value">${summary.warningCount}</div>
        <div class="label">警告</div>
      </div>
      <div class="summary-item">
        <div class="value">${summary.infoCount}</div>
        <div class="label">信息</div>
      </div>
    </div>

    <div class="checks">
      ${checks.map(check => this.generateCheckHTML(check)).join('\n')}
    </div>

    <div class="footer">
      代码审计工具 v1.0.0 | 生成于 ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`
  }

  /**
   * 生成单个检查的 HTML
   * @param check 检查结果
   * @returns HTML 字符串
   */
  private generateCheckHTML(check: any): string {
    const badgeClass = check.passed ? 'passed' : 'failed'
    const badgeText = check.passed ? '通过' : '失败'

    const metricsHTML = check.metrics
      ? Object.entries(check.metrics)
          .map(([key, value]) => `<div class="metric"><strong>${value}</strong> ${this.translateMetricKey(key)}</div>`)
          .join('')
      : ''

    const issuesHTML = check.issues.length > 0
      ? `<div class="issues">
          ${check.issues.map((issue: any) => this.generateIssueHTML(issue)).join('\n')}
         </div>`
      : '<div class="no-issues">✓ 未发现问题</div>'

    return `
      <div class="check">
        <div class="check-header">
          <div class="check-title">${this.translateCheckName(check.name)}</div>
          <div class="check-badge ${badgeClass}">${badgeText}</div>
        </div>
        ${metricsHTML ? `<div class="check-metrics">${metricsHTML}</div>` : ''}
        ${issuesHTML}
      </div>
    `
  }

  /**
   * 生成单个问题的 HTML
   * @param issue 问题详情
   * @returns HTML 字符串
   */
  private generateIssueHTML(issue: any): string {
    const location = issue.column !== undefined
      ? `${issue.file}:${issue.line}:${issue.column}`
      : `${issue.file}:${issue.line}`

    return `
      <div class="issue ${issue.severity}">
        <div class="issue-header">
          <span class="issue-severity ${issue.severity}">${issue.severity}</span>
          <span class="issue-location">${location}</span>
          ${issue.rule ? `<span class="issue-rule">[${issue.rule}]</span>` : ''}
        </div>
        <div class="issue-message">${issue.message}</div>
      </div>
    `
  }

  /**
   * 翻译检查名称
   * @param name 检查名称
   * @returns 中文名称
   */
  private translateCheckName(name: string): string {
    const translations: Record<string, string> = {
      'eslint': 'ESLint 检查',
      'comments': '注释检查',
      'debug': '调试代码检查',
      'todos': '待办标记检查'
    }
    return translations[name] || name
  }

  /**
   * 翻译指标键名
   * @param key 指标键
   * @returns 中文名称
   */
  private translateMetricKey(key: string): string {
    const translations: Record<string, string> = {
      'filesChecked': '个文件',
      'errors': '个错误',
      'warnings': '个警告',
      'averageCoverage': '平均覆盖率',
      'averageQuality': '平均质量',
      'lowQualityFiles': '个低质量文件'
    }
    return translations[key] || key
  }

  /**
   * 生成 JUnit XML 报告
   * @param result 审计结果
   * @param outputPath 输出路径
   */
  async generateJUnit(result: AuditResult, outputPath: string): Promise<void> {
    await fs.ensureDir(path.dirname(outputPath))
    const xml = this.generateJUnitXML(result)
    await fs.writeFile(outputPath, xml, 'utf-8')
  }

  /**
   * 生成 JUnit XML 内容
   * @param result 审计结果
   * @returns XML 字符串
   */
  private generateJUnitXML(result: AuditResult): string {
    const { checks, summary, timestamp } = result

    const testsuites = checks.map(check => {
      const failures = check.issues.filter(i => i.severity === 'error').length
      const errors = 0 // 我们将所有错误归类为 failures
      const tests = check.issues.length || 1

      const testcases = check.issues.length > 0
        ? check.issues.map(issue => this.generateTestCase(check.name, issue)).join('\n')
        : `    <testcase name="${check.name}" classname="audit.${check.name}" time="0" />`

      return `  <testsuite name="${check.name}" tests="${tests}" failures="${failures}" errors="${errors}" time="0" timestamp="${timestamp}">
${testcases}
  </testsuite>`
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Code Audit" tests="${summary.totalIssues || checks.length}" failures="${summary.errorCount}" errors="0" time="0">
${testsuites}
</testsuites>`
  }

  /**
   * 生成单个测试用例的 XML
   * @param checkName 检查名称
   * @param issue 问题详情
   * @returns XML 字符串
   */
  private generateTestCase(checkName: string, issue: any): string {
    const testName = `${issue.file}:${issue.line}`
    const className = `audit.${checkName}`

    if (issue.severity === 'error') {
      return `    <testcase name="${testName}" classname="${className}" time="0">
      <failure message="${this.escapeXML(issue.message)}" type="${issue.rule || 'audit-error'}">
${this.escapeXML(issue.message)}
Location: ${issue.file}:${issue.line}${issue.column !== undefined ? ':' + issue.column : ''}
      </failure>
    </testcase>`
    } else {
      return `    <testcase name="${testName}" classname="${className}" time="0" />`
    }
  }

  /**
   * 转义 XML 特殊字符
   * @param str 字符串
   * @returns 转义后的字符串
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * 输出 CI 模式日志
   * @param result 审计结果
   */
  logCI(result: AuditResult): void {
    const { success, summary, checks } = result

    // 输出简洁的摘要
    console.log(`\n=== 代码审计结果 ===`)
    console.log(`状态: ${success ? '✓ 通过' : '✗ 失败'}`)
    console.log(`文件: ${summary.totalFiles}`)
    console.log(`问题: ${summary.totalIssues} (错误: ${summary.errorCount}, 警告: ${summary.warningCount})`)

    // 输出每个检查的结果
    for (const check of checks) {
      const status = check.passed ? '✓' : '✗'
      const issueCount = check.issues.length
      console.log(`${status} ${check.name}: ${issueCount} 个问题`)
    }

    // 如果有错误，输出错误详情
    if (summary.errorCount > 0) {
      console.log(`\n=== 错误详情 ===`)
      for (const check of checks) {
        const errors = check.issues.filter((i: any) => i.severity === 'error')
        if (errors.length > 0) {
          console.log(`\n${check.name}:`)
          for (const error of errors) {
            console.log(`  ${error.file}:${error.line} - ${error.message}`)
          }
        }
      }
    }

    console.log('')
  }
}
