/**
 * 审计工具配置示例
 */

import type { AuditConfig } from './types'

/**
 * 默认审计配置
 */
export const defaultConfig: AuditConfig = {
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

/**
 * CI 环境配置
 */
export const ciConfig: AuditConfig = {
  checks: {
    eslint: true,
    comments: true,
    debug: true,
    todos: true
  },
  thresholds: {
    commentCoverage: 0.7,
    commentQuality: 70
  },
  output: {
    format: 'junit',
    path: './audit-report.xml'
  },
  ci: true,
  fix: false
}

/**
 * 开发环境配置（自动修复）
 */
export const devConfig: AuditConfig = {
  checks: {
    eslint: true,
    comments: false,
    debug: true,
    todos: false
  },
  thresholds: {
    commentCoverage: 0.5,
    commentQuality: 50
  },
  output: {
    format: 'json',
    path: './audit-report.json'
  },
  ci: false,
  fix: true
}
