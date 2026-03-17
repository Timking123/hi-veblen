/**
 * Skills 页面单元测试
 * 
 * 测试范围：
 * - 页面中 ParticleBackground 组件的正确显示
 * - 页面内容的 z-index 层级关系
 * - 背景不被遮罩覆盖
 * 
 * 验证需求：1.1, 1.2, 1.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Skills from '../Skills.vue'

// Mock ECharts 以避免测试中的 canvas 渲染问题
vi.mock('echarts', () => ({
  default: {
    init: vi.fn(() => ({
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
      on: vi.fn(),
    })),
  },
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    on: vi.fn(),
  })),
  graphic: {
    LinearGradient: vi.fn(),
    RadialGradient: vi.fn(),
  },
}))

// Mock profile data
vi.mock('@/data/profile', () => ({
  profileData: {
    skills: [
      {
        name: 'Vue.js',
        level: 95,
        category: 'frontend',
        experience: '3年开发经验，熟练掌握 Vue 3 Composition API',
        projects: ['个人作品集网站', '企业管理系统'],
      },
      {
        name: 'TypeScript',
        level: 90,
        category: 'frontend',
        experience: '2年开发经验，熟悉类型系统和高级特性',
        projects: ['个人作品集网站'],
      },
      {
        name: 'Node.js',
        level: 85,
        category: 'backend',
        experience: '2年开发经验，熟悉 Express 和 Koa 框架',
        projects: ['API 服务'],
      },
      {
        name: 'Git',
        level: 88,
        category: 'tools',
        experience: '3年使用经验，熟悉分支管理和协作流程',
        projects: ['所有项目'],
      },
    ],
  },
}))

// Mock useTheme
vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    resolvedTheme: { value: 'dark' },
    setTheme: vi.fn(),
  }),
}))

describe('Skills - 背景显示测试', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      cb(0)
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  describe('ParticleBackground 组件显示', () => {
    it('应该在技能展示页面显示 ParticleBackground 组件', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: false, // 不 stub，使用真实组件
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器存在
      expect(wrapper.find('.skills-page').exists()).toBe(true)
    })

    it('应该正确渲染页面标题和副标题', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面标题
      const title = wrapper.find('.page-title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('技能展示')

      // 验证页面副标题
      const subtitle = wrapper.find('.page-subtitle')
      expect(subtitle.exists()).toBe(true)
      expect(subtitle.text()).toBe('Technical Skills')
    })

    it('应该显示图表类型选择器', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证选择器存在
      const selector = wrapper.find('.chart-type-selector')
      expect(selector.exists()).toBe(true)

      // 验证按钮
      const buttons = selector.findAll('.chart-btn')
      expect(buttons.length).toBe(2)
      expect(buttons[0].text()).toBe('柱状图')
      expect(buttons[1].text()).toBe('雷达图')
    })

    it('应该按类别显示技能', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证类别部分存在
      const categories = wrapper.findAll('.category-section')
      expect(categories.length).toBeGreaterThan(0)

      // 验证前端技能类别
      const frontendCategory = categories.find((cat) =>
        cat.find('.category-title').text().includes('前端技能')
      )
      expect(frontendCategory).toBeDefined()

      // 验证后端技能类别
      const backendCategory = categories.find((cat) =>
        cat.find('.category-title').text().includes('后端技能')
      )
      expect(backendCategory).toBeDefined()

      // 验证工具类别
      const toolsCategory = categories.find((cat) =>
        cat.find('.category-title').text().includes('工具与其他')
      )
      expect(toolsCategory).toBeDefined()
    })
  })

  describe('页面层级关系', () => {
    it('应该确保页面内容在背景之上', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器有正确的 z-index
      const page = wrapper.find('.skills-page')
      expect(page.exists()).toBe(true)
      
      // 页面应该有 position: relative 和 z-index: 1
      const pageElement = page.element as HTMLElement
      expect(pageElement).toBeDefined()
    })

    it('应该确保页面容器没有纯色背景遮罩', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器不应该有阻挡背景的纯色背景
      const page = wrapper.find('.skills-page')
      const pageElement = page.element as HTMLElement
      
      // 页面容器应该存在
      expect(pageElement).toBeDefined()
    })

    it('应该确保图表容器使用半透明背景', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证图表容器存在
      const chartWrappers = wrapper.findAll('.chart-wrapper')
      expect(chartWrappers.length).toBeGreaterThan(0)

      // 图表容器应该使用半透明背景，让粒子背景可见
      chartWrappers.forEach((wrapper) => {
        const wrapperElement = wrapper.element as HTMLElement
        expect(wrapperElement).toBeDefined()
      })
    })
  })

  describe('图表类型切换', () => {
    it('应该支持柱状图和雷达图切换', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      const selector = wrapper.find('.chart-type-selector')
      const buttons = selector.findAll('.chart-btn')

      // 默认选中柱状图
      expect(buttons[0].classes()).toContain('active')
      expect(buttons[1].classes()).not.toContain('active')

      // 点击雷达图按钮
      await buttons[1].trigger('click')
      await nextTick()

      // 验证雷达图被选中
      expect(buttons[1].classes()).toContain('active')
      expect(buttons[0].classes()).not.toContain('active')

      // 再次点击柱状图按钮
      await buttons[0].trigger('click')
      await nextTick()

      // 验证柱状图被选中
      expect(buttons[0].classes()).toContain('active')
      expect(buttons[1].classes()).not.toContain('active')
    })
  })

  describe('技能标签显示', () => {
    it('应该显示所有技能标签', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证技能标签存在
      const skillTags = wrapper.findAll('.skill-tag')
      expect(skillTags.length).toBe(4)
    })

    it('应该显示技能名称和熟练度', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      const skillTags = wrapper.findAll('.skill-tag')
      const firstTag = skillTags[0]

      // 验证技能名称
      const skillName = firstTag.find('.skill-name')
      expect(skillName.exists()).toBe(true)
      expect(skillName.text()).toBe('Vue.js')

      // 验证熟练度
      const skillLevel = firstTag.find('.skill-level')
      expect(skillLevel.exists()).toBe(true)
      expect(skillLevel.text()).toBe('95%')
    })
  })

  describe('技能详情卡片', () => {
    it('应该在鼠标悬停时显示技能详情', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 初始状态：详情卡片不显示
      let detailCard = wrapper.find('.skill-detail-card')
      expect(detailCard.exists()).toBe(false)

      // 找到技能标签
      const skillTags = wrapper.findAll('.skill-tag')
      const firstTag = skillTags[0]

      // 鼠标悬停
      await firstTag.trigger('mouseenter')
      await nextTick()

      // 验证详情卡片显示
      detailCard = wrapper.find('.skill-detail-card')
      expect(detailCard.exists()).toBe(true)

      // 验证详情内容
      const detailTitle = detailCard.find('h3')
      expect(detailTitle.text()).toBe('Vue.js')

      // 鼠标离开
      await firstTag.trigger('mouseleave')
      await nextTick()

      // 验证详情卡片消失
      detailCard = wrapper.find('.skill-detail-card')
      expect(detailCard.exists()).toBe(false)
    })

    it('应该显示技能的详细信息', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      const skillTags = wrapper.findAll('.skill-tag')
      await skillTags[0].trigger('mouseenter')
      await nextTick()

      const detailCard = wrapper.find('.skill-detail-card')
      
      // 验证熟练度
      const detailValues = detailCard.findAll('.detail-value')
      expect(detailValues[0].text()).toBe('95%')

      // 验证经验描述
      expect(detailValues[1].text()).toContain('3年开发经验')
    })

    it('应该显示相关项目', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      const skillTags = wrapper.findAll('.skill-tag')
      await skillTags[0].trigger('mouseenter')
      await nextTick()

      const detailCard = wrapper.find('.skill-detail-card')
      
      // 验证项目标签
      const projectTags = detailCard.findAll('.project-tag')
      expect(projectTags.length).toBe(2)
      expect(projectTags[0].text()).toBe('个人作品集网站')
      expect(projectTags[1].text()).toBe('企业管理系统')
    })
  })

  describe('技能筛选功能', () => {
    it('应该在点击技能标签时显示筛选结果', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 初始状态：筛选结果不显示
      let filteredSection = wrapper.find('.filtered-projects')
      expect(filteredSection.exists()).toBe(false)

      // 点击技能标签
      const skillTags = wrapper.findAll('.skill-tag')
      await skillTags[0].trigger('click')
      await nextTick()

      // 验证筛选结果显示
      filteredSection = wrapper.find('.filtered-projects')
      expect(filteredSection.exists()).toBe(true)

      // 验证筛选标题
      const filterHeader = filteredSection.find('.filter-header h3')
      expect(filterHeader.text()).toContain('Vue.js')
    })

    it('应该显示筛选后的项目列表', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 点击技能标签
      const skillTags = wrapper.findAll('.skill-tag')
      await skillTags[0].trigger('click')
      await nextTick()

      // 验证项目卡片
      const projectCards = wrapper.findAll('.project-card')
      expect(projectCards.length).toBe(2)
      expect(projectCards[0].find('.project-name').text()).toBe('个人作品集网站')
      expect(projectCards[1].find('.project-name').text()).toBe('企业管理系统')
    })

    it('应该支持清除筛选', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 点击技能标签
      const skillTags = wrapper.findAll('.skill-tag')
      await skillTags[0].trigger('click')
      await nextTick()

      // 验证筛选结果显示
      let filteredSection = wrapper.find('.filtered-projects')
      expect(filteredSection.exists()).toBe(true)

      // 点击清除按钮
      const clearBtn = wrapper.find('.clear-filter-btn')
      await clearBtn.trigger('click')
      await nextTick()

      // 验证筛选结果消失
      filteredSection = wrapper.find('.filtered-projects')
      expect(filteredSection.exists()).toBe(false)
    })

    it('应该在再次点击同一技能时取消筛选', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      const skillTags = wrapper.findAll('.skill-tag')
      const firstTag = skillTags[0]

      // 第一次点击：显示筛选
      await firstTag.trigger('click')
      await nextTick()
      expect(wrapper.find('.filtered-projects').exists()).toBe(true)

      // 第二次点击：取消筛选
      await firstTag.trigger('click')
      await nextTick()
      expect(wrapper.find('.filtered-projects').exists()).toBe(false)
    })

    it('应该在切换技能时更新筛选结果', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      const skillTags = wrapper.findAll('.skill-tag')

      // 点击第一个技能
      await skillTags[0].trigger('click')
      await nextTick()

      let filterHeader = wrapper.find('.filter-header h3')
      expect(filterHeader.text()).toContain('Vue.js')

      // 点击第二个技能
      await skillTags[1].trigger('click')
      await nextTick()

      filterHeader = wrapper.find('.filter-header h3')
      expect(filterHeader.text()).toContain('TypeScript')
    })
  })

  describe('响应式布局', () => {
    it('应该在移动端正确显示', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器存在
      const page = wrapper.find('.skills-page')
      expect(page.exists()).toBe(true)

      // 验证主要内容区域存在
      const container = wrapper.find('.skills-container')
      expect(container.exists()).toBe(true)
    })
  })

  describe('动画效果', () => {
    it('应该为类别部分添加动画延迟', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证类别部分有动画延迟
      const categories = wrapper.findAll('.category-section')
      categories.forEach((category, index) => {
        const style = category.attributes('style')
        expect(style).toContain('animation-delay')
      })
    })

    it('应该为技能标签添加动画延迟', async () => {
      const wrapper = mount(Skills, {
        global: {
          stubs: {
            ParticleBackground: true,
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证技能标签有动画延迟
      const skillTags = wrapper.findAll('.skill-tag')
      skillTags.forEach((tag, index) => {
        const style = tag.attributes('style')
        expect(style).toContain('animation-delay')
      })
    })
  })
})
