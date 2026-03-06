/**
 * SEO 数据模型
 * 定义 SEO 管理相关的 TypeScript 接口
 * 
 * 对应数据库表: seo_config
 * 
 * 需求: 7.1.1-7.4.2
 */

// ========== 页面标识类型 ==========

/**
 * 页面标识类型
 * 定义网站的所有页面
 */
export type PageIdentifier = 
  | 'home'       // 首页
  | 'about'      // 关于
  | 'projects'   // 项目
  | 'skills'     // 技能
  | 'experience' // 经历
  | 'education'  // 教育
  | 'contact'    // 联系

/**
 * 默认页面列表
 */
export const DEFAULT_PAGES: PageIdentifier[] = [
  'home',
  'about',
  'projects',
  'skills',
  'experience',
  'education',
  'contact'
]

/**
 * 页面中文名称映射
 */
export const PAGE_NAMES: Record<PageIdentifier, string> = {
  home: '首页',
  about: '关于',
  projects: '项目',
  skills: '技能',
  experience: '经历',
  education: '教育',
  contact: '联系'
}

// ========== 页面 Meta 配置接口 ==========

/**
 * 页面 Meta 配置接口
 * 
 * 需求: 7.1.1 - 提供各页面标题（title）配置
 * 需求: 7.1.2 - 提供各页面描述（description）配置
 * 需求: 7.1.3 - 提供关键词（keywords）配置
 * 需求: 7.1.4 - 提供 Open Graph 标签配置
 */
export interface PageMeta {
  /** 页面标识 */
  page: PageIdentifier
  /** 页面标题 */
  title: string
  /** 页面描述 */
  description: string
  /** 关键词列表 */
  keywords: string[]
  /** Open Graph 标题（可选，默认使用 title） */
  ogTitle?: string
  /** Open Graph 描述（可选，默认使用 description） */
  ogDescription?: string
  /** Open Graph 图片 URL（可选） */
  ogImage?: string
}

/**
 * 页面 Meta 输入数据（用于创建/更新）
 */
export interface PageMetaInput {
  page: PageIdentifier
  title: string
  description: string
  keywords: string[]
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
}

// ========== 结构化数据 Schema 接口 ==========

/**
 * Person Schema 配置接口
 * 
 * 需求: 7.2.1 - 提供 Person Schema 配置
 */
export interface PersonSchema {
  /** 姓名 */
  name: string
  /** 职位/头衔 */
  jobTitle: string
  /** 个人网站 URL */
  url?: string
  /** 邮箱 */
  email?: string
  /** 电话 */
  telephone?: string
  /** 头像图片 URL */
  image?: string
  /** 社交媒体链接 */
  sameAs?: string[]
  /** 工作单位 */
  worksFor?: {
    /** 组织类型 */
    '@type': 'Organization'
    /** 组织名称 */
    name: string
    /** 组织网站 */
    url?: string
  }
}

/**
 * WebSite Schema 配置接口
 * 
 * 需求: 7.2.2 - 提供 WebSite Schema 配置
 */
export interface WebsiteSchema {
  /** 网站名称 */
  name: string
  /** 网站 URL */
  url: string
  /** 网站描述 */
  description?: string
  /** 网站语言 */
  inLanguage?: string
  /** 网站作者 */
  author?: {
    '@type': 'Person'
    name: string
  }
  /** 搜索功能配置 */
  potentialAction?: {
    '@type': 'SearchAction'
    target: string
    'query-input': string
  }
}

/**
 * 面包屑导航项接口
 */
export interface BreadcrumbItem {
  /** 项目名称 */
  name: string
  /** 项目 URL */
  url: string
}

/**
 * 面包屑导航 Schema 配置接口
 * 
 * 需求: 7.2.3 - 提供面包屑导航 Schema 配置
 */
export interface BreadcrumbSchema {
  /** 是否启用面包屑导航 */
  enabled: boolean
  /** 各页面的面包屑配置 */
  items: Record<PageIdentifier, BreadcrumbItem[]>
}

/**
 * 完整的结构化数据配置接口
 */
export interface SchemaConfig {
  /** Person Schema 配置 */
  person: PersonSchema
  /** WebSite Schema 配置 */
  website: WebsiteSchema
  /** 面包屑导航 Schema 配置 */
  breadcrumb: BreadcrumbSchema
}

// ========== Sitemap 配置接口 ==========

/**
 * 更新频率类型
 */
export type ChangeFrequency = 
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

/**
 * Sitemap 页面配置接口
 * 
 * 需求: 7.3.2 - 提供页面优先级配置
 * 需求: 7.3.3 - 提供更新频率配置
 */
export interface SitemapPage {
  /** 页面 URL（相对路径或完整 URL） */
  url: string
  /** 页面优先级 (0.0-1.0) */
  priority: number
  /** 更新频率 */
  changefreq: ChangeFrequency
  /** 最后修改时间（可选） */
  lastmod?: string
}

/**
 * Sitemap 配置接口
 * 
 * 需求: 7.3.1 - 提供自动生成 sitemap.xml 功能
 */
export interface SitemapConfig {
  /** 网站基础 URL */
  baseUrl: string
  /** 页面配置列表 */
  pages: SitemapPage[]
}

// ========== Robots.txt 模板 ==========

/**
 * Robots.txt 常用规则模板
 * 
 * 需求: 7.4.2 - 提供常用规则模板
 */
export interface RobotsTemplate {
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 模板内容 */
  content: string
}

/**
 * 预定义的 robots.txt 模板
 */
export const ROBOTS_TEMPLATES: RobotsTemplate[] = [
  {
    name: '允许所有',
    description: '允许所有搜索引擎爬取所有页面',
    content: `User-agent: *
Allow: /

Sitemap: {{SITEMAP_URL}}`
  },
  {
    name: '禁止所有',
    description: '禁止所有搜索引擎爬取',
    content: `User-agent: *
Disallow: /`
  },
  {
    name: '标准配置',
    description: '允许爬取，但禁止爬取管理后台和私有目录',
    content: `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /*.json$

Sitemap: {{SITEMAP_URL}}`
  },
  {
    name: '仅允许 Google',
    description: '仅允许 Google 爬虫爬取',
    content: `User-agent: Googlebot
Allow: /

User-agent: *
Disallow: /

Sitemap: {{SITEMAP_URL}}`
  },
  {
    name: '延迟爬取',
    description: '允许爬取但设置爬取延迟，减轻服务器压力',
    content: `User-agent: *
Allow: /
Crawl-delay: 10

Sitemap: {{SITEMAP_URL}}`
  }
]

// ========== 完整 SEO 配置接口 ==========

/**
 * 完整 SEO 配置接口
 * 对应数据库表: seo_config
 */
export interface SEOConfig {
  /** 各页面 Meta 配置 */
  pageMeta: PageMeta[]
  /** 结构化数据配置 */
  schemas: SchemaConfig
  /** Sitemap 配置 */
  sitemapConfig: SitemapConfig
  /** robots.txt 内容 */
  robotsTxt: string
}

/**
 * SEO 配置数据库记录接口
 */
export interface SEOConfigRecord {
  /** 记录 ID（固定为 1，单行表） */
  id: 1
  /** 各页面 Meta 配置（JSON） */
  pageMeta: PageMeta[]
  /** 结构化数据配置（JSON） */
  schemas: SchemaConfig
  /** Sitemap 配置（JSON） */
  sitemapConfig: SitemapConfig
  /** robots.txt 内容 */
  robotsTxt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 数据库原始行数据（JSON 字段为字符串）
 */
export interface SEOConfigRow {
  id: number
  page_meta: string | null
  schemas: string | null
  sitemap_config: string | null
  robots_txt: string | null
  updated_at: string
}

// ========== 默认配置 ==========

/**
 * 默认页面 Meta 配置
 */
export const DEFAULT_PAGE_META: PageMeta[] = [
  {
    page: 'home',
    title: '首页 - 个人作品集',
    description: '欢迎访问我的个人作品集网站，展示我的项目、技能和经历。',
    keywords: ['个人作品集', '前端开发', 'Web开发', '程序员']
  },
  {
    page: 'about',
    title: '关于我 - 个人作品集',
    description: '了解更多关于我的背景、技能和职业经历。',
    keywords: ['关于我', '个人介绍', '开发者']
  },
  {
    page: 'projects',
    title: '项目作品 - 个人作品集',
    description: '浏览我的项目作品，包括工作项目、个人项目和开源贡献。',
    keywords: ['项目作品', '开发项目', '作品展示']
  },
  {
    page: 'skills',
    title: '技能专长 - 个人作品集',
    description: '查看我的技术技能和专业能力。',
    keywords: ['技能', '技术栈', '专业能力']
  },
  {
    page: 'experience',
    title: '工作经历 - 个人作品集',
    description: '了解我的工作经历和职业发展历程。',
    keywords: ['工作经历', '职业经历', '工作经验']
  },
  {
    page: 'education',
    title: '教育背景 - 个人作品集',
    description: '查看我的教育背景和学术成就。',
    keywords: ['教育背景', '学历', '学术经历']
  },
  {
    page: 'contact',
    title: '联系我 - 个人作品集',
    description: '通过此页面与我取得联系。',
    keywords: ['联系方式', '联系我', '留言']
  }
]

/**
 * 默认 Person Schema 配置
 */
export const DEFAULT_PERSON_SCHEMA: PersonSchema = {
  name: '待设置',
  jobTitle: '待设置',
  url: '',
  email: '',
  telephone: '',
  image: '',
  sameAs: []
}

/**
 * 默认 WebSite Schema 配置
 */
export const DEFAULT_WEBSITE_SCHEMA: WebsiteSchema = {
  name: '个人作品集',
  url: 'https://example.com',
  description: '个人作品集网站',
  inLanguage: 'zh-CN'
}

/**
 * 默认面包屑导航配置
 */
export const DEFAULT_BREADCRUMB_SCHEMA: BreadcrumbSchema = {
  enabled: true,
  items: {
    home: [{ name: '首页', url: '/' }],
    about: [
      { name: '首页', url: '/' },
      { name: '关于', url: '/about' }
    ],
    projects: [
      { name: '首页', url: '/' },
      { name: '项目', url: '/projects' }
    ],
    skills: [
      { name: '首页', url: '/' },
      { name: '技能', url: '/skills' }
    ],
    experience: [
      { name: '首页', url: '/' },
      { name: '经历', url: '/experience' }
    ],
    education: [
      { name: '首页', url: '/' },
      { name: '教育', url: '/education' }
    ],
    contact: [
      { name: '首页', url: '/' },
      { name: '联系', url: '/contact' }
    ]
  }
}

/**
 * 默认 Schema 配置
 */
export const DEFAULT_SCHEMA_CONFIG: SchemaConfig = {
  person: DEFAULT_PERSON_SCHEMA,
  website: DEFAULT_WEBSITE_SCHEMA,
  breadcrumb: DEFAULT_BREADCRUMB_SCHEMA
}

/**
 * 默认 Sitemap 配置
 */
export const DEFAULT_SITEMAP_CONFIG: SitemapConfig = {
  baseUrl: 'https://example.com',
  pages: [
    { url: '/', priority: 1.0, changefreq: 'weekly' },
    { url: '/about', priority: 0.8, changefreq: 'monthly' },
    { url: '/projects', priority: 0.9, changefreq: 'weekly' },
    { url: '/skills', priority: 0.7, changefreq: 'monthly' },
    { url: '/experience', priority: 0.7, changefreq: 'monthly' },
    { url: '/education', priority: 0.6, changefreq: 'yearly' },
    { url: '/contact', priority: 0.5, changefreq: 'yearly' }
  ]
}

/**
 * 默认 robots.txt 内容
 */
export const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://example.com/sitemap.xml`

/**
 * 默认完整 SEO 配置
 */
export const DEFAULT_SEO_CONFIG: SEOConfig = {
  pageMeta: DEFAULT_PAGE_META,
  schemas: DEFAULT_SCHEMA_CONFIG,
  sitemapConfig: DEFAULT_SITEMAP_CONFIG,
  robotsTxt: DEFAULT_ROBOTS_TXT
}

// ========== 工具函数 ==========

/**
 * 验证页面标识是否有效
 */
export function isValidPageIdentifier(page: string): page is PageIdentifier {
  return DEFAULT_PAGES.includes(page as PageIdentifier)
}

/**
 * 验证更新频率是否有效
 */
export function isValidChangeFrequency(freq: string): freq is ChangeFrequency {
  return ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].includes(freq)
}

/**
 * 验证优先级是否有效 (0.0-1.0)
 */
export function isValidPriority(priority: number): boolean {
  return typeof priority === 'number' && priority >= 0 && priority <= 1
}

/**
 * 验证 URL 格式是否有效
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }
  // 允许相对路径或完整 URL
  if (url.startsWith('/')) {
    return true
  }
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证页面 Meta 输入数据
 */
export function validatePageMetaInput(input: PageMetaInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证页面标识
  if (!isValidPageIdentifier(input.page)) {
    errors.push(`无效的页面标识: ${input.page}`)
  }

  // 验证标题
  if (!input.title || input.title.trim().length === 0) {
    errors.push('页面标题不能为空')
  } else if (input.title.length > 100) {
    errors.push('页面标题长度不能超过 100 个字符')
  }

  // 验证描述
  if (!input.description || input.description.trim().length === 0) {
    errors.push('页面描述不能为空')
  } else if (input.description.length > 300) {
    errors.push('页面描述长度不能超过 300 个字符')
  }

  // 验证关键词
  if (!Array.isArray(input.keywords)) {
    errors.push('关键词必须是数组')
  } else if (input.keywords.length > 20) {
    errors.push('关键词数量不能超过 20 个')
  }

  // 验证 OG 图片 URL（如果提供）
  if (input.ogImage && !isValidUrl(input.ogImage)) {
    errors.push('无效的 OG 图片 URL')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 验证 Sitemap 页面配置
 */
export function validateSitemapPage(page: SitemapPage): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证 URL
  if (!page.url || !isValidUrl(page.url)) {
    errors.push('无效的页面 URL')
  }

  // 验证优先级
  if (!isValidPriority(page.priority)) {
    errors.push('优先级必须在 0.0 到 1.0 之间')
  }

  // 验证更新频率
  if (!isValidChangeFrequency(page.changefreq)) {
    errors.push('无效的更新频率')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 将数据库行数据转换为 SEOConfigRecord 接口
 */
export function parseSEOConfigRow(row: SEOConfigRow): SEOConfigRecord {
  return {
    id: 1,
    pageMeta: row.page_meta ? JSON.parse(row.page_meta) : DEFAULT_PAGE_META,
    schemas: row.schemas ? JSON.parse(row.schemas) : DEFAULT_SCHEMA_CONFIG,
    sitemapConfig: row.sitemap_config ? JSON.parse(row.sitemap_config) : DEFAULT_SITEMAP_CONFIG,
    robotsTxt: row.robots_txt || DEFAULT_ROBOTS_TXT,
    updatedAt: row.updated_at
  }
}

/**
 * 生成 sitemap.xml 内容
 * 
 * 需求: 7.3.1 - 提供自动生成 sitemap.xml 功能
 * 
 * @param config - Sitemap 配置
 * @returns sitemap.xml 内容字符串
 */
export function generateSitemapXml(config: SitemapConfig): string {
  const { baseUrl, pages } = config
  
  // 确保 baseUrl 没有尾部斜杠
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  
  // XML 头部
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  
  // 生成每个页面的 URL 条目
  for (const page of pages) {
    // 构建完整 URL
    const fullUrl = page.url.startsWith('http') 
      ? page.url 
      : `${normalizedBaseUrl}${page.url.startsWith('/') ? page.url : '/' + page.url}`
    
    xml += '  <url>\n'
    xml += `    <loc>${escapeXml(fullUrl)}</loc>\n`
    
    // 添加最后修改时间（如果有）
    if (page.lastmod) {
      xml += `    <lastmod>${escapeXml(page.lastmod)}</lastmod>\n`
    }
    
    // 添加更新频率
    xml += `    <changefreq>${escapeXml(page.changefreq)}</changefreq>\n`
    
    // 添加优先级
    xml += `    <priority>${page.priority.toFixed(1)}</priority>\n`
    
    xml += '  </url>\n'
  }
  
  xml += '</urlset>'
  
  return xml
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 生成 JSON-LD 格式的 Person Schema
 */
export function generatePersonJsonLd(schema: PersonSchema): string {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: schema.name,
    jobTitle: schema.jobTitle
  }

  if (schema.url) jsonLd.url = schema.url
  if (schema.email) jsonLd.email = schema.email
  if (schema.telephone) jsonLd.telephone = schema.telephone
  if (schema.image) jsonLd.image = schema.image
  if (schema.sameAs && schema.sameAs.length > 0) jsonLd.sameAs = schema.sameAs
  if (schema.worksFor) jsonLd.worksFor = schema.worksFor

  return JSON.stringify(jsonLd, null, 2)
}

/**
 * 生成 JSON-LD 格式的 WebSite Schema
 */
export function generateWebsiteJsonLd(schema: WebsiteSchema): string {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: schema.name,
    url: schema.url
  }

  if (schema.description) jsonLd.description = schema.description
  if (schema.inLanguage) jsonLd.inLanguage = schema.inLanguage
  if (schema.author) jsonLd.author = schema.author
  if (schema.potentialAction) jsonLd.potentialAction = schema.potentialAction

  return JSON.stringify(jsonLd, null, 2)
}

/**
 * 生成 JSON-LD 格式的面包屑导航 Schema
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[], baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${normalizedBaseUrl}${item.url}`
    }))
  }

  return JSON.stringify(jsonLd, null, 2)
}

/**
 * 克隆 SEO 配置（深拷贝）
 */
export function cloneSEOConfig(config: SEOConfig): SEOConfig {
  return JSON.parse(JSON.stringify(config))
}

/**
 * 合并 SEO 配置（用于部分更新）
 */
export function mergeSEOConfig(target: SEOConfig, source: Partial<SEOConfig>): SEOConfig {
  return {
    pageMeta: source.pageMeta ?? target.pageMeta,
    schemas: source.schemas ?? target.schemas,
    sitemapConfig: source.sitemapConfig ?? target.sitemapConfig,
    robotsTxt: source.robotsTxt ?? target.robotsTxt
  }
}
