/**
 * SEO 服务模块
 * 提供 SEO 管理相关的操作功能
 * 
 * 需求: 7.1.1-7.4.2
 * - Meta 配置管理
 * - Schema 配置管理
 * - Sitemap 管理
 * - Robots.txt 管理
 */

import fs from 'fs'
import path from 'path'
import { getDatabase, saveDatabase, isDatabaseInitialized } from '../database/init'
import {
  PageMeta,
  PageMetaInput,
  PageIdentifier,
  SchemaConfig,
  SitemapConfig,
  SitemapPage,
  SEOConfig,
  SEOConfigRecord,
  SEOConfigRow,
  DEFAULT_PAGE_META,
  DEFAULT_SCHEMA_CONFIG,
  DEFAULT_SITEMAP_CONFIG,
  DEFAULT_ROBOTS_TXT,
  DEFAULT_SEO_CONFIG,
  parseSEOConfigRow,
  validatePageMetaInput,
  validateSitemapPage,
  isValidPageIdentifier,
  generateSitemapXml,
  cloneSEOConfig
} from '../models/seo'

// ========== 内部辅助函数 ==========

/**
 * 获取 SEO 配置原始数据
 */
function getSEOConfigRow(): SEOConfigRow | null {
  if (!isDatabaseInitialized()) {
    return null
  }

  try {
    const db = getDatabase()
    const result = db.exec(`
      SELECT id, page_meta, schemas, sitemap_config, robots_txt, updated_at
      FROM seo_config
      WHERE id = 1
    `)

    if (result.length === 0 || !result[0]?.values?.[0]) {
      return null
    }

    const row = result[0].values[0]
    return {
      id: row[0] as number,
      page_meta: row[1] as string | null,
      schemas: row[2] as string | null,
      sitemap_config: row[3] as string | null,
      robots_txt: row[4] as string | null,
      updated_at: row[5] as string
    }
  } catch (error) {
    console.error('获取 SEO 配置失败:', error)
    return null
  }
}

/**
 * 更新 SEO 配置字段
 */
function updateSEOConfigField(
  field: 'page_meta' | 'schemas' | 'sitemap_config' | 'robots_txt',
  value: string
): boolean {
  if (!isDatabaseInitialized()) {
    return false
  }

  try {
    const db = getDatabase()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    db.run(`
      UPDATE seo_config
      SET ${field} = ?, updated_at = ?
      WHERE id = 1
    `, [value, now])

    saveDatabase()
    return true
  } catch (error) {
    console.error(`更新 SEO 配置字段 ${field} 失败:`, error)
    return false
  }
}

// ========== Meta 配置管理 ==========

/**
 * 获取所有页面 Meta 配置
 * 
 * 需求: 7.1.1-7.1.4 - 页面 Meta 配置
 * 
 * @returns 页面 Meta 配置列表
 */
export function getPageMeta(): PageMeta[] {
  const row = getSEOConfigRow()
  if (!row || !row.page_meta) {
    return cloneSEOConfig(DEFAULT_SEO_CONFIG).pageMeta
  }

  try {
    const parsed = JSON.parse(row.page_meta)
    // 检查是否为有效的数组，如果是空对象或无效数据则返回默认值
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return cloneSEOConfig(DEFAULT_SEO_CONFIG).pageMeta
    }
    return parsed as PageMeta[]
  } catch {
    return cloneSEOConfig(DEFAULT_SEO_CONFIG).pageMeta
  }
}

/**
 * 获取单个页面的 Meta 配置
 * 
 * @param page - 页面标识
 * @returns 页面 Meta 配置或 null
 */
export function getPageMetaByPage(page: PageIdentifier): PageMeta | null {
  if (!isValidPageIdentifier(page)) {
    return null
  }

  const allMeta = getPageMeta()
  return allMeta.find(m => m.page === page) || null
}

/**
 * 更新页面 Meta 配置
 * 
 * 需求: 7.1.1-7.1.4 - 页面 Meta 配置
 * 
 * @param page - 页面标识
 * @param meta - Meta 配置数据
 * @returns 更新结果
 */
export function updatePageMeta(
  page: PageIdentifier,
  meta: Omit<PageMetaInput, 'page'>
): {
  success: boolean
  meta?: PageMeta
  errors?: string[]
} {
  // 构建完整输入
  const input: PageMetaInput = { ...meta, page }

  // 验证输入
  const validation = validatePageMetaInput(input)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  // 获取当前配置
  const allMeta = getPageMeta()
  
  // 查找并更新或添加
  const index = allMeta.findIndex(m => m.page === page)
  const newMeta: PageMeta = {
    page: input.page,
    title: input.title.trim(),
    description: input.description.trim(),
    keywords: input.keywords.map(k => k.trim()).filter(k => k.length > 0),
    ogTitle: input.ogTitle?.trim() || undefined,
    ogDescription: input.ogDescription?.trim() || undefined,
    ogImage: input.ogImage?.trim() || undefined
  }

  if (index >= 0) {
    allMeta[index] = newMeta
  } else {
    allMeta.push(newMeta)
  }

  // 保存到数据库
  const success = updateSEOConfigField('page_meta', JSON.stringify(allMeta))
  if (!success) {
    return { success: false, errors: ['保存 Meta 配置失败'] }
  }

  return { success: true, meta: newMeta }
}

/**
 * 批量更新页面 Meta 配置
 * 
 * @param metas - Meta 配置列表
 * @returns 更新结果
 */
export function updateAllPageMeta(metas: PageMetaInput[]): {
  success: boolean
  errors?: string[]
} {
  // 验证所有输入
  const errors: string[] = []
  for (const meta of metas) {
    const validation = validatePageMetaInput(meta)
    if (!validation.valid) {
      errors.push(`页面 ${meta.page}: ${validation.errors.join(', ')}`)
    }
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  // 转换为 PageMeta 格式
  const pageMetas: PageMeta[] = metas.map(input => ({
    page: input.page,
    title: input.title.trim(),
    description: input.description.trim(),
    keywords: input.keywords.map(k => k.trim()).filter(k => k.length > 0),
    ogTitle: input.ogTitle?.trim() || undefined,
    ogDescription: input.ogDescription?.trim() || undefined,
    ogImage: input.ogImage?.trim() || undefined
  }))

  // 保存到数据库
  const success = updateSEOConfigField('page_meta', JSON.stringify(pageMetas))
  if (!success) {
    return { success: false, errors: ['保存 Meta 配置失败'] }
  }

  return { success: true }
}

// ========== Schema 配置管理 ==========

/**
 * 获取结构化数据配置
 * 
 * 需求: 7.2.1-7.2.3 - 结构化数据配置
 * 
 * @returns Schema 配置
 */
export function getSchemas(): SchemaConfig {
  const row = getSEOConfigRow()
  if (!row || !row.schemas) {
    return JSON.parse(JSON.stringify(DEFAULT_SCHEMA_CONFIG))
  }

  try {
    const parsed = JSON.parse(row.schemas)
    // 检查是否为有效的 Schema 配置，如果是空对象则返回默认值
    if (!parsed || typeof parsed !== 'object' || !parsed.person || !parsed.website || !parsed.breadcrumb) {
      return JSON.parse(JSON.stringify(DEFAULT_SCHEMA_CONFIG))
    }
    return parsed as SchemaConfig
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_SCHEMA_CONFIG))
  }
}

/**
 * 更新结构化数据配置
 * 
 * 需求: 7.2.1-7.2.3 - 结构化数据配置
 * 
 * @param schemas - Schema 配置
 * @returns 更新结果
 */
export function updateSchemas(schemas: SchemaConfig): {
  success: boolean
  schemas?: SchemaConfig
  errors?: string[]
} {
  // 基本验证
  if (!schemas || typeof schemas !== 'object') {
    return { success: false, errors: ['无效的 Schema 配置格式'] }
  }

  if (!schemas.person || typeof schemas.person !== 'object') {
    return { success: false, errors: ['缺少 Person Schema 配置'] }
  }

  if (!schemas.website || typeof schemas.website !== 'object') {
    return { success: false, errors: ['缺少 WebSite Schema 配置'] }
  }

  if (!schemas.breadcrumb || typeof schemas.breadcrumb !== 'object') {
    return { success: false, errors: ['缺少面包屑导航 Schema 配置'] }
  }

  // 验证 Person Schema
  if (!schemas.person.name || schemas.person.name.trim().length === 0) {
    return { success: false, errors: ['Person Schema 的 name 不能为空'] }
  }

  if (!schemas.person.jobTitle || schemas.person.jobTitle.trim().length === 0) {
    return { success: false, errors: ['Person Schema 的 jobTitle 不能为空'] }
  }

  // 验证 WebSite Schema
  if (!schemas.website.name || schemas.website.name.trim().length === 0) {
    return { success: false, errors: ['WebSite Schema 的 name 不能为空'] }
  }

  if (!schemas.website.url || schemas.website.url.trim().length === 0) {
    return { success: false, errors: ['WebSite Schema 的 url 不能为空'] }
  }

  // 保存到数据库
  const success = updateSEOConfigField('schemas', JSON.stringify(schemas))
  if (!success) {
    return { success: false, errors: ['保存 Schema 配置失败'] }
  }

  return { success: true, schemas }
}

// ========== Sitemap 管理 ==========

/**
 * 获取 Sitemap 配置
 * 
 * 需求: 7.3.1-7.3.3 - Sitemap 管理
 * 
 * @returns Sitemap 配置
 */
export function getSitemapConfig(): SitemapConfig {
  const row = getSEOConfigRow()
  if (!row || !row.sitemap_config) {
    return JSON.parse(JSON.stringify(DEFAULT_SITEMAP_CONFIG))
  }

  try {
    const parsed = JSON.parse(row.sitemap_config)
    // 检查是否为有效的 Sitemap 配置，如果是空对象则返回默认值
    if (!parsed || typeof parsed !== 'object' || !parsed.baseUrl || !Array.isArray(parsed.pages)) {
      return JSON.parse(JSON.stringify(DEFAULT_SITEMAP_CONFIG))
    }
    return parsed as SitemapConfig
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_SITEMAP_CONFIG))
  }
}

/**
 * 更新 Sitemap 配置
 * 
 * 需求: 7.3.2-7.3.3 - Sitemap 配置
 * 
 * @param config - Sitemap 配置
 * @returns 更新结果
 */
export function updateSitemapConfig(config: SitemapConfig): {
  success: boolean
  config?: SitemapConfig
  errors?: string[]
} {
  // 基本验证
  if (!config || typeof config !== 'object') {
    return { success: false, errors: ['无效的 Sitemap 配置格式'] }
  }

  if (!config.baseUrl || config.baseUrl.trim().length === 0) {
    return { success: false, errors: ['Sitemap 基础 URL 不能为空'] }
  }

  if (!Array.isArray(config.pages)) {
    return { success: false, errors: ['Sitemap 页面配置必须是数组'] }
  }

  // 验证每个页面配置
  const errors: string[] = []
  for (let i = 0; i < config.pages.length; i++) {
    const page = config.pages[i]
    if (!page) {
      errors.push(`页面 ${i + 1}: 配置为空`)
      continue
    }
    const validation = validateSitemapPage(page)
    if (!validation.valid) {
      errors.push(`页面 ${i + 1}: ${validation.errors.join(', ')}`)
    }
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  // 保存到数据库
  const success = updateSEOConfigField('sitemap_config', JSON.stringify(config))
  if (!success) {
    return { success: false, errors: ['保存 Sitemap 配置失败'] }
  }

  return { success: true, config }
}

/**
 * 添加 Sitemap 页面
 * 
 * @param page - 页面配置
 * @returns 添加结果
 */
export function addSitemapPage(page: SitemapPage): {
  success: boolean
  config?: SitemapConfig
  errors?: string[]
} {
  // 验证页面配置
  const validation = validateSitemapPage(page)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  // 获取当前配置
  const config = getSitemapConfig()

  // 检查 URL 是否已存在
  if (config.pages.some(p => p.url === page.url)) {
    return { success: false, errors: ['该 URL 已存在于 Sitemap 中'] }
  }

  // 添加页面
  config.pages.push(page)

  // 保存
  return updateSitemapConfig(config)
}

/**
 * 删除 Sitemap 页面
 * 
 * @param url - 页面 URL
 * @returns 删除结果
 */
export function removeSitemapPage(url: string): {
  success: boolean
  config?: SitemapConfig
  errors?: string[]
} {
  // 获取当前配置
  const config = getSitemapConfig()

  // 查找并删除
  const index = config.pages.findIndex(p => p.url === url)
  if (index < 0) {
    return { success: false, errors: ['未找到该 URL'] }
  }

  config.pages.splice(index, 1)

  // 保存
  return updateSitemapConfig(config)
}

/**
 * 生成 sitemap.xml 文件
 * 
 * 需求: 7.3.1 - 提供自动生成 sitemap.xml 功能
 * 
 * @param outputPath - 输出文件路径（可选，默认为 public/sitemap.xml）
 * @returns 生成结果
 */
export function generateSitemap(outputPath?: string): {
  success: boolean
  path?: string
  content?: string
  errors?: string[]
} {
  try {
    // 获取 Sitemap 配置
    const config = getSitemapConfig()

    // 生成 XML 内容
    const xml = generateSitemapXml(config)

    // 如果提供了输出路径，写入文件
    if (outputPath) {
      // 确保目录存在
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // 写入文件
      fs.writeFileSync(outputPath, xml, 'utf-8')
      console.log(`✓ sitemap.xml 已生成: ${outputPath}`)

      return { success: true, path: outputPath, content: xml }
    }

    // 仅返回内容
    return { success: true, content: xml }
  } catch (error) {
    console.error('生成 sitemap.xml 失败:', error)
    return { success: false, errors: ['生成 sitemap.xml 失败'] }
  }
}

// ========== Robots.txt 管理 ==========

/**
 * 获取 robots.txt 内容
 * 
 * 需求: 7.4.1 - 提供 robots.txt 编辑功能
 * 
 * @returns robots.txt 内容
 */
export function getRobotsTxt(): string {
  const row = getSEOConfigRow()
  if (!row || !row.robots_txt) {
    return DEFAULT_ROBOTS_TXT
  }
  return row.robots_txt
}

/**
 * 更新 robots.txt 内容
 * 
 * 需求: 7.4.1 - 提供 robots.txt 编辑功能
 * 
 * @param content - robots.txt 内容
 * @returns 更新结果
 */
export function updateRobotsTxt(content: string): {
  success: boolean
  content?: string
  errors?: string[]
} {
  // 基本验证
  if (typeof content !== 'string') {
    return { success: false, errors: ['robots.txt 内容必须是字符串'] }
  }

  // 保存到数据库
  const success = updateSEOConfigField('robots_txt', content)
  if (!success) {
    return { success: false, errors: ['保存 robots.txt 失败'] }
  }

  return { success: true, content }
}

/**
 * 应用 robots.txt 模板
 * 
 * 需求: 7.4.2 - 提供常用规则模板
 * 
 * @param templateContent - 模板内容
 * @param sitemapUrl - Sitemap URL（用于替换模板中的占位符）
 * @returns 更新结果
 */
export function applyRobotsTemplate(
  templateContent: string,
  sitemapUrl?: string
): {
  success: boolean
  content?: string
  errors?: string[]
} {
  // 替换 Sitemap URL 占位符
  let content = templateContent
  if (sitemapUrl) {
    content = content.replace(/\{\{SITEMAP_URL\}\}/g, sitemapUrl)
  } else {
    // 如果没有提供 Sitemap URL，从配置中获取
    const sitemapConfig = getSitemapConfig()
    const defaultSitemapUrl = `${sitemapConfig.baseUrl.replace(/\/$/, '')}/sitemap.xml`
    content = content.replace(/\{\{SITEMAP_URL\}\}/g, defaultSitemapUrl)
  }

  return updateRobotsTxt(content)
}

// ========== 完整配置管理 ==========

/**
 * 获取完整 SEO 配置
 * 
 * @returns 完整 SEO 配置
 */
export function getSEOConfig(): SEOConfig {
  return {
    pageMeta: getPageMeta(),
    schemas: getSchemas(),
    sitemapConfig: getSitemapConfig(),
    robotsTxt: getRobotsTxt()
  }
}

/**
 * 获取 SEO 配置记录（包含更新时间）
 * 
 * @returns SEO 配置记录或 null
 */
export function getSEOConfigRecord(): SEOConfigRecord | null {
  const row = getSEOConfigRow()
  if (!row) {
    return null
  }
  return parseSEOConfigRow(row)
}

/**
 * 初始化 SEO 配置（创建默认配置记录）
 * 
 * @returns 初始化结果
 */
export function initializeSEOConfig(): {
  success: boolean
  config?: SEOConfigRecord
  errors?: string[]
} {
  if (!isDatabaseInitialized()) {
    return { success: false, errors: ['数据库未初始化'] }
  }

  try {
    const db = getDatabase()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    // 检查是否已存在配置
    const existingRow = getSEOConfigRow()
    if (existingRow) {
      // 已存在，返回当前配置
      return { success: true, config: parseSEOConfigRow(existingRow) }
    }

    // 创建默认配置
    db.run(`
      INSERT INTO seo_config (id, page_meta, schemas, sitemap_config, robots_txt, updated_at)
      VALUES (1, ?, ?, ?, ?, ?)
    `, [
      JSON.stringify(DEFAULT_PAGE_META),
      JSON.stringify(DEFAULT_SCHEMA_CONFIG),
      JSON.stringify(DEFAULT_SITEMAP_CONFIG),
      DEFAULT_ROBOTS_TXT,
      now
    ])

    saveDatabase()

    // 返回创建的配置
    const newRow = getSEOConfigRow()
    if (!newRow) {
      return { success: false, errors: ['创建配置后无法读取'] }
    }

    return { success: true, config: parseSEOConfigRow(newRow) }
  } catch (error) {
    console.error('初始化 SEO 配置失败:', error)
    return { success: false, errors: ['初始化 SEO 配置失败'] }
  }
}

/**
 * 重置 SEO 配置为默认值
 * 
 * @returns 重置结果
 */
export function resetSEOConfig(): {
  success: boolean
  config?: SEOConfigRecord
  errors?: string[]
} {
  if (!isDatabaseInitialized()) {
    return { success: false, errors: ['数据库未初始化'] }
  }

  try {
    const db = getDatabase()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    db.run(`
      UPDATE seo_config
      SET page_meta = ?, schemas = ?, sitemap_config = ?, robots_txt = ?, updated_at = ?
      WHERE id = 1
    `, [
      JSON.stringify(DEFAULT_PAGE_META),
      JSON.stringify(DEFAULT_SCHEMA_CONFIG),
      JSON.stringify(DEFAULT_SITEMAP_CONFIG),
      DEFAULT_ROBOTS_TXT,
      now
    ])

    saveDatabase()

    // 返回重置后的配置
    const row = getSEOConfigRow()
    if (!row) {
      return { success: false, errors: ['重置后无法读取配置'] }
    }

    return { success: true, config: parseSEOConfigRow(row) }
  } catch (error) {
    console.error('重置 SEO 配置失败:', error)
    return { success: false, errors: ['重置 SEO 配置失败'] }
  }
}

/**
 * 导出 SEO 配置为 JSON
 * 
 * @param pretty - 是否格式化输出
 * @returns 导出结果
 */
export function exportSEOConfig(pretty: boolean = true): {
  success: boolean
  json?: string
  errors?: string[]
} {
  try {
    const config = getSEOConfig()
    const json = pretty ? JSON.stringify(config, null, 2) : JSON.stringify(config)
    return { success: true, json }
  } catch (error) {
    console.error('导出 SEO 配置失败:', error)
    return { success: false, errors: ['导出 SEO 配置失败'] }
  }
}

/**
 * 导入 SEO 配置
 * 
 * @param json - JSON 格式的配置字符串
 * @returns 导入结果
 */
export function importSEOConfig(json: string): {
  success: boolean
  config?: SEOConfigRecord
  errors?: string[]
} {
  if (!json || typeof json !== 'string') {
    return { success: false, errors: ['无效的 JSON 字符串'] }
  }

  try {
    const config = JSON.parse(json) as SEOConfig

    // 基本结构验证
    if (!config || typeof config !== 'object') {
      return { success: false, errors: ['无效的配置格式'] }
    }

    // 更新各部分配置
    const errors: string[] = []

    if (config.pageMeta) {
      const result = updateAllPageMeta(config.pageMeta)
      if (!result.success && result.errors) {
        errors.push(...result.errors)
      }
    }

    if (config.schemas) {
      const result = updateSchemas(config.schemas)
      if (!result.success && result.errors) {
        errors.push(...result.errors)
      }
    }

    if (config.sitemapConfig) {
      const result = updateSitemapConfig(config.sitemapConfig)
      if (!result.success && result.errors) {
        errors.push(...result.errors)
      }
    }

    if (config.robotsTxt !== undefined) {
      const result = updateRobotsTxt(config.robotsTxt)
      if (!result.success && result.errors) {
        errors.push(...result.errors)
      }
    }

    if (errors.length > 0) {
      return { success: false, errors }
    }

    // 返回更新后的配置
    const record = getSEOConfigRecord()
    return { success: true, config: record || undefined }
  } catch (error) {
    console.error('导入 SEO 配置失败:', error)
    return { success: false, errors: ['导入 SEO 配置失败，请检查 JSON 格式'] }
  }
}
