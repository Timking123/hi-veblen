/**
 * SEO 管理控制器模块
 * 处理 /api/seo/* 路由的请求
 * 
 * 需求: 7.1.1 - 提供各页面标题（title）配置
 * 需求: 7.1.2 - 提供各页面描述（description）配置
 * 需求: 7.1.3 - 提供关键词（keywords）配置
 * 需求: 7.1.4 - 提供 Open Graph 标签配置
 * 需求: 7.2.1 - 提供 Person Schema 配置
 * 需求: 7.2.2 - 提供 WebSite Schema 配置
 * 需求: 7.2.3 - 提供面包屑导航 Schema 配置
 * 需求: 7.3.1 - 提供自动生成 sitemap.xml 功能
 * 需求: 7.3.2 - 提供页面优先级配置
 * 需求: 7.3.3 - 提供更新频率配置
 * 需求: 7.4.1 - 提供 robots.txt 编辑功能
 * 需求: 7.4.2 - 提供常用规则模板
 */

import { Request, Response } from 'express'
import path from 'path'
import {
  getPageMeta,
  getPageMetaByPage,
  updatePageMeta,
  getSchemas,
  updateSchemas,
  getSitemapConfig,
  updateSitemapConfig,
  generateSitemap,
  getRobotsTxt,
  updateRobotsTxt,
  applyRobotsTemplate,
  getSEOConfig,
  resetSEOConfig,
  exportSEOConfig,
  importSEOConfig
} from '../services/seo'
import {
  isValidPageIdentifier,
  ROBOTS_TEMPLATES,
  PageMetaInput,
  SchemaConfig,
  SitemapConfig
} from '../models/seo'

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: number
  message: string
  details?: {
    field?: string
    reason?: string
  }
}

/**
 * 发送错误响应
 * 
 * @param res - Express Response 对象
 * @param code - HTTP 状态码
 * @param message - 错误消息
 * @param details - 错误详情（可选）
 */
function sendError(
  res: Response,
  code: number,
  message: string,
  details?: ErrorResponse['details']
): void {
  const errorResponse: ErrorResponse = {
    code,
    message
  }
  
  if (details) {
    errorResponse.details = details
  }
  
  res.status(code).json(errorResponse)
}

// ========== Meta 配置管理 ==========

/**
 * 获取所有页面 Meta 配置
 * GET /api/seo/meta
 * 
 * 需要认证: 是
 * 响应: { data: PageMeta[] }
 * 
 * 需求: 7.1.1-7.1.4
 */
export function getAllMetaHandler(_req: Request, res: Response): void {
  try {
    const data = getPageMeta()
    res.json({ data })
  } catch (error) {
    console.error('获取 Meta 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 获取单个页面 Meta 配置
 * GET /api/seo/meta/:page
 * 
 * 需要认证: 是
 * 路径参数: page - 页面标识
 * 响应: { meta: PageMeta }
 * 
 * 需求: 7.1.1-7.1.4
 */
export function getMetaByPageHandler(req: Request, res: Response): void {
  try {
    const { page } = req.params
    
    // 验证页面标识
    if (!page) {
      sendError(res, 400, '请提供页面标识', {
        field: 'page',
        reason: 'required'
      })
      return
    }
    
    if (!isValidPageIdentifier(page)) {
      sendError(res, 400, '无效的页面标识', {
        field: 'page',
        reason: 'invalid_value'
      })
      return
    }
    
    const meta = getPageMetaByPage(page)
    
    if (!meta) {
      sendError(res, 404, '页面 Meta 配置不存在')
      return
    }
    
    res.json({ meta })
  } catch (error) {
    console.error('获取页面 Meta 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新页面 Meta 配置
 * PUT /api/seo/meta/:page
 * 
 * 需要认证: 是
 * 路径参数: page - 页面标识
 * 请求体: { title, description, keywords, ogTitle?, ogDescription?, ogImage? }
 * 响应: { success: boolean, meta?: PageMeta }
 * 
 * 需求: 7.1.1-7.1.4
 */
export function updateMetaHandler(req: Request, res: Response): void {
  try {
    const { page } = req.params
    const { title, description, keywords, ogTitle, ogDescription, ogImage } = req.body
    
    // 验证页面标识
    if (!page) {
      sendError(res, 400, '请提供页面标识', {
        field: 'page',
        reason: 'required'
      })
      return
    }
    
    if (!isValidPageIdentifier(page)) {
      sendError(res, 400, '无效的页面标识', {
        field: 'page',
        reason: 'invalid_value'
      })
      return
    }
    
    // 验证必填字段
    if (!title || typeof title !== 'string') {
      sendError(res, 400, '请提供页面标题', {
        field: 'title',
        reason: 'required'
      })
      return
    }
    
    if (!description || typeof description !== 'string') {
      sendError(res, 400, '请提供页面描述', {
        field: 'description',
        reason: 'required'
      })
      return
    }
    
    if (!Array.isArray(keywords)) {
      sendError(res, 400, '关键词必须是数组', {
        field: 'keywords',
        reason: 'invalid_type'
      })
      return
    }
    
    // 构建更新数据
    const metaInput: Omit<PageMetaInput, 'page'> = {
      title,
      description,
      keywords,
      ogTitle,
      ogDescription,
      ogImage
    }
    
    // 更新 Meta 配置
    const result = updatePageMeta(page, metaInput)
    
    if (!result.success) {
      sendError(res, 400, result.errors?.[0] || '更新 Meta 配置失败')
      return
    }
    
    res.json({ success: true, meta: result.meta })
  } catch (error) {
    console.error('更新 Meta 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== Schema 配置管理 ==========

/**
 * 获取结构化数据配置
 * GET /api/seo/schema
 * 
 * 需要认证: 是
 * 响应: { schemas: SchemaConfig }
 * 
 * 需求: 7.2.1-7.2.3
 */
export function getSchemasHandler(_req: Request, res: Response): void {
  try {
    const schemas = getSchemas()
    res.json({ schemas })
  } catch (error) {
    console.error('获取 Schema 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新结构化数据配置
 * PUT /api/seo/schema
 * 
 * 需要认证: 是
 * 请求体: SchemaConfig
 * 响应: { success: boolean, schemas?: SchemaConfig }
 * 
 * 需求: 7.2.1-7.2.3
 */
export function updateSchemasHandler(req: Request, res: Response): void {
  try {
    const schemas = req.body as SchemaConfig
    
    // 基本验证
    if (!schemas || typeof schemas !== 'object') {
      sendError(res, 400, '请提供有效的 Schema 配置', {
        field: 'schemas',
        reason: 'required'
      })
      return
    }
    
    // 更新 Schema 配置
    const result = updateSchemas(schemas)
    
    if (!result.success) {
      sendError(res, 400, result.errors?.[0] || '更新 Schema 配置失败')
      return
    }
    
    res.json({ success: true, schemas: result.schemas })
  } catch (error) {
    console.error('更新 Schema 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== Sitemap 管理 ==========

/**
 * 获取 Sitemap 配置
 * GET /api/seo/sitemap
 * 
 * 需要认证: 是
 * 响应: { config: SitemapConfig }
 * 
 * 需求: 7.3.1-7.3.3
 */
export function getSitemapConfigHandler(_req: Request, res: Response): void {
  try {
    const config = getSitemapConfig()
    res.json({ config })
  } catch (error) {
    console.error('获取 Sitemap 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新 Sitemap 配置
 * PUT /api/seo/sitemap
 * 
 * 需要认证: 是
 * 请求体: SitemapConfig
 * 响应: { success: boolean, config?: SitemapConfig }
 * 
 * 需求: 7.3.2-7.3.3
 */
export function updateSitemapConfigHandler(req: Request, res: Response): void {
  try {
    const config = req.body as SitemapConfig
    
    // 基本验证
    if (!config || typeof config !== 'object') {
      sendError(res, 400, '请提供有效的 Sitemap 配置', {
        field: 'config',
        reason: 'required'
      })
      return
    }
    
    // 更新 Sitemap 配置
    const result = updateSitemapConfig(config)
    
    if (!result.success) {
      sendError(res, 400, result.errors?.[0] || '更新 Sitemap 配置失败')
      return
    }
    
    res.json({ success: true, config: result.config })
  } catch (error) {
    console.error('更新 Sitemap 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 生成 sitemap.xml 文件
 * POST /api/seo/sitemap/generate
 * 
 * 需要认证: 是
 * 请求体: { outputPath?: string }（可选，默认为 public/sitemap.xml）
 * 响应: { success: boolean, path?: string, content?: string }
 * 
 * 需求: 7.3.1
 */
export function generateSitemapHandler(req: Request, res: Response): void {
  try {
    const { outputPath } = req.body
    
    // 如果提供了输出路径，验证路径安全性
    let safePath: string | undefined
    if (outputPath && typeof outputPath === 'string') {
      // 确保路径在项目目录内
      const normalizedPath = path.normalize(outputPath)
      if (normalizedPath.includes('..')) {
        sendError(res, 400, '无效的输出路径', {
          field: 'outputPath',
          reason: 'invalid_path'
        })
        return
      }
      safePath = normalizedPath
    }
    
    // 生成 sitemap.xml
    const result = generateSitemap(safePath)
    
    if (!result.success) {
      sendError(res, 500, result.errors?.[0] || '生成 sitemap.xml 失败')
      return
    }
    
    res.json({
      success: true,
      path: result.path,
      content: result.content
    })
  } catch (error) {
    console.error('生成 sitemap.xml 错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== Robots.txt 管理 ==========

/**
 * 获取 robots.txt 内容
 * GET /api/seo/robots
 * 
 * 需要认证: 是
 * 响应: { content: string }
 * 
 * 需求: 7.4.1
 */
export function getRobotsTxtHandler(_req: Request, res: Response): void {
  try {
    const content = getRobotsTxt()
    res.json({ content })
  } catch (error) {
    console.error('获取 robots.txt 错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新 robots.txt 内容
 * PUT /api/seo/robots
 * 
 * 需要认证: 是
 * 请求体: { content: string }
 * 响应: { success: boolean, content?: string }
 * 
 * 需求: 7.4.1
 */
export function updateRobotsTxtHandler(req: Request, res: Response): void {
  try {
    const { content } = req.body
    
    // 验证内容
    if (content === undefined || content === null) {
      sendError(res, 400, '请提供 robots.txt 内容', {
        field: 'content',
        reason: 'required'
      })
      return
    }
    
    if (typeof content !== 'string') {
      sendError(res, 400, 'robots.txt 内容必须是字符串', {
        field: 'content',
        reason: 'invalid_type'
      })
      return
    }
    
    // 更新 robots.txt
    const result = updateRobotsTxt(content)
    
    if (!result.success) {
      sendError(res, 400, result.errors?.[0] || '更新 robots.txt 失败')
      return
    }
    
    res.json({ success: true, content: result.content })
  } catch (error) {
    console.error('更新 robots.txt 错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 获取 robots.txt 模板列表
 * GET /api/seo/robots/templates
 * 
 * 需要认证: 是
 * 响应: { templates: RobotsTemplate[] }
 * 
 * 需求: 7.4.2
 */
export function getRobotsTemplatesHandler(_req: Request, res: Response): void {
  try {
    res.json({ templates: ROBOTS_TEMPLATES })
  } catch (error) {
    console.error('获取 robots.txt 模板错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 应用 robots.txt 模板
 * POST /api/seo/robots/apply-template
 * 
 * 需要认证: 是
 * 请求体: { templateContent: string, sitemapUrl?: string }
 * 响应: { success: boolean, content?: string }
 * 
 * 需求: 7.4.2
 */
export function applyRobotsTemplateHandler(req: Request, res: Response): void {
  try {
    const { templateContent, sitemapUrl } = req.body
    
    // 验证模板内容
    if (!templateContent || typeof templateContent !== 'string') {
      sendError(res, 400, '请提供模板内容', {
        field: 'templateContent',
        reason: 'required'
      })
      return
    }
    
    // 应用模板
    const result = applyRobotsTemplate(templateContent, sitemapUrl)
    
    if (!result.success) {
      sendError(res, 400, result.errors?.[0] || '应用模板失败')
      return
    }
    
    res.json({ success: true, content: result.content })
  } catch (error) {
    console.error('应用 robots.txt 模板错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== 完整配置管理 ==========

/**
 * 获取完整 SEO 配置
 * GET /api/seo/config
 * 
 * 需要认证: 是
 * 响应: { config: SEOConfig }
 */
export function getSEOConfigHandler(_req: Request, res: Response): void {
  try {
    const config = getSEOConfig()
    res.json({ config })
  } catch (error) {
    console.error('获取 SEO 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 重置 SEO 配置为默认值
 * POST /api/seo/config/reset
 * 
 * 需要认证: 是
 * 响应: { success: boolean, config?: SEOConfigRecord }
 */
export function resetSEOConfigHandler(_req: Request, res: Response): void {
  try {
    const result = resetSEOConfig()
    
    if (!result.success) {
      sendError(res, 500, result.errors?.[0] || '重置 SEO 配置失败')
      return
    }
    
    res.json({ success: true, config: result.config })
  } catch (error) {
    console.error('重置 SEO 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 导出 SEO 配置
 * GET /api/seo/config/export
 * 
 * 需要认证: 是
 * 查询参数:
 * - pretty: 是否格式化输出（默认 true）
 * 
 * 响应: JSON 文件下载
 */
export function exportSEOConfigHandler(req: Request, res: Response): void {
  try {
    const { pretty } = req.query
    const prettyBool = pretty !== 'false'
    
    const result = exportSEOConfig(prettyBool)
    
    if (!result.success || !result.json) {
      sendError(res, 500, result.errors?.[0] || '导出 SEO 配置失败')
      return
    }
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const filename = `seo-config-${timestamp}.json`
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', Buffer.byteLength(result.json, 'utf8'))
    
    // 发送文件数据
    res.send(result.json)
  } catch (error) {
    console.error('导出 SEO 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 导入 SEO 配置
 * POST /api/seo/config/import
 * 
 * 需要认证: 是
 * 请求体: JSON 格式的 SEO 配置
 * 响应: { success: boolean, config?: SEOConfigRecord }
 */
export function importSEOConfigHandler(req: Request, res: Response): void {
  try {
    let json: string
    
    // 支持两种方式：直接传 JSON 对象或传 JSON 字符串
    if (typeof req.body === 'string') {
      json = req.body
    } else if (typeof req.body === 'object') {
      json = JSON.stringify(req.body)
    } else {
      sendError(res, 400, '请提供有效的 JSON 配置', {
        field: 'config',
        reason: 'required'
      })
      return
    }
    
    const result = importSEOConfig(json)
    
    if (!result.success) {
      sendError(res, 400, result.errors?.[0] || '导入 SEO 配置失败')
      return
    }
    
    res.json({ success: true, config: result.config })
  } catch (error) {
    console.error('导入 SEO 配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}
