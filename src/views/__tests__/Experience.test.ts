/**
 * 科幻改版后的页面语义、数据展示与真实组件交互测试。
 * 背景统一由 App 的 CinematicBackground/ShaderBackground 承载。
 * Happy DOM 的样式声明检查不替代真实浏览器的布局、悬停与响应式验收。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Experience from '../Experience.vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const sharedStyles = readFileSync(resolve('src/style.css'), 'utf8')

enableAutoUnmount(afterEach)
let styleElement: HTMLStyleElement
beforeEach(() => {
  styleElement = document.createElement('style')
  styleElement.textContent = sharedStyles.replace(/^@import[^;]+;/gm, '')
  document.head.appendChild(styleElement)
})
afterEach(() => {
  styleElement.remove()
  vi.unstubAllGlobals()
})

// 使用真实按钮进入折叠起点，覆盖切换而不锁定改版后的默认展开策略。
const mountCollapsedExperience = async () => {
  const wrapper = mount(Experience, { attachTo: document.body })
  const cards = wrapper.findAll('.mission-card')
  expect(cards).toHaveLength(2)
  for (const card of cards) {
    if (card.find('.mission-card__body').exists()) await card.get('button').trigger('click')
  }
  return wrapper
}

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
        responsibilities: ['参与项目开发和维护', '编写单元测试和文档'],
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

describe('Experience - 页面交互测试', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(cb => {
        cb(0)
        return 1
      })
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  describe('页面内容显示', () => {
    it('应该显示任务经历的语义页面', async () => {
      const wrapper = mount(Experience, {
        global: {
          stubs: {},
        },
      })
      await nextTick()

      // 验证页面容器存在
      expect(wrapper.find('.experience-page').exists()).toBe(true)
    })

    it('应该正确渲染页面标题和副标题', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      // 验证页面标题
      const title = wrapper.find('h1')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('任务航行日志')

      // 验证页面副标题
      const subtitle = wrapper.find('.sci-eyebrow')
      expect(subtitle.exists()).toBe(true)
      expect(subtitle.text()).toBe('CAREER FLIGHT PATH')
    })

    it('应该显示工作经历时间线', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      // 验证时间线容器存在
      const timeline = wrapper.find('.mission-timeline')
      expect(timeline.exists()).toBe(true)

      // 验证经历卡片数量
      const cards = wrapper.findAll('.mission-card')
      expect(cards.length).toBe(2)
    })

    it('应该按顺序显示任务标记', async () => {
      const wrapper = await mountCollapsedExperience()
      expect(wrapper.findAll('.mission-card__index').map(item => item.text())).toEqual([
        'MISSION 01',
        'MISSION 02',
      ])
    })
  })

  describe('页面层级关系', () => {
    it('应该为页面内容保留相对定位上下文', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      // 检查页面自身的定位；全局背景层级由 App 验收覆盖。
      const page = wrapper.find('.experience-page')
      expect(page.exists()).toBe(true)

      // 相对定位保留页面内浮层的定位上下文。
      const pageElement = page.element as HTMLElement
      expect(getComputedStyle(pageElement).position).toBe('relative')
    })

    it('应该确保页面容器没有纯色背景遮罩', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      // 验证页面容器不应该有阻挡背景的纯色背景
      const page = wrapper.find('.experience-page')
      const pageElement = page.element as HTMLElement

      // 页面容器不能用纯色遮住全局背景。
      expect(getComputedStyle(pageElement).backgroundColor).toMatch(
        /^(?:transparent|rgba\(0, 0, 0, 0\))?$/
      )
    })

    it('应该确保卡片内容使用半透明背景', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      // 验证卡片内容存在
      const cardContents = wrapper.findAll('.mission-card')
      expect(cardContents.length).toBeGreaterThan(0)

      // 卡片应该使用半透明背景，让粒子背景可见
      cardContents.forEach(card => {
        const cardElement = card.element as HTMLElement
        expect(getComputedStyle(cardElement).backgroundImage).toContain('rgba(10, 19, 39, 0.78)')
      })
    })
  })

  describe('卡片展开/折叠功能', () => {
    it('应该允许通过标题按钮将所有卡片折叠', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      // 验证所有卡片初始为折叠状态
      const cards = wrapper.findAll('.mission-card')
      cards.forEach(card => {
        expect(card.classes()).not.toContain('mission-card--expanded')
        expect(card.find('.mission-card__body').exists()).toBe(false)
      })
    })

    it('应该在点击后展开卡片', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      const cards = wrapper.findAll('.mission-card')
      const firstCard = cards[0]

      // 点击卡片
      await firstCard.get('button').trigger('click')
      await nextTick()

      // 验证卡片展开
      expect(firstCard.classes()).toContain('mission-card--expanded')
      expect(firstCard.find('.mission-card__body').exists()).toBe(true)
    })

    it('应该在再次点击后折叠卡片', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      const cards = wrapper.findAll('.mission-card')
      const firstCard = cards[0]

      // 第一次点击：展开
      await firstCard.get('button').trigger('click')
      await nextTick()
      expect(firstCard.classes()).toContain('mission-card--expanded')

      // 第二次点击：折叠
      await firstCard.get('button').trigger('click')
      await nextTick()
      expect(firstCard.classes()).not.toContain('mission-card--expanded')
      expect(firstCard.find('.mission-card__body').exists()).toBe(false)
    })

    it('应该独立控制每个卡片的展开状态', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      const cards = wrapper.findAll('.mission-card')

      // 展开第一个卡片
      await cards[0].get('button').trigger('click')
      await nextTick()

      expect(cards[0].classes()).toContain('mission-card--expanded')
      expect(cards[1].classes()).not.toContain('mission-card--expanded')

      // 展开第二个卡片
      await cards[1].get('button').trigger('click')
      await nextTick()

      // 两个卡片都应该是展开状态
      expect(cards[0].classes()).toContain('mission-card--expanded')
      expect(cards[1].classes()).toContain('mission-card--expanded')
    })
  })

  describe('卡片内容显示', () => {
    it('应该显示公司名称和职位', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      const firstCard = wrapper.findAll('.mission-card')[0]

      // 验证公司名称
      const companyName = firstCard.find('.mission-card__main strong')
      expect(companyName.text()).toBe('测试科技有限公司')

      // 验证职位
      const position = firstCard.find('.mission-card__main small')
      expect(position.text()).toContain('前端开发工程师')

      // 验证时间段
      const period = firstCard.find('.mission-card__main small')
      expect(period.text()).toContain('2022.07 - 至今')
    })

    it('应该在展开时显示工作职责', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      const firstCard = wrapper.findAll('.mission-card')[0]

      // 展开卡片
      await firstCard.get('button').trigger('click')
      await nextTick()

      // 验证职责部分存在
      const responsibilitiesSection = firstCard.find('.mission-card__section')
      expect(responsibilitiesSection.exists()).toBe(true)

      // 验证职责列表
      const responsibilities = responsibilitiesSection.findAll('li')
      expect(responsibilities.length).toBe(3)
      expect(responsibilities[0].text()).toBe('负责公司核心产品的前端开发')
    })

    it('应该在展开时显示关键成就（如果有）', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      const firstCard = wrapper.findAll('.mission-card')[0]

      // 展开卡片
      await firstCard.get('button').trigger('click')
      await nextTick()

      // 验证成就部分存在
      const achievementsSection = firstCard.find('.mission-card__metrics')
      expect(achievementsSection.exists()).toBe(true)

      // 验证成就卡片
      const achievementCards = achievementsSection.findAll('.mission-metric')
      expect(achievementCards.length).toBe(2)

      // 验证第一个成就
      const firstAchievement = achievementCards[0]
      expect(firstAchievement.find('strong').text()).toBe('40%')
      expect(firstAchievement.find('span').text()).toBe('性能提升')
    })

    it('应该在没有成就时不显示成就部分', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      const secondCard = wrapper.findAll('.mission-card')[1]

      // 展开第二个卡片（没有成就）
      await secondCard.get('button').trigger('click')
      await nextTick()

      // 验证成就部分不存在
      const achievementsSection = secondCard.find('.mission-card__metrics')
      expect(achievementsSection.exists()).toBe(false)
    })
  })

  describe('展开按钮动画', () => {
    it('应该在展开与折叠时更新按钮操作提示', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      const firstCard = wrapper.findAll('.mission-card')[0]
      const expandBtn = firstCard.find('.mission-card__toggle')

      // 初始状态：提示可以展开
      expect(expandBtn.text()).toBe('EXPAND')

      // 展开卡片
      await firstCard.get('button').trigger('click')
      await nextTick()

      // 验证按钮提示可以折叠
      expect(expandBtn.text()).toBe('COLLAPSE')

      // 折叠卡片
      await firstCard.get('button').trigger('click')
      await nextTick()

      // 验证按钮恢复展开提示
      expect(expandBtn.text()).toBe('EXPAND')
    })
  })

  describe('响应式布局', () => {
    it('应该保留响应式布局所需的内容容器', async () => {
      const wrapper = await mountCollapsedExperience()
      await nextTick()

      // 验证页面容器存在
      const page = wrapper.find('.experience-page')
      expect(page.exists()).toBe(true)

      // 验证主要内容区域存在
      const container = wrapper.find('.mission-timeline')
      expect(container.exists()).toBe(true)
    })
  })

  describe('动画效果', () => {
    it('应该为任务卡片提供平滑过渡', async () => {
      const wrapper = await mountCollapsedExperience()
      for (const card of wrapper.findAll('.mission-card')) {
        expect(getComputedStyle(card.element).transition).toContain('transform 240ms')
      }
    })

    it('应该为展开和折叠内容使用过渡容器', async () => {
      const wrapper = await mountCollapsedExperience()
      const first = wrapper.get('.mission-card')
      expect(first.find('.mission-card__body').exists()).toBe(false)
      await first.get('button').trigger('click')
      expect(first.get('transition-stub').attributes('name')).toBe('expand')
      expect(first.get('transition-stub').find('.mission-card__body').exists()).toBe(true)
    })
  })

  describe('悬停效果', () => {
    it('应该为任务标记提供高亮颜色', async () => {
      const wrapper = await mountCollapsedExperience()
      const marker = wrapper.get('.mission-card__index')
      expect(['#7cff9b', 'rgb(124, 255, 155)']).toContain(getComputedStyle(marker.element).color)
    })

    it('应该为卡片悬停提供变换过渡', async () => {
      const wrapper = await mountCollapsedExperience()
      const card = wrapper.get('.mission-card')
      expect(card.classes()).toContain('sci-card')
      expect(getComputedStyle(card.element).transition).toContain('transform 240ms')
    })
  })
})
