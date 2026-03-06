/**
 * SEO 管理 API 接口
 * 提供 SEO 管理相关的 API 调用
 * 
 * 需求: 7.1.1-7.4.2
 */
import request from './request'

// ========== 类型定义 ==========

/** 页面标识类型 */
export type PageIdentifier = 
  | 'home'       // 首页
  | 'about'      // 关于
  | 'projects'   // 项目
  | 'skills'     // 技能
  | 'experience' // 经历
  | 'education'  // 教育
  | 'contact'    // 联系

/** 页面中文名称映射 */
export const PAGE_NAMES: Record<PageIdentifier, string> = {
  home: '首页',
  about: '关于',
  projects: '项目',
  skills: '技能',
  experience: '经历',
  education: '教育',
  contact: '联系'
}

/** 默认页面列表 */
export const DEFAULT_PAGES: PageIdentifier[] = [
  'home',
  'about',
  'projects',
  'skills',
  'experience',
  'education',
  'contact'
]

/** 页面 Meta 配置 */
export interface PageMeta {
  page: PageIdentifier
  title: string
  description: string
  keywords: string[]
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
}

/** 页面 Meta 输入数据 */
export interface PageMetaInput {
  title: string
  description: string
  keywords: string[]
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
}

/** Person Schema 配置 */
export interface PersonSchema {
  name: string
  jobTitle: string
  url?: string
  email?: string
  telephone?: string
  image?: string
  sameAs?: string[]
  worksFor?: {
    '@type': 'Organization'
    name: string
    url?: string
  }
}

/** WebSite Schema 配置 */
export interface WebsiteSchema {
  name: string
  url: string
  description?: string
  inLanguage?: string
  author?: {
    '@type': 'Person'
    name: string
  }
  potentialAction?: {
    '@type': 'SearchAction'
    target: string
    'query-input': string
  }
}

/** 面包屑导航项 */
export interface BreadcrumbItem {
  name: string
  url: string
}

/** 面包屑导航 Schema 配置 */
export interface BreadcrumbSchema {
  enabled: boolean
  items: Record<PageIdentifier, BreadcrumbItem[]>
}

/** 完整的结构化数据配置 */
export interface SchemaConfig {
  person: PersonSchema
  website: WebsiteSchema
  breadcrumb: BreadcrumbSchema
}

/** 更新频率类型 */
export type ChangeFrequency = 
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

/** 更新频率选项 */
export const CHANGE_FREQUENCY_OPTIONS: { value: ChangeFrequency; label: string }[] = [
  { value: 'always', label: '始终' },
  { value: 'hourly', label: '每小时' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
  { value: 'never', label: '从不' }
]

/** Sitemap 页面配置 */
export interface SitemapPage {
  url: string
  priority: number
  changefreq: ChangeFrequency
  lastmod?: string
}

/** Sitemap 配置 */
export interface SitemapConfig {
  baseUrl: string
  pages: SitemapPage[]
}

/** Robots.txt 模板 */
export interface RobotsTemplate {
  name: string
  description: string
  content: string
}

/** 完整 SEO 配置 */
export interface SEOConfig {
  pageMeta: PageMeta[]
  schemas: SchemaConfig
  sitemapConfig: SitemapConfig
  robotsTxt: string
}

// ========== Meta 配置接口 ==========

/**
 * 获取所有页面 Meta 配置
 * 需求: 7.1.1-7.1.4
 */
export function getAllMeta() {
  return request.get<{ data: PageMeta[] }>('/seo/meta')
}

/**
 * 获取单个页面 Meta 配置
 * @param page - 页面标识
 * 需求: 7.1.1-7.1.4
 */
export function getMetaByPage(page: PageIdentifier) {
  return request.get<{ meta: PageMeta }>(`/seo/meta/${page}`)
}

/**
 * 更新页面 Meta 配置
 * @param page - 页面标识
 * @param data - Meta 数据
 * 需求: 7.1.1-7.1.4
 */
export function updateMeta(page: PageIdentifier, data: PageMetaInput) {
  return request.put<{ success: boolean; meta: PageMeta }>(`/seo/meta/${page}`, data)
}

// ========== Schema 配置接口 ==========

/**
 * 获取结构化数据配置
 * 需求: 7.2.1-7.2.3
 */
export function getSchemas() {
  return request.get<{ schemas: SchemaConfig }>('/seo/schema')
}

/**
 * 更新结构化数据配置
 * @param schemas - Schema 配置
 * 需求: 7.2.1-7.2.3
 */
export function updateSchemas(schemas: SchemaConfig) {
  return request.put<{ success: boolean; schemas: SchemaConfig }>('/seo/schema', schemas)
}

// ========== Sitemap 配置接口 ==========

/**
 * 获取 Sitemap 配置
 * 需求: 7.3.1-7.3.3
 */
export function getSitemapConfig() {
  return request.get<{ config: SitemapConfig }>('/seo/sitemap')
}

/**
 * 更新 Sitemap 配置
 * @param config - Sitemap 配置
 * 需求: 7.3.2-7.3.3
 */
export function updateSitemapConfig(config: SitemapConfig) {
  return request.put<{ success: boolean; config: SitemapConfig }>('/seo/sitemap', config)
}

/**
 * 生成 sitemap.xml 文件
 * @param outputPath - 输出路径（可选）
 * 需求: 7.3.1
 */
export function generateSitemap(outputPath?: string) {
  return request.post<{ success: boolean; path?: string; content?: string }>('/seo/sitemap/generate', { outputPath })
}

// ========== Robots.txt 配置接口 ==========

/**
 * 获取 robots.txt 内容
 * 需求: 7.4.1
 */
export function getRobotsTxt() {
  return request.get<{ content: string }>('/seo/robots')
}

/**
 * 更新 robots.txt 内容
 * @param content - robots.txt 内容
 * 需求: 7.4.1
 */
export function updateRobotsTxt(content: string) {
  return request.put<{ success: boolean; content: string }>('/seo/robots', { content })
}

/**
 * 获取 robots.txt 模板列表
 * 需求: 7.4.2
 */
export function getRobotsTemplates() {
  return request.get<{ templates: RobotsTemplate[] }>('/seo/robots/templates')
}

/**
 * 应用 robots.txt 模板
 * @param templateContent - 模板内容
 * @param sitemapUrl - Sitemap URL（可选，用于替换模板中的占位符）
 * 需求: 7.4.2
 */
export function applyRobotsTemplate(templateContent: string, sitemapUrl?: string) {
  return request.post<{ success: boolean; content: string }>('/seo/robots/apply-template', { templateContent, sitemapUrl })
}

// ========== 完整配置接口 ==========

/**
 * 获取完整 SEO 配置
 */
export function getSEOConfig() {
  return request.get<{ config: SEOConfig }>('/seo/config')
}

/**
 * 重置 SEO 配置为默认值
 */
export function resetSEOConfig() {
  return request.post<{ success: boolean; config: SEOConfig }>('/seo/config/reset')
}

/**
 * 导出 SEO 配置
 * @param pretty - 是否格式化输出
 */
export function exportSEOConfig(pretty: boolean = true) {
  return request.get('/seo/config/export', {
    params: { pretty },
    responseType: 'blob'
  })
}

/**
 * 导入 SEO 配置
 * @param config - SEO 配置
 */
export function importSEOConfig(config: SEOConfig) {
  return request.post<{ success: boolean; config: SEOConfig }>('/seo/config/import', config)
}
