/**
 * SEO 管理属性测试
 * 
 * 使用属性测试验证 SEO 管理服务的通用正确性属性
 * 
 * **Feature: admin-system**
 * - **Property 13: Sitemap XML 生成有效性** (验证需求: 7.3.1)
 * - **Property 14: SEO 配置往返一致性** (验证需求: 7.1.1-7.1.4, 7.2.1-7.2.3, 7.3.2, 7.3.3, 7.4.1)
 */

import { describe, it, expect } from '@jest/globals'
import * as fc from 'fast-check'
import { initDatabase, closeDatabase } from '../database/init'
import {
  getSitemapConfig,
  updateSitemapConfig,
  generateSitemap,
  getPageMeta,
  updatePageMeta,
  getSchemas,
  updateSchemas,
  getRobotsTxt,
  updateRobotsTxt,
  getSEOConfig,
  exportSEOConfig,
  importSEOConfig
} from '../services/seo'
import {
  SitemapConfig,
  SitemapPage,
  ChangeFrequency,
  PageMeta,
  PageIdentifier,
  SchemaConfig,
  PersonSchema,
  WebsiteSchema,
  BreadcrumbSchema,
  DEFAULT_PAGES,
  generateSitemapXml
} from '../models/seo'

// ========== 生成器定义 ==========

/**
 * 生成有效的更新频率
 */
const changeFrequencyArb: fc.Arbitrary<ChangeFrequency> = fc.constantFrom(
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never'
)

/**
 * 生成有效的优先级 (0.0-1.0)
 */
const priorityArb: fc.Arbitrary<number> = fc.double({
  min: 0,
  max: 1,
  noNaN: true,
  noDefaultInfinity: true
})

/**
 * 生成有效的相对 URL 路径
 * 确保路径以 / 开头，不包含特殊 XML 字符
 */
const relativeUrlArb: fc.Arbitrary<string> = fc.stringOf(
  fc.constantFrom(
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    '-', '_'
  ),
  { minLength: 0, maxLength: 50 }
).map(s => '/' + s)

/**
 * 生成有效的基础 URL
 */
const baseUrlArb: fc.Arbitrary<string> = fc.tuple(
  fc.constantFrom('https://', 'http://'),
  fc.stringOf(
    fc.constantFrom(
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
      'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      '-', '.'
    ),
    { minLength: 3, maxLength: 30 }
  ),
  fc.constantFrom('.com', '.org', '.net', '.io', '.cn')
).map(([protocol, domain, tld]) => `${protocol}${domain}${tld}`)

/**
 * 生成有效的 ISO 日期字符串（可选）
 */
const lastmodArb: fc.Arbitrary<string | undefined> = fc.option(
  fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2030-12-31')
  }).map(d => d.toISOString().split('T')[0]),
  { nil: undefined }
)

/**
 * 生成有效的 Sitemap 页面配置
 * 
 * 需求: 7.3.2, 7.3.3
 */
const sitemapPageArb: fc.Arbitrary<SitemapPage> = fc.record({
  url: relativeUrlArb,
  priority: priorityArb,
  changefreq: changeFrequencyArb,
  lastmod: lastmodArb
})

/**
 * 生成有效的 Sitemap 配置
 * 
 * 需求: 7.3.1
 */
const sitemapConfigArb: fc.Arbitrary<SitemapConfig> = fc.record({
  baseUrl: baseUrlArb,
  pages: fc.array(sitemapPageArb, { minLength: 1, maxLength: 20 })
})

// ========== XML 验证辅助函数 ==========

/**
 * 验证 XML 是否具有正确的声明头
 */
function hasValidXmlDeclaration(xml: string): boolean {
  return xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')
}

/**
 * 验证 XML 是否具有正确的 urlset 根元素和命名空间
 */
function hasValidUrlsetElement(xml: string): boolean {
  return xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    && xml.includes('</urlset>')
}

/**
 * 验证 XML 是否包含正确数量的 url 元素
 */
function hasCorrectUrlCount(xml: string, expectedCount: number): boolean {
  const urlMatches = xml.match(/<url>/g)
  const urlCloseMatches = xml.match(/<\/url>/g)
  return urlMatches !== null 
    && urlCloseMatches !== null 
    && urlMatches.length === expectedCount 
    && urlCloseMatches.length === expectedCount
}

/**
 * 验证每个 url 元素是否包含必需的子元素
 */
function hasRequiredUrlElements(xml: string): boolean {
  // 提取所有 url 块
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g)
  if (!urlBlocks) return false

  for (const block of urlBlocks) {
    // 每个 url 必须包含 loc, changefreq, priority
    if (!block.includes('<loc>') || !block.includes('</loc>')) return false
    if (!block.includes('<changefreq>') || !block.includes('</changefreq>')) return false
    if (!block.includes('<priority>') || !block.includes('</priority>')) return false
  }
  return true
}

/**
 * 验证 loc 元素中的 URL 是否正确构建
 */
function hasValidLocUrls(xml: string, baseUrl: string, pages: SitemapPage[]): boolean {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  
  for (const page of pages) {
    const expectedUrl = page.url.startsWith('http')
      ? page.url
      : `${normalizedBaseUrl}${page.url.startsWith('/') ? page.url : '/' + page.url}`
    
    // 检查 URL 是否存在于 XML 中（需要考虑 XML 转义）
    const escapedUrl = expectedUrl
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
    
    if (!xml.includes(`<loc>${escapedUrl}</loc>`)) {
      return false
    }
  }
  return true
}

/**
 * 验证 changefreq 元素的值是否有效
 */
function hasValidChangefreqValues(xml: string): boolean {
  const changefreqMatches = xml.match(/<changefreq>([^<]+)<\/changefreq>/g)
  if (!changefreqMatches) return false

  const validValues = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
  for (const match of changefreqMatches) {
    const value = match.replace(/<\/?changefreq>/g, '')
    if (!validValues.includes(value)) return false
  }
  return true
}

/**
 * 验证 priority 元素的值是否在有效范围内 (0.0-1.0)
 */
function hasValidPriorityValues(xml: string): boolean {
  const priorityMatches = xml.match(/<priority>([^<]+)<\/priority>/g)
  if (!priorityMatches) return false

  for (const match of priorityMatches) {
    const value = parseFloat(match.replace(/<\/?priority>/g, ''))
    if (isNaN(value) || value < 0 || value > 1) return false
  }
  return true
}

/**
 * 验证 lastmod 元素的值是否为有效日期格式（如果存在）
 */
function hasValidLastmodValues(xml: string): boolean {
  const lastmodMatches = xml.match(/<lastmod>([^<]+)<\/lastmod>/g)
  if (!lastmodMatches) return true // lastmod 是可选的

  // ISO 日期格式正则：YYYY-MM-DD 或完整 ISO 格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
  for (const match of lastmodMatches) {
    const value = match.replace(/<\/?lastmod>/g, '')
    if (!dateRegex.test(value)) return false
  }
  return true
}

/**
 * 验证 XML 是否为格式良好的 XML（基本检查）
 */
function isWellFormedXml(xml: string): boolean {
  // 检查基本的标签配对
  const openTags = xml.match(/<[a-z][a-z0-9]*[^>]*>/gi) || []
  const closeTags = xml.match(/<\/[a-z][a-z0-9]*>/gi) || []
  
  // 自闭合标签不需要配对
  const selfClosingCount = (xml.match(/<[a-z][a-z0-9]*[^>]*\/>/gi) || []).length
  
  // 简单检查：开标签数量（减去自闭合）应该等于闭标签数量
  // 注意：这是简化检查，不是完整的 XML 验证
  return openTags.length - selfClosingCount === closeTags.length
}

// ========== 测试套件 ==========

describe('SEO 管理属性测试', () => {
  /**
   * Property 13: Sitemap XML 生成有效性
   * 
   * 对于任意有效的 Sitemap 配置，生成的 sitemap.xml 应该是符合 Sitemap 协议的有效 XML 文档。
   * 
   * **Validates: Requirements 7.3.1**
   */
  describe('Property 13: Sitemap XML 生成有效性', () => {

    describe('XML 声明和结构有效性', () => {
      it('生成的 XML 应该具有正确的 XML 声明头', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证 XML 声明
              expect(hasValidXmlDeclaration(xml)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('生成的 XML 应该具有正确的 urlset 根元素和 Sitemap 命名空间', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证 urlset 元素和命名空间
              expect(hasValidUrlsetElement(xml)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('生成的 XML 应该是格式良好的 XML 文档', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证 XML 格式良好
              expect(isWellFormedXml(xml)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('URL 条目数量正确性', () => {
      it('生成的 XML 应该包含与配置中页面数量相同的 url 元素', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证 url 元素数量
              expect(hasCorrectUrlCount(xml, config.pages.length)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('空页面列表应该生成只有 urlset 容器的 XML', () => {
        fc.assert(
          fc.property(
            baseUrlArb,
            (baseUrl) => {
              const config: SitemapConfig = {
                baseUrl,
                pages: []
              }

              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证结构
              expect(hasValidXmlDeclaration(xml)).toBe(true)
              expect(hasValidUrlsetElement(xml)).toBe(true)
              expect(hasCorrectUrlCount(xml, 0)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('必需元素完整性', () => {
      it('每个 url 元素应该包含 loc、changefreq 和 priority 子元素', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证必需元素
              expect(hasRequiredUrlElements(xml)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('loc 元素应该包含正确构建的完整 URL', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证 loc URL
              expect(hasValidLocUrls(xml, config.baseUrl, config.pages)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('元素值有效性', () => {
      it('changefreq 元素的值应该是 Sitemap 协议定义的有效值', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证 changefreq 值
              expect(hasValidChangefreqValues(xml)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('priority 元素的值应该在 0.0 到 1.0 范围内', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证 priority 值
              expect(hasValidPriorityValues(xml)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('lastmod 元素（如果存在）应该是有效的日期格式', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证 lastmod 值
              expect(hasValidLastmodValues(xml)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('URL 构建正确性', () => {
      it('相对 URL 应该与 baseUrl 正确拼接', () => {
        fc.assert(
          fc.property(
            baseUrlArb,
            relativeUrlArb,
            changeFrequencyArb,
            priorityArb,
            (baseUrl, relativeUrl, changefreq, priority) => {
              const config: SitemapConfig = {
                baseUrl,
                pages: [{
                  url: relativeUrl,
                  priority,
                  changefreq
                }]
              }

              // 生成 XML
              const xml = generateSitemapXml(config)

              // 构建预期的完整 URL
              const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
              const expectedUrl = `${normalizedBaseUrl}${relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl}`
              const escapedUrl = expectedUrl
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')

              // 验证 URL 存在于 XML 中
              expect(xml).toContain(`<loc>${escapedUrl}</loc>`)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('baseUrl 末尾的斜杠应该被正确处理', () => {
        fc.assert(
          fc.property(
            baseUrlArb,
            fc.boolean(),
            relativeUrlArb,
            changeFrequencyArb,
            priorityArb,
            (baseUrl, addTrailingSlash, relativeUrl, changefreq, priority) => {
              // 根据标志添加或不添加尾部斜杠
              const testBaseUrl = addTrailingSlash ? baseUrl + '/' : baseUrl.replace(/\/$/, '')
              
              const config: SitemapConfig = {
                baseUrl: testBaseUrl,
                pages: [{
                  url: relativeUrl,
                  priority,
                  changefreq
                }]
              }

              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证不会出现双斜杠（除了协议部分）
              const urlMatches = xml.match(/<loc>([^<]+)<\/loc>/g)
              if (urlMatches) {
                for (const match of urlMatches) {
                  const url = match.replace(/<\/?loc>/g, '')
                  // 移除协议部分后检查双斜杠
                  const urlWithoutProtocol = url.replace(/^https?:\/\//, '')
                  expect(urlWithoutProtocol).not.toContain('//')
                }
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('XML 特殊字符转义', () => {
      it('URL 中的特殊字符应该被正确转义', () => {
        // 测试包含需要转义的字符的 URL
        const specialChars = ['&', '<', '>', '"', "'"]
        
        for (const char of specialChars) {
          const config: SitemapConfig = {
            baseUrl: 'https://example.com',
            pages: [{
              url: `/page${char}test`,
              priority: 0.5,
              changefreq: 'weekly'
            }]
          }

          // 生成 XML
          const xml = generateSitemapXml(config)

          // 验证原始特殊字符不直接出现在 loc 元素中
          // （除了 & 可能是转义序列的一部分）
          if (char !== '&') {
            const locContent = xml.match(/<loc>([^<]*)<\/loc>/)?.[1] || ''
            expect(locContent).not.toContain(char)
          }

          // 验证 XML 仍然格式良好
          expect(isWellFormedXml(xml)).toBe(true)
        }
      })
    })

    describe('数据库集成测试', () => {
      it('通过服务生成的 Sitemap 应该符合协议', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              initDatabase(':memory:')
              try {
                // 更新配置
                const updateResult = updateSitemapConfig(config)
                expect(updateResult.success).toBe(true)

                // 通过服务生成 Sitemap
                const generateResult = generateSitemap()
                expect(generateResult.success).toBe(true)
                expect(generateResult.content).toBeDefined()

                const xml = generateResult.content!

                // 验证生成的 XML
                expect(hasValidXmlDeclaration(xml)).toBe(true)
                expect(hasValidUrlsetElement(xml)).toBe(true)
                expect(hasCorrectUrlCount(xml, config.pages.length)).toBe(true)
                expect(hasRequiredUrlElements(xml)).toBe(true)
                expect(hasValidChangefreqValues(xml)).toBe(true)
                expect(hasValidPriorityValues(xml)).toBe(true)
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('保存后读取的配置生成的 XML 应该与原始配置生成的 XML 等价', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              initDatabase(':memory:')
              try {
                // 直接生成 XML
                const directXml = generateSitemapXml(config)

                // 保存配置
                updateSitemapConfig(config)

                // 读取配置并生成 XML
                const retrievedConfig = getSitemapConfig()
                const retrievedXml = generateSitemapXml(retrievedConfig)

                // 验证两个 XML 的结构相同
                expect(hasCorrectUrlCount(directXml, config.pages.length)).toBe(true)
                expect(hasCorrectUrlCount(retrievedXml, config.pages.length)).toBe(true)

                // 验证 URL 数量相同
                const directUrlCount = (directXml.match(/<url>/g) || []).length
                const retrievedUrlCount = (retrievedXml.match(/<url>/g) || []).length
                expect(directUrlCount).toBe(retrievedUrlCount)
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('边界情况处理', () => {
      it('单个页面的配置应该生成有效的 XML', () => {
        fc.assert(
          fc.property(
            baseUrlArb,
            sitemapPageArb,
            (baseUrl, page) => {
              const config: SitemapConfig = {
                baseUrl,
                pages: [page]
              }

              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证
              expect(hasValidXmlDeclaration(xml)).toBe(true)
              expect(hasValidUrlsetElement(xml)).toBe(true)
              expect(hasCorrectUrlCount(xml, 1)).toBe(true)
              expect(hasRequiredUrlElements(xml)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('优先级边界值 (0.0 和 1.0) 应该被正确处理', () => {
        fc.assert(
          fc.property(
            baseUrlArb,
            relativeUrlArb,
            changeFrequencyArb,
            fc.constantFrom(0, 1),
            (baseUrl, url, changefreq, priority) => {
              const config: SitemapConfig = {
                baseUrl,
                pages: [{
                  url,
                  priority,
                  changefreq
                }]
              }

              // 生成 XML
              const xml = generateSitemapXml(config)

              // 验证优先级值
              expect(hasValidPriorityValues(xml)).toBe(true)
              
              // 验证具体的优先级值
              const expectedPriority = priority.toFixed(1)
              expect(xml).toContain(`<priority>${expectedPriority}</priority>`)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('所有更新频率值都应该被正确处理', () => {
        const allFrequencies: ChangeFrequency[] = [
          'always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'
        ]

        for (const freq of allFrequencies) {
          const config: SitemapConfig = {
            baseUrl: 'https://example.com',
            pages: [{
              url: '/test',
              priority: 0.5,
              changefreq: freq
            }]
          }

          // 生成 XML
          const xml = generateSitemapXml(config)

          // 验证更新频率值
          expect(xml).toContain(`<changefreq>${freq}</changefreq>`)
          expect(hasValidChangefreqValues(xml)).toBe(true)
        }
      })
    })
  })

  /**
   * Property 14: SEO 配置往返一致性
   * 
   * 对于任意有效的 SEO 配置（Meta、Schema、Sitemap），保存后再读取应该得到等价的配置。
   * 
   * **Validates: Requirements 7.1.1-7.1.4, 7.2.1-7.2.3, 7.3.2, 7.3.3, 7.4.1**
   */
  describe('Property 14: SEO 配置往返一致性', () => {

    // ========== 生成器定义 ==========

    /**
     * 生成有效的页面标识
     */
    const pageIdentifierArb: fc.Arbitrary<PageIdentifier> = fc.constantFrom(...DEFAULT_PAGES)

    /**
     * 生成有效的标题（1-100 字符）
     */
    const titleArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 100 })
      .filter(s => s.trim().length > 0)

    /**
     * 生成有效的描述（1-300 字符）
     */
    const descriptionArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 300 })
      .filter(s => s.trim().length > 0)

    /**
     * 生成有效的关键词列表（0-20 个）
     */
    const keywordsArb: fc.Arbitrary<string[]> = fc.array(
      fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      { minLength: 0, maxLength: 20 }
    )

    /**
     * 生成有效的 PageMeta 配置
     * 
     * 需求: 7.1.1-7.1.4
     */
    const pageMetaArb: fc.Arbitrary<PageMeta> = fc.record({
      page: pageIdentifierArb,
      title: titleArb,
      description: descriptionArb,
      keywords: keywordsArb,
      ogTitle: fc.option(titleArb, { nil: undefined }),
      ogDescription: fc.option(descriptionArb, { nil: undefined }),
      ogImage: fc.option(fc.constant('https://example.com/image.png'), { nil: undefined })
    })

    /**
     * 生成有效的 Person Schema
     * 
     * 需求: 7.2.1
     */
    const personSchemaArb: fc.Arbitrary<PersonSchema> = fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      jobTitle: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      url: fc.option(fc.constant('https://example.com'), { nil: undefined }),
      email: fc.option(fc.constant('test@example.com'), { nil: undefined }),
      telephone: fc.option(fc.constant('+86-123-4567-8900'), { nil: undefined }),
      image: fc.option(fc.constant('https://example.com/avatar.png'), { nil: undefined }),
      sameAs: fc.option(fc.array(fc.constant('https://github.com/test'), { minLength: 0, maxLength: 5 }), { nil: undefined }),
      worksFor: fc.option(fc.constant({
        '@type': 'Organization' as const,
        name: 'Test Company',
        url: 'https://company.com'
      }), { nil: undefined })
    })

    /**
     * 生成有效的 WebSite Schema
     * 
     * 需求: 7.2.2
     */
    const websiteSchemaArb: fc.Arbitrary<WebsiteSchema> = fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      url: fc.constant('https://example.com'),
      description: fc.option(descriptionArb, { nil: undefined }),
      inLanguage: fc.option(fc.constantFrom('zh-CN', 'en-US', 'ja-JP'), { nil: undefined }),
      author: fc.option(fc.constant({
        '@type': 'Person' as const,
        name: 'Test Author'
      }), { nil: undefined }),
      potentialAction: fc.option(fc.constant({
        '@type': 'SearchAction' as const,
        target: 'https://example.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }), { nil: undefined })
    })

    /**
     * 生成有效的面包屑导航 Schema
     * 
     * 需求: 7.2.3
     */
    const breadcrumbSchemaArb: fc.Arbitrary<BreadcrumbSchema> = fc.record({
      enabled: fc.boolean(),
      items: fc.constant({
        home: [{ name: '首页', url: '/' }],
        about: [{ name: '首页', url: '/' }, { name: '关于', url: '/about' }],
        projects: [{ name: '首页', url: '/' }, { name: '项目', url: '/projects' }],
        skills: [{ name: '首页', url: '/' }, { name: '技能', url: '/skills' }],
        experience: [{ name: '首页', url: '/' }, { name: '经历', url: '/experience' }],
        education: [{ name: '首页', url: '/' }, { name: '教育', url: '/education' }],
        contact: [{ name: '首页', url: '/' }, { name: '联系', url: '/contact' }]
      })
    })

    /**
     * 生成有效的 Schema 配置
     * 
     * 需求: 7.2.1-7.2.3
     */
    const schemaConfigArb: fc.Arbitrary<SchemaConfig> = fc.record({
      person: personSchemaArb,
      website: websiteSchemaArb,
      breadcrumb: breadcrumbSchemaArb
    })

    /**
     * 生成有效的 robots.txt 内容
     * 
     * 需求: 7.4.1
     */
    const robotsTxtArb: fc.Arbitrary<string> = fc.constantFrom(
      'User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml',
      'User-agent: *\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://example.com/sitemap.xml',
      'User-agent: Googlebot\nAllow: /\n\nUser-agent: *\nDisallow: /'
    )

    // ========== 辅助函数 ==========

    /**
     * 比较两个 PageMeta 是否等价
     * 注意：保存后读取可能会有一些规范化处理（如 trim）
     */
    function arePageMetaEquivalent(original: PageMeta, retrieved: PageMeta): boolean {
      if (original.page !== retrieved.page) return false
      if (original.title.trim() !== retrieved.title.trim()) return false
      if (original.description.trim() !== retrieved.description.trim()) return false
      
      // 比较关键词（过滤空字符串后）
      const origKeywords = original.keywords.map(k => k.trim()).filter(k => k.length > 0)
      const retKeywords = retrieved.keywords.map(k => k.trim()).filter(k => k.length > 0)
      if (origKeywords.length !== retKeywords.length) return false
      for (let i = 0; i < origKeywords.length; i++) {
        if (origKeywords[i] !== retKeywords[i]) return false
      }

      // 比较可选字段
      const origOgTitle = original.ogTitle?.trim() || undefined
      const retOgTitle = retrieved.ogTitle?.trim() || undefined
      if (origOgTitle !== retOgTitle) return false

      const origOgDesc = original.ogDescription?.trim() || undefined
      const retOgDesc = retrieved.ogDescription?.trim() || undefined
      if (origOgDesc !== retOgDesc) return false

      const origOgImage = original.ogImage?.trim() || undefined
      const retOgImage = retrieved.ogImage?.trim() || undefined
      if (origOgImage !== retOgImage) return false

      return true
    }

    /**
     * 比较两个 SchemaConfig 是否等价
     */
    function areSchemaConfigEquivalent(original: SchemaConfig, retrieved: SchemaConfig): boolean {
      // 比较 Person Schema
      if (original.person.name.trim() !== retrieved.person.name.trim()) return false
      if (original.person.jobTitle.trim() !== retrieved.person.jobTitle.trim()) return false

      // 比较 WebSite Schema
      if (original.website.name.trim() !== retrieved.website.name.trim()) return false
      if (original.website.url !== retrieved.website.url) return false

      // 比较 Breadcrumb Schema
      if (original.breadcrumb.enabled !== retrieved.breadcrumb.enabled) return false

      return true
    }

    /**
     * 比较两个 SitemapConfig 是否等价
     */
    function areSitemapConfigEquivalent(original: SitemapConfig, retrieved: SitemapConfig): boolean {
      // 比较 baseUrl（规范化后）
      const origBaseUrl = original.baseUrl.replace(/\/$/, '')
      const retBaseUrl = retrieved.baseUrl.replace(/\/$/, '')
      if (origBaseUrl !== retBaseUrl) return false

      // 比较页面数量
      if (original.pages.length !== retrieved.pages.length) return false

      // 比较每个页面
      for (let i = 0; i < original.pages.length; i++) {
        const origPage = original.pages[i]
        const retPage = retrieved.pages[i]
        if (!origPage || !retPage) return false
        if (origPage.url !== retPage.url) return false
        if (Math.abs(origPage.priority - retPage.priority) > 0.001) return false
        if (origPage.changefreq !== retPage.changefreq) return false
      }

      return true
    }

    // ========== 测试用例 ==========

    describe('Meta 配置往返一致性', () => {
      it('保存后读取的 PageMeta 应该与原始配置等价', () => {
        fc.assert(
          fc.property(
            pageMetaArb,
            (meta) => {
              initDatabase(':memory:')
              try {
                // 保存配置
                const updateResult = updatePageMeta(meta.page, {
                  title: meta.title,
                  description: meta.description,
                  keywords: meta.keywords,
                  ogTitle: meta.ogTitle,
                  ogDescription: meta.ogDescription,
                  ogImage: meta.ogImage
                })
                expect(updateResult.success).toBe(true)

                // 读取配置
                const allMeta = getPageMeta()
                const retrieved = allMeta.find(m => m.page === meta.page)
                expect(retrieved).toBeDefined()

                // 验证等价性
                expect(arePageMetaEquivalent(meta, retrieved!)).toBe(true)
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 50 }
        )
      })
    })

    describe('Schema 配置往返一致性', () => {
      it('保存后读取的 SchemaConfig 应该与原始配置等价', () => {
        fc.assert(
          fc.property(
            schemaConfigArb,
            (schemas) => {
              initDatabase(':memory:')
              try {
                // 保存配置
                const updateResult = updateSchemas(schemas)
                expect(updateResult.success).toBe(true)

                // 读取配置
                const retrieved = getSchemas()

                // 验证等价性
                expect(areSchemaConfigEquivalent(schemas, retrieved)).toBe(true)
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 50 }
        )
      })
    })

    describe('Sitemap 配置往返一致性', () => {
      it('保存后读取的 SitemapConfig 应该与原始配置等价', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            (config) => {
              initDatabase(':memory:')
              try {
                // 保存配置
                const updateResult = updateSitemapConfig(config)
                expect(updateResult.success).toBe(true)

                // 读取配置
                const retrieved = getSitemapConfig()

                // 验证等价性
                expect(areSitemapConfigEquivalent(config, retrieved)).toBe(true)
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 50 }
        )
      })
    })

    describe('Robots.txt 往返一致性', () => {
      it('保存后读取的 robots.txt 应该与原始内容相同', () => {
        fc.assert(
          fc.property(
            robotsTxtArb,
            (content) => {
              initDatabase(':memory:')
              try {
                // 保存配置
                const updateResult = updateRobotsTxt(content)
                expect(updateResult.success).toBe(true)

                // 读取配置
                const retrieved = getRobotsTxt()

                // 验证相同
                expect(retrieved).toBe(content)
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 50 }
        )
      })
    })

    describe('完整 SEO 配置导出/导入往返一致性', () => {
      it('导出后再导入的配置应该与原始配置等价', () => {
        fc.assert(
          fc.property(
            sitemapConfigArb,
            robotsTxtArb,
            (sitemapConfig, robotsTxt) => {
              initDatabase(':memory:')
              try {
                // 设置初始配置
                updateSitemapConfig(sitemapConfig)
                updateRobotsTxt(robotsTxt)

                // 导出配置
                const exportResult = exportSEOConfig(false)
                expect(exportResult.success).toBe(true)
                expect(exportResult.json).toBeDefined()

                // 获取导出前的配置
                const beforeConfig = getSEOConfig()

                // 重新初始化数据库（模拟新环境）
                closeDatabase()
                initDatabase(':memory:')

                // 导入配置
                const importResult = importSEOConfig(exportResult.json!)
                expect(importResult.success).toBe(true)

                // 获取导入后的配置
                const afterConfig = getSEOConfig()

                // 验证 Sitemap 配置等价
                expect(areSitemapConfigEquivalent(beforeConfig.sitemapConfig, afterConfig.sitemapConfig)).toBe(true)

                // 验证 robots.txt 相同
                expect(afterConfig.robotsTxt).toBe(beforeConfig.robotsTxt)
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 30 }
        )
      })
    })
  })
})
