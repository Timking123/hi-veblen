/**
 * SEO 管理路由模块
 * 注册所有 SEO 管理相关路由
 * 
 * 路由列表:
 * 
 * Meta 配置管理:
 * - GET /meta - 获取所有页面 Meta 配置（需要认证）
 * - GET /meta/:page - 获取单个页面 Meta 配置（需要认证）
 * - PUT /meta/:page - 更新页面 Meta 配置（需要认证）
 * 
 * Schema 配置管理:
 * - GET /schema - 获取结构化数据配置（需要认证）
 * - PUT /schema - 更新结构化数据配置（需要认证）
 * 
 * Sitemap 管理:
 * - GET /sitemap - 获取 Sitemap 配置（需要认证）
 * - PUT /sitemap - 更新 Sitemap 配置（需要认证）
 * - POST /sitemap/generate - 生成 sitemap.xml 文件（需要认证）
 * 
 * Robots.txt 管理:
 * - GET /robots - 获取 robots.txt 内容（需要认证）
 * - PUT /robots - 更新 robots.txt 内容（需要认证）
 * - GET /robots/templates - 获取 robots.txt 模板列表（需要认证）
 * - POST /robots/apply-template - 应用 robots.txt 模板（需要认证）
 * 
 * 完整配置管理:
 * - GET /config - 获取完整 SEO 配置（需要认证）
 * - POST /config/reset - 重置为默认配置（需要认证）
 * - GET /config/export - 导出配置（需要认证）
 * - POST /config/import - 导入配置（需要认证）
 * 
 * 需求: 7.1.1-7.4.2
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import {
  // Meta 配置管理
  getAllMetaHandler,
  getMetaByPageHandler,
  updateMetaHandler,
  // Schema 配置管理
  getSchemasHandler,
  updateSchemasHandler,
  // Sitemap 管理
  getSitemapConfigHandler,
  updateSitemapConfigHandler,
  generateSitemapHandler,
  // Robots.txt 管理
  getRobotsTxtHandler,
  updateRobotsTxtHandler,
  getRobotsTemplatesHandler,
  applyRobotsTemplateHandler,
  // 完整配置管理
  getSEOConfigHandler,
  resetSEOConfigHandler,
  exportSEOConfigHandler,
  importSEOConfigHandler
} from '../controllers/seo'

const router = Router()

// ========== Meta 配置管理路由 ==========

/**
 * GET /meta
 * 获取所有页面 Meta 配置
 * 
 * 需要认证: 是
 * 响应: { data: PageMeta[] }
 * 
 * 需求: 7.1.1-7.1.4
 */
router.get('/meta', authMiddleware, getAllMetaHandler)

/**
 * GET /meta/:page
 * 获取单个页面 Meta 配置
 * 
 * 需要认证: 是
 * 路径参数: page - 页面标识
 * 响应: { meta: PageMeta }
 * 
 * 需求: 7.1.1-7.1.4
 */
router.get('/meta/:page', authMiddleware, getMetaByPageHandler)

/**
 * PUT /meta/:page
 * 更新页面 Meta 配置
 * 
 * 需要认证: 是
 * 路径参数: page - 页面标识
 * 请求体: { title, description, keywords, ogTitle?, ogDescription?, ogImage? }
 * 响应: { success, meta? }
 * 
 * 需求: 7.1.1-7.1.4
 */
router.put('/meta/:page', authMiddleware, updateMetaHandler)

// ========== Schema 配置管理路由 ==========

/**
 * GET /schema
 * 获取结构化数据配置
 * 
 * 需要认证: 是
 * 响应: { schemas: SchemaConfig }
 * 
 * 需求: 7.2.1-7.2.3
 */
router.get('/schema', authMiddleware, getSchemasHandler)

/**
 * PUT /schema
 * 更新结构化数据配置
 * 
 * 需要认证: 是
 * 请求体: SchemaConfig
 * 响应: { success, schemas? }
 * 
 * 需求: 7.2.1-7.2.3
 */
router.put('/schema', authMiddleware, updateSchemasHandler)

// ========== Sitemap 管理路由 ==========

/**
 * POST /sitemap/generate
 * 生成 sitemap.xml 文件
 * 
 * 需要认证: 是
 * 请求体: { outputPath?: string }
 * 响应: { success, path?, content? }
 * 
 * 注意: 此路由必须在 /sitemap 之前定义
 * 
 * 需求: 7.3.1
 */
router.post('/sitemap/generate', authMiddleware, generateSitemapHandler)

/**
 * GET /sitemap
 * 获取 Sitemap 配置
 * 
 * 需要认证: 是
 * 响应: { config: SitemapConfig }
 * 
 * 需求: 7.3.1-7.3.3
 */
router.get('/sitemap', authMiddleware, getSitemapConfigHandler)

/**
 * PUT /sitemap
 * 更新 Sitemap 配置
 * 
 * 需要认证: 是
 * 请求体: SitemapConfig
 * 响应: { success, config? }
 * 
 * 需求: 7.3.2-7.3.3
 */
router.put('/sitemap', authMiddleware, updateSitemapConfigHandler)

// ========== Robots.txt 管理路由 ==========

/**
 * GET /robots/templates
 * 获取 robots.txt 模板列表
 * 
 * 需要认证: 是
 * 响应: { templates: RobotsTemplate[] }
 * 
 * 注意: 此路由必须在 /robots 之前定义
 * 
 * 需求: 7.4.2
 */
router.get('/robots/templates', authMiddleware, getRobotsTemplatesHandler)

/**
 * POST /robots/apply-template
 * 应用 robots.txt 模板
 * 
 * 需要认证: 是
 * 请求体: { templateContent: string, sitemapUrl?: string }
 * 响应: { success, content? }
 * 
 * 注意: 此路由必须在 /robots 之前定义
 * 
 * 需求: 7.4.2
 */
router.post('/robots/apply-template', authMiddleware, applyRobotsTemplateHandler)

/**
 * GET /robots
 * 获取 robots.txt 内容
 * 
 * 需要认证: 是
 * 响应: { content: string }
 * 
 * 需求: 7.4.1
 */
router.get('/robots', authMiddleware, getRobotsTxtHandler)

/**
 * PUT /robots
 * 更新 robots.txt 内容
 * 
 * 需要认证: 是
 * 请求体: { content: string }
 * 响应: { success, content? }
 * 
 * 需求: 7.4.1
 */
router.put('/robots', authMiddleware, updateRobotsTxtHandler)

// ========== 完整配置管理路由 ==========

/**
 * GET /config/export
 * 导出 SEO 配置
 * 
 * 需要认证: 是
 * 查询参数: pretty (可选，默认 true)
 * 响应: JSON 文件下载
 * 
 * 注意: 此路由必须在 /config 之前定义
 */
router.get('/config/export', authMiddleware, exportSEOConfigHandler)

/**
 * POST /config/reset
 * 重置 SEO 配置为默认值
 * 
 * 需要认证: 是
 * 响应: { success, config? }
 * 
 * 注意: 此路由必须在 /config 之前定义
 */
router.post('/config/reset', authMiddleware, resetSEOConfigHandler)

/**
 * POST /config/import
 * 导入 SEO 配置
 * 
 * 需要认证: 是
 * 请求体: JSON 格式的 SEO 配置
 * 响应: { success, config? }
 * 
 * 注意: 此路由必须在 /config 之前定义
 */
router.post('/config/import', authMiddleware, importSEOConfigHandler)

/**
 * GET /config
 * 获取完整 SEO 配置
 * 
 * 需要认证: 是
 * 响应: { config: SEOConfig }
 */
router.get('/config', authMiddleware, getSEOConfigHandler)

export default router
