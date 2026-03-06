/**
 * SEO 服务单元测试
 * 
 * 测试 SEO 管理相关的配置读写和生成功能
 * 
 * 需求: 7.1.1-7.4.2
 */

import { initDatabase, closeDatabase, resetDatabase } from '../../database/init'
import {
  getPageMeta,
  getPageMetaByPage,
  updatePageMeta,
  updateAllPageMeta,
  getSchemas,
  updateSchemas,
  getSitemapConfig,
  updateSitemapConfig,
  addSitemapPage,
  removeSitemapPage,
  generateSitemap,
  getRobotsTxt,
  updateRobotsTxt,
  applyRobotsTemplate,
  getSEOConfig,
  initializeSEOConfig,
  resetSEOConfig,
  exportSEOConfig,
  importSEOConfig
} from '../seo'
import {
  PageMeta,
  PageMetaInput,
  SchemaConfig,
  SitemapConfig,
  DEFAULT_PAGE_META,
  DEFAULT_SCHEMA_CONFIG,
  DEFAULT_SITEMAP_CONFIG,
  DEFAULT_ROBOTS_TXT,
  ROBOTS_TEMPLATES,
  generateSitemapXml,
  validatePageMetaInput,
  isValidPageIdentifier,
  isValidChangeFrequency,
  isValidPriority
} from '../../models/seo'

// 测试前初始化数据库
beforeAll(async () => {
  await initDatabase(':memory:')
})

// 每个测试后重置数据库
afterEach(() => {
  resetDatabase()
})

// 测试后关闭数据库
afterAll(() => {
  closeDatabase()
})


// ========== 模型工具函数测试 ==========

describe('SEO 模型工具函数', () => {
  describe('isValidPageIdentifier（验证页面标识）', () => {
    it('应该接受有效的页面标识', () => {
      expect(isValidPageIdentifier('home')).toBe(true)
      expect(isValidPageIdentifier('about')).toBe(true)
      expect(isValidPageIdentifier('projects')).toBe(true)
      expect(isValidPageIdentifier('skills')).toBe(true)
      expect(isValidPageIdentifier('experience')).toBe(true)
      expect(isValidPageIdentifier('education')).toBe(true)
      expect(isValidPageIdentifier('contact')).toBe(true)
    })

    it('应该拒绝无效的页面标识', () => {
      expect(isValidPageIdentifier('invalid')).toBe(false)
      expect(isValidPageIdentifier('')).toBe(false)
      expect(isValidPageIdentifier('HOME')).toBe(false)
    })
  })

  describe('isValidChangeFrequency（验证更新频率）', () => {
    it('应该接受有效的更新频率', () => {
      expect(isValidChangeFrequency('always')).toBe(true)
      expect(isValidChangeFrequency('hourly')).toBe(true)
      expect(isValidChangeFrequency('daily')).toBe(true)
      expect(isValidChangeFrequency('weekly')).toBe(true)
      expect(isValidChangeFrequency('monthly')).toBe(true)
      expect(isValidChangeFrequency('yearly')).toBe(true)
      expect(isValidChangeFrequency('never')).toBe(true)
    })

    it('应该拒绝无效的更新频率', () => {
      expect(isValidChangeFrequency('invalid')).toBe(false)
      expect(isValidChangeFrequency('')).toBe(false)
    })
  })

  describe('isValidPriority（验证优先级）', () => {
    it('应该接受有效的优先级', () => {
      expect(isValidPriority(0)).toBe(true)
      expect(isValidPriority(0.5)).toBe(true)
      expect(isValidPriority(1)).toBe(true)
    })

    it('应该拒绝无效的优先级', () => {
      expect(isValidPriority(-0.1)).toBe(false)
      expect(isValidPriority(1.1)).toBe(false)
    })
  })

  describe('validatePageMetaInput（验证页面 Meta 输入）', () => {
    it('应该验证有效的输入', () => {
      const input: PageMetaInput = {
        page: 'home',
        title: '首页标题',
        description: '首页描述',
        keywords: ['关键词1', '关键词2']
      }

      const result = validatePageMetaInput(input)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该拒绝空标题', () => {
      const input: PageMetaInput = {
        page: 'home',
        title: '',
        description: '描述',
        keywords: []
      }

      const result = validatePageMetaInput(input)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('页面标题不能为空')
    })

    it('应该拒绝空描述', () => {
      const input: PageMetaInput = {
        page: 'home',
        title: '标题',
        description: '',
        keywords: []
      }

      const result = validatePageMetaInput(input)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('页面描述不能为空')
    })

    it('应该拒绝无效的页面标识', () => {
      const input = {
        page: 'invalid' as any,
        title: '标题',
        description: '描述',
        keywords: []
      }

      const result = validatePageMetaInput(input)
      expect(result.valid).toBe(false)
    })
  })


  describe('generateSitemapXml（生成 Sitemap XML）', () => {
    /**
     * 需求: 7.3.1 - 提供自动生成 sitemap.xml 功能
     */
    it('应该生成有效的 XML 格式', () => {
      const config: SitemapConfig = {
        baseUrl: 'https://example.com',
        pages: [
          { url: '/', priority: 1.0, changefreq: 'weekly' },
          { url: '/about', priority: 0.8, changefreq: 'monthly' }
        ]
      }

      const xml = generateSitemapXml(config)

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
      expect(xml).toContain('<loc>https://example.com/</loc>')
      expect(xml).toContain('<loc>https://example.com/about</loc>')
      expect(xml).toContain('<priority>1.0</priority>')
      expect(xml).toContain('<changefreq>weekly</changefreq>')
      expect(xml).toContain('</urlset>')
    })

    it('应该正确处理带尾部斜杠的 baseUrl', () => {
      const config: SitemapConfig = {
        baseUrl: 'https://example.com/',
        pages: [{ url: '/test', priority: 0.5, changefreq: 'daily' }]
      }

      const xml = generateSitemapXml(config)

      // 不应该有双斜杠
      expect(xml).not.toContain('https://example.com//test')
      expect(xml).toContain('https://example.com/test')
    })

    it('应该转义 XML 特殊字符', () => {
      const config: SitemapConfig = {
        baseUrl: 'https://example.com',
        pages: [{ url: '/search?q=test&page=1', priority: 0.5, changefreq: 'daily' }]
      }

      const xml = generateSitemapXml(config)

      expect(xml).toContain('&amp;')
    })
  })
})


// ========== Meta 配置管理测试 ==========

describe('Meta 配置管理', () => {
  describe('getPageMeta（获取页面 Meta）', () => {
    /**
     * 需求: 7.1.1-7.1.4 - 页面 Meta 配置
     */
    it('应该返回默认的页面 Meta 配置', () => {
      const metas = getPageMeta()

      expect(Array.isArray(metas)).toBe(true)
      expect(metas.length).toBeGreaterThan(0)
      
      // 检查是否包含所有默认页面
      const pages = metas.map(m => m.page)
      expect(pages).toContain('home')
      expect(pages).toContain('about')
      expect(pages).toContain('projects')
    })
  })

  describe('getPageMetaByPage（获取单个页面 Meta）', () => {
    it('应该返回指定页面的 Meta', () => {
      const meta = getPageMetaByPage('home')

      expect(meta).not.toBeNull()
      expect(meta?.page).toBe('home')
      expect(meta?.title).toBeDefined()
      expect(meta?.description).toBeDefined()
    })

    it('应该返回 null 对于无效的页面标识', () => {
      const meta = getPageMetaByPage('invalid' as any)
      expect(meta).toBeNull()
    })
  })

  describe('updatePageMeta（更新页面 Meta）', () => {
    /**
     * 需求: 7.1.1 - 提供各页面标题（title）配置
     * 需求: 7.1.2 - 提供各页面描述（description）配置
     * 需求: 7.1.3 - 提供关键词（keywords）配置
     */
    it('应该成功更新页面 Meta', () => {
      const result = updatePageMeta('home', {
        title: '新标题',
        description: '新描述',
        keywords: ['新关键词1', '新关键词2']
      })

      expect(result.success).toBe(true)
      expect(result.meta?.title).toBe('新标题')
      expect(result.meta?.description).toBe('新描述')
      expect(result.meta?.keywords).toContain('新关键词1')
    })

    /**
     * 需求: 7.1.4 - 提供 Open Graph 标签配置
     */
    it('应该支持 Open Graph 标签', () => {
      const result = updatePageMeta('home', {
        title: '标题',
        description: '描述',
        keywords: [],
        ogTitle: 'OG 标题',
        ogDescription: 'OG 描述',
        ogImage: 'https://example.com/image.jpg'
      })

      expect(result.success).toBe(true)
      expect(result.meta?.ogTitle).toBe('OG 标题')
      expect(result.meta?.ogDescription).toBe('OG 描述')
      expect(result.meta?.ogImage).toBe('https://example.com/image.jpg')
    })

    it('应该拒绝无效的输入', () => {
      const result = updatePageMeta('home', {
        title: '',
        description: '',
        keywords: []
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })
})


// ========== Schema 配置管理测试 ==========

describe('Schema 配置管理', () => {
  describe('getSchemas（获取结构化数据配置）', () => {
    /**
     * 需求: 7.2.1-7.2.3 - 结构化数据配置
     */
    it('应该返回默认的 Schema 配置', () => {
      const schemas = getSchemas()

      expect(schemas).toBeDefined()
      expect(schemas.person).toBeDefined()
      expect(schemas.website).toBeDefined()
      expect(schemas.breadcrumb).toBeDefined()
    })
  })

  describe('updateSchemas（更新结构化数据配置）', () => {
    /**
     * 需求: 7.2.1 - 提供 Person Schema 配置
     */
    it('应该成功更新 Person Schema', () => {
      const schemas = getSchemas()
      schemas.person.name = '张三'
      schemas.person.jobTitle = '前端工程师'

      const result = updateSchemas(schemas)

      expect(result.success).toBe(true)
      expect(result.schemas?.person.name).toBe('张三')
      expect(result.schemas?.person.jobTitle).toBe('前端工程师')
    })

    /**
     * 需求: 7.2.2 - 提供 WebSite Schema 配置
     */
    it('应该成功更新 WebSite Schema', () => {
      const schemas = getSchemas()
      schemas.website.name = '我的网站'
      schemas.website.url = 'https://mysite.com'

      const result = updateSchemas(schemas)

      expect(result.success).toBe(true)
      expect(result.schemas?.website.name).toBe('我的网站')
      expect(result.schemas?.website.url).toBe('https://mysite.com')
    })

    it('应该拒绝无效的配置', () => {
      const result = updateSchemas({} as any)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })
})


// ========== Sitemap 管理测试 ==========

describe('Sitemap 管理', () => {
  describe('getSitemapConfig（获取 Sitemap 配置）', () => {
    /**
     * 需求: 7.3.1-7.3.3 - Sitemap 管理
     */
    it('应该返回默认的 Sitemap 配置', () => {
      const config = getSitemapConfig()

      expect(config).toBeDefined()
      expect(config.baseUrl).toBeDefined()
      expect(Array.isArray(config.pages)).toBe(true)
    })
  })

  describe('updateSitemapConfig（更新 Sitemap 配置）', () => {
    /**
     * 需求: 7.3.2 - 提供页面优先级配置
     * 需求: 7.3.3 - 提供更新频率配置
     */
    it('应该成功更新 Sitemap 配置', () => {
      const config: SitemapConfig = {
        baseUrl: 'https://newsite.com',
        pages: [
          { url: '/', priority: 1.0, changefreq: 'daily' },
          { url: '/about', priority: 0.9, changefreq: 'weekly' }
        ]
      }

      const result = updateSitemapConfig(config)

      expect(result.success).toBe(true)
      expect(result.config?.baseUrl).toBe('https://newsite.com')
      expect(result.config?.pages.length).toBe(2)
    })

    it('应该拒绝无效的优先级', () => {
      const config: SitemapConfig = {
        baseUrl: 'https://example.com',
        pages: [{ url: '/', priority: 1.5, changefreq: 'daily' }]
      }

      const result = updateSitemapConfig(config)

      expect(result.success).toBe(false)
    })

    it('应该拒绝无效的更新频率', () => {
      const config = {
        baseUrl: 'https://example.com',
        pages: [{ url: '/', priority: 0.5, changefreq: 'invalid' }]
      } as SitemapConfig

      const result = updateSitemapConfig(config)

      expect(result.success).toBe(false)
    })
  })

  describe('addSitemapPage / removeSitemapPage（添加/删除页面）', () => {
    it('应该能添加新页面', () => {
      const result = addSitemapPage({
        url: '/new-page',
        priority: 0.7,
        changefreq: 'monthly'
      })

      expect(result.success).toBe(true)
      
      const config = getSitemapConfig()
      const newPage = config.pages.find(p => p.url === '/new-page')
      expect(newPage).toBeDefined()
    })

    it('应该拒绝重复的 URL', () => {
      // 先添加一个页面
      addSitemapPage({ url: '/test', priority: 0.5, changefreq: 'daily' })
      
      // 尝试添加相同 URL
      const result = addSitemapPage({ url: '/test', priority: 0.5, changefreq: 'daily' })

      expect(result.success).toBe(false)
      expect(result.errors).toContain('该 URL 已存在于 Sitemap 中')
    })

    it('应该能删除页面', () => {
      // 先添加一个页面
      addSitemapPage({ url: '/to-remove', priority: 0.5, changefreq: 'daily' })
      
      // 删除页面
      const result = removeSitemapPage('/to-remove')

      expect(result.success).toBe(true)
      
      const config = getSitemapConfig()
      const removed = config.pages.find(p => p.url === '/to-remove')
      expect(removed).toBeUndefined()
    })
  })

  describe('generateSitemap（生成 Sitemap 文件）', () => {
    /**
     * 需求: 7.3.1 - 提供自动生成 sitemap.xml 功能
     */
    it('应该生成有效的 sitemap.xml 内容', () => {
      const result = generateSitemap()

      expect(result.success).toBe(true)
      expect(result.content).toBeDefined()
      expect(result.content).toContain('<?xml version="1.0"')
      expect(result.content).toContain('<urlset')
    })
  })
})


// ========== Robots.txt 管理测试 ==========

describe('Robots.txt 管理', () => {
  describe('getRobotsTxt（获取 robots.txt）', () => {
    /**
     * 需求: 7.4.1 - 提供 robots.txt 编辑功能
     */
    it('应该返回默认的 robots.txt 内容', () => {
      const content = getRobotsTxt()

      expect(content).toBeDefined()
      expect(content).toContain('User-agent')
    })
  })

  describe('updateRobotsTxt（更新 robots.txt）', () => {
    /**
     * 需求: 7.4.1 - 提供 robots.txt 编辑功能
     */
    it('应该成功更新 robots.txt', () => {
      const newContent = `User-agent: *
Disallow: /admin/
Allow: /`

      const result = updateRobotsTxt(newContent)

      expect(result.success).toBe(true)
      expect(result.content).toBe(newContent)

      // 验证更新后的内容
      const content = getRobotsTxt()
      expect(content).toBe(newContent)
    })
  })

  describe('applyRobotsTemplate（应用模板）', () => {
    /**
     * 需求: 7.4.2 - 提供常用规则模板
     */
    it('应该成功应用模板', () => {
      const template = ROBOTS_TEMPLATES[0] // 允许所有
      const result = applyRobotsTemplate(template.content, 'https://example.com/sitemap.xml')

      expect(result.success).toBe(true)
      expect(result.content).toContain('https://example.com/sitemap.xml')
    })

    it('应该替换 Sitemap URL 占位符', () => {
      const template = 'User-agent: *\nSitemap: {{SITEMAP_URL}}'
      const result = applyRobotsTemplate(template, 'https://test.com/sitemap.xml')

      expect(result.success).toBe(true)
      expect(result.content).not.toContain('{{SITEMAP_URL}}')
      expect(result.content).toContain('https://test.com/sitemap.xml')
    })
  })
})


// ========== 完整配置管理测试 ==========

describe('完整 SEO 配置管理', () => {
  describe('getSEOConfig（获取完整配置）', () => {
    it('应该返回完整的 SEO 配置', () => {
      const config = getSEOConfig()

      expect(config).toBeDefined()
      expect(config.pageMeta).toBeDefined()
      expect(config.schemas).toBeDefined()
      expect(config.sitemapConfig).toBeDefined()
      expect(config.robotsTxt).toBeDefined()
    })
  })

  describe('initializeSEOConfig（初始化配置）', () => {
    it('应该成功初始化配置', () => {
      const result = initializeSEOConfig()

      expect(result.success).toBe(true)
      expect(result.config).toBeDefined()
    })
  })

  describe('resetSEOConfig（重置配置）', () => {
    it('应该重置为默认配置', () => {
      // 先修改配置
      updatePageMeta('home', {
        title: '修改后的标题',
        description: '修改后的描述',
        keywords: ['修改后']
      })

      // 重置配置
      const result = resetSEOConfig()

      expect(result.success).toBe(true)

      // 验证已重置
      const meta = getPageMetaByPage('home')
      expect(meta?.title).not.toBe('修改后的标题')
    })
  })

  describe('exportSEOConfig / importSEOConfig（导出/导入配置）', () => {
    it('应该成功导出配置', () => {
      const result = exportSEOConfig()

      expect(result.success).toBe(true)
      expect(result.json).toBeDefined()

      // 验证是有效的 JSON
      const parsed = JSON.parse(result.json!)
      expect(parsed.pageMeta).toBeDefined()
      expect(parsed.schemas).toBeDefined()
    })

    it('应该成功导入配置', () => {
      // 先导出
      const exportResult = exportSEOConfig()
      const json = exportResult.json!

      // 修改配置
      const config = JSON.parse(json)
      config.pageMeta[0].title = '导入测试标题'

      // 导入
      const importResult = importSEOConfig(JSON.stringify(config))

      expect(importResult.success).toBe(true)
    })

    it('应该拒绝无效的 JSON', () => {
      const result = importSEOConfig('invalid json')

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })
})
