/**
 * 审计工具常量配置
 */

/**
 * 支持的代码文件扩展名
 */
export const CODE_FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue']

/**
 * 支持的文档文件扩展名
 */
export const DOC_FILE_EXTENSIONS = ['.md', '.txt']

/**
 * 默认排除的目录和文件模式
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  '.git',
  '.snapshots',
  'coverage',
  'build',
  '.cache',
  'temp',
  'tmp'
]

/**
 * 默认的注释覆盖率阈值
 */
export const DEFAULT_COMMENT_COVERAGE_THRESHOLD = 0.6

/**
 * 默认的注释质量评分阈值
 */
export const DEFAULT_COMMENT_QUALITY_THRESHOLD = 60

/**
 * 技术术语白名单（允许在注释中使用英文）
 */
export const TECH_TERMS_WHITELIST = [
  'TypeScript',
  'JavaScript',
  'Vue',
  'React',
  'Node.js',
  'npm',
  'API',
  'HTTP',
  'HTTPS',
  'URL',
  'JSON',
  'XML',
  'HTML',
  'CSS',
  'DOM',
  'ESLint',
  'Prettier',
  'Vitest',
  'Git',
  'GitHub',
  'CI/CD',
  'PWA',
  'SPA',
  'SSR',
  'SEO',
  'UI',
  'UX'
]

/**
 * 文档类别关键词映射
 */
export const DOC_CATEGORY_KEYWORDS = {
  deployment: ['部署', '服务器', 'deploy', 'server', 'nginx', 'docker'],
  development: ['开发', '标准', 'develop', 'standard', 'guide', '指南'],
  features: ['功能', '游戏', 'feature', 'game', '系统'],
  planning: ['规划', '路线图', 'roadmap', 'plan', '计划'],
  testing: ['测试', 'test', 'e2e', '单元测试', '集成测试']
}

/**
 * 待办标记优先级关键词
 */
export const TODO_PRIORITY_KEYWORDS = {
  high: ['urgent', '紧急', 'critical', '严重', 'important', '重要'],
  medium: ['medium', '中等', 'normal', '普通'],
  low: ['low', '低', 'minor', '次要', 'nice-to-have']
}
