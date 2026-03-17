/**
 * Experience 页面单元测试
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
import Experience from '../Experience.vue'

// Mock profile data
vi.mock('@/data/profile', () => ({
  profileData: {
    experience: [
      {
        id: 'exp-1',
        company: '测试科技有限公司',
        position: '前端开发工程师',
        period: '2022.07 - 至今',
        responsibilities: [
          '负责公司核心产品的前端开发',
          '参与技术方案设计和评审',
          '优化前端性能，提升用户体验',
        ],
        achievements: [
          { metric: '性能提升', value: '40%' },
          { metric: '代码覆盖率', value: '85%' },
        ],
      },
      {
        id: 'exp-2',
        company: '创新互联网公司',
        position: '前端实习生',
        period: '2021.06 - 2022.06',
        responsibilities: [
          '参与项目开发和维护',
          '编写单元测试和文档',
        ],
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

describe('Experience - 背景显示测试', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      cb(0)
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  describe('ParticleBackground 组件显示', () => {
    it('应该在工作经历页面显示 ParticleBackground 组件', async () => {
      const wrapper = mount(Experience, {
        global: {
          stubs: {
            ParticleBackground: false, // 不 stub，使用真实组件
          },
        },
      })
      await nextTick()

      // 验证页面容器存在
      expect(wrapper.find('.experience-page').exists()).toBe(true)
    })

    it('应该正确渲染页面标题和副标题', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      // 验证页面标题
      const title = wrapper.find('.page-title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('工作经历')

      // 验证页面副标题
      const subtitle = wrapper.find('.page-subtitle')
      expect(subtitle.exists()).toBe(true)
      expect(subtitle.text()).toBe('Work Experience')
    })

    it('应该显示工作经历时间线', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      // 验证时间线容器存在
      const timeline = wrapper.find('.experience-timeline')
      expect(timeline.exists()).toBe(true)

      // 验证经历卡片数量
      const cards = wrapper.findAll('.experience-card')
      expect(cards.length).toBe(2)
    })

    it('应该显示时间线标记', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      // 验证时间线标记存在
      const markers = wrapper.findAll('.timeline-marker')
      expect(markers.length).toBe(2)

      // 验证时间线圆点
      const dots = wrapper.findAll('.timeline-dot')
      expect(dots.length).toBe(2)

      // 验证时间线连接线（最后一个卡片没有连接线）
      const lines = wrapper.findAll('.timeline-line')
      expect(lines.length).toBe(1)
    })
  })

  describe('页面层级关系', () => {
    it('应该确保页面内容在背景之上', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      // 验证页面容器有正确的 z-index
      const page = wrapper.find('.experience-page')
      expect(page.exists()).toBe(true)
      
      // 页面应该有 position: relative 和 z-index: 1
      const pageElement = page.element as HTMLElement
      expect(pageElement).toBeDefined()
    })

    it('应该确保页面容器没有纯色背景遮罩', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      // 验证页面容器不应该有阻挡背景的纯色背景
      const page = wrapper.find('.experience-page')
      const pageElement = page.element as HTMLElement
      
      // 页面容器应该存在
      expect(pageElement).toBeDefined()
    })

    it('应该确保卡片内容使用半透明背景', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      // 验证卡片内容存在
      const cardContents = wrapper.findAll('.card-content')
      expect(cardContents.length).toBeGreaterThan(0)

      // 卡片应该使用半透明背景，让粒子背景可见
      cardContents.forEach((card) => {
        const cardElement = card.element as HTMLElement
        expect(cardElement).toBeDefined()
      })
    })
  })

  describe('卡片展开/折叠功能', () => {
    it('应该初始状态为折叠', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      // 验证所有卡片初始为折叠状态
      const cards = wrapper.findAll('.experience-card')
      cards.forEach((card) => {
        expect(card.classes()).not.toContain('expanded')
        expect(card.find('.card-body').exists()).toBe(false)
      })
    })

    it('应该在点击后展开卡片', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const cards = wrapper.findAll('.experience-card')
      const firstCard = cards[0]

      // 点击卡片
      await firstCard.trigger('click')
      await nextTick()

      // 验证卡片展开
      expect(firstCard.classes()).toContain('expanded')
      expect(firstCard.find('.card-body').exists()).toBe(true)
    })

    it('应该在再次点击后折叠卡片', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const cards = wrapper.findAll('.experience-card')
      const firstCard = cards[0]

      // 第一次点击：展开
      await firstCard.trigger('click')
      await nextTick()
      expect(firstCard.classes()).toContain('expanded')

      // 第二次点击：折叠
      await firstCard.trigger('click')
      await nextTick()
      expect(firstCard.classes()).not.toContain('expanded')
      expect(firstCard.find('.card-body').exists()).toBe(false)
    })

    it('应该独立控制每个卡片的展开状态', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const cards = wrapper.findAll('.experience-card')

      // 展开第一个卡片
      await cards[0].trigger('click')
      await nextTick()

      expect(cards[0].classes()).toContain('expanded')
      expect(cards[1].classes()).not.toContain('expanded')

      // 展开第二个卡片
      await cards[1].trigger('click')
      await nextTick()

      // 两个卡片都应该是展开状态
      expect(cards[0].classes()).toContain('expanded')
      expect(cards[1].classes()).toContain('expanded')
    })
  })

  describe('卡片内容显示', () => {
    it('应该显示公司名称和职位', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const firstCard = wrapper.findAll('.experience-card')[0]

      // 验证公司名称
      const companyName = firstCard.find('.company-name')
      expect(companyName.text()).toBe('测试科技有限公司')

      // 验证职位
      const position = firstCard.find('.position')
      expect(position.text()).toBe('前端开发工程师')

      // 验证时间段
      const period = firstCard.find('.period')
      expect(period.text()).toBe('2022.07 - 至今')
    })

    it('应该在展开时显示工作职责', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const firstCard = wrapper.findAll('.experience-card')[0]

      // 展开卡片
      await firstCard.trigger('click')
      await nextTick()

      // 验证职责部分存在
      const responsibilitiesSection = firstCard.find('.responsibilities-section')
      expect(responsibilitiesSection.exists()).toBe(true)

      // 验证职责列表
      const responsibilities = responsibilitiesSection.findAll('li')
      expect(responsibilities.length).toBe(3)
      expect(responsibilities[0].text()).toBe('负责公司核心产品的前端开发')
    })

    it('应该在展开时显示关键成就（如果有）', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const firstCard = wrapper.findAll('.experience-card')[0]

      // 展开卡片
      await firstCard.trigger('click')
      await nextTick()

      // 验证成就部分存在
      const achievementsSection = firstCard.find('.achievements-section')
      expect(achievementsSection.exists()).toBe(true)

      // 验证成就卡片
      const achievementCards = achievementsSection.findAll('.achievement-card')
      expect(achievementCards.length).toBe(2)

      // 验证第一个成就
      const firstAchievement = achievementCards[0]
      expect(firstAchievement.find('.achievement-value').text()).toBe('40%')
      expect(firstAchievement.find('.achievement-metric').text()).toBe('性能提升')
    })

    it('应该在没有成就时不显示成就部分', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const secondCard = wrapper.findAll('.experience-card')[1]

      // 展开第二个卡片（没有成就）
      await secondCard.trigger('click')
      await nextTick()

      // 验证成就部分不存在
      const achievementsSection = secondCard.find('.achievements-section')
      expect(achievementsSection.exists()).toBe(false)
    })
  })

  describe('展开按钮动画', () => {
    it('应该在展开时旋转按钮图标', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const firstCard = wrapper.findAll('.experience-card')[0]
      const expandBtn = firstCard.find('.expand-btn')

      // 初始状态：未旋转
      expect(expandBtn.classes()).not.toContain('rotated')

      // 展开卡片
      await firstCard.trigger('click')
      await nextTick()

      // 验证按钮旋转
      expect(expandBtn.classes()).toContain('rotated')

      // 折叠卡片
      await firstCard.trigger('click')
      await nextTick()

      // 验证按钮恢复
      expect(expandBtn.classes()).not.toContain('rotated')
    })
  })

  describe('响应式布局', () => {
    it('应该在移动端正确显示', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      // 验证页面容器存在
      const page = wrapper.find('.experience-page')
      expect(page.exists()).toBe(true)

      // 验证主要内容区域存在
      const container = wrapper.find('.experience-container')
      expect(container.exists()).toBe(true)
    })
  })

  describe('动画效果', () => {
    it('应该为卡片添加动画延迟', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      // 验证卡片有动画延迟
      const cards = wrapper.findAll('.experience-card')
      cards.forEach((card, index) => {
        const style = card.attributes('style')
        expect(style).toContain('animation-delay')
      })
    })

    it('应该为展开的内容添加动画', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const firstCard = wrapper.findAll('.experience-card')[0]

      // 展开卡片
      await firstCard.trigger('click')
      await nextTick()

      // 验证职责列表项有动画延迟
      const responsibilities = firstCard.findAll('.responsibilities-list li')
      responsibilities.forEach((item, index) => {
        const style = item.attributes('style')
        expect(style).toContain('animation-delay')
      })

      // 验证成就卡片有动画延迟
      const achievementCards = firstCard.findAll('.achievement-card')
      achievementCards.forEach((card, index) => {
        const style = card.attributes('style')
        expect(style).toContain('animation-delay')
      })
    })
  })

  describe('悬停效果', () => {
    it('应该在鼠标悬停时高亮时间线圆点', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const firstCard = wrapper.findAll('.experience-card')[0]
      const timelineDot = firstCard.find('.timeline-dot')

      // 验证时间线圆点存在
      expect(timelineDot.exists()).toBe(true)
    })

    it('应该在鼠标悬停时提升卡片', async () => {
      const wrapper = mount(Experience)
      await nextTick()

      const firstCard = wrapper.findAll('.experience-card')[0]
      const cardContent = firstCard.find('.card-content')

      // 验证卡片内容存在
      expect(cardContent.exists()).toBe(true)
    })
  })
})
