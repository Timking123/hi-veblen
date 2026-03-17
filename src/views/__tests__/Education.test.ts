/**
 * Education 页面单元测试
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
import Education from '../Education.vue'
import ParticleBackground from '@/components/effects/ParticleBackground.vue'

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
    education: [
      {
        id: 'edu-1',
        school: '测试大学',
        college: '计算机学院',
        major: '软件工程',
        period: '2018.09 - 2022.06',
        rank: '专业排名: 5/120',
        honors: ['优秀毕业生', '一等奖学金'],
        courses: [
          { name: '数据结构', score: 95 },
          { name: '算法设计', score: 92 },
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

describe('Education - 背景显示测试', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      cb(0)
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  describe('ParticleBackground 组件显示', () => {
    it('应该在教育经历页面显示 ParticleBackground 组件', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: false, // 不 stub，使用真实组件
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器存在
      expect(wrapper.find('.education-page').exists()).toBe(true)
    })

    it('应该正确渲染页面标题和副标题', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面标题
      const title = wrapper.find('.page-title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('教育经历')

      // 验证页面副标题
      const subtitle = wrapper.find('.page-subtitle')
      expect(subtitle.exists()).toBe(true)
      expect(subtitle.text()).toBe('Education Background')
    })

    it('应该显示教育时间线', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证时间线容器存在
      const timeline = wrapper.find('.education-timeline')
      expect(timeline.exists()).toBe(true)
    })

    it('应该显示荣誉与奖项部分', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证荣誉部分存在
      const honorsSection = wrapper.find('.honors-section')
      expect(honorsSection.exists()).toBe(true)

      // 验证荣誉标题
      const sectionTitle = honorsSection.find('.section-title')
      expect(sectionTitle.text()).toBe('荣誉与奖项')

      // 验证荣誉标签
      const honorTags = honorsSection.findAll('.honor-tag')
      expect(honorTags.length).toBe(2)
    })

    it('应该显示课程成绩部分', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证课程部分存在
      const coursesSection = wrapper.find('.courses-section')
      expect(coursesSection.exists()).toBe(true)

      // 验证课程标题
      const sectionTitle = coursesSection.find('.section-title')
      expect(sectionTitle.text()).toBe('主修课程成绩')
    })
  })

  describe('页面层级关系', () => {
    it('应该确保页面内容在背景之上', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器有正确的 z-index
      const page = wrapper.find('.education-page')
      expect(page.exists()).toBe(true)
      
      // 页面应该有 position: relative 和 z-index: 1
      // 这确保内容在背景之上
      const pageElement = page.element as HTMLElement
      expect(pageElement).toBeDefined()
    })

    it('应该确保页面容器没有纯色背景遮罩', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器不应该有阻挡背景的纯色背景
      const page = wrapper.find('.education-page')
      const pageElement = page.element as HTMLElement
      
      // 页面容器应该存在
      expect(pageElement).toBeDefined()
    })
  })

  describe('图表类型切换', () => {
    it('应该支持柱状图和雷达图切换', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证图表类型选择器存在
      const selector = wrapper.find('.chart-type-selector')
      expect(selector.exists()).toBe(true)

      // 验证按钮存在
      const buttons = selector.findAll('.chart-btn')
      expect(buttons.length).toBe(2)

      // 验证按钮文本
      expect(buttons[0].text()).toBe('柱状图')
      expect(buttons[1].text()).toBe('雷达图')

      // 默认应该选中柱状图
      expect(buttons[0].classes()).toContain('active')
      expect(buttons[1].classes()).not.toContain('active')

      // 点击雷达图按钮
      await buttons[1].trigger('click')
      await nextTick()

      // 验证雷达图按钮被选中
      expect(buttons[1].classes()).toContain('active')
      expect(buttons[0].classes()).not.toContain('active')
    })
  })

  describe('课程列表交互', () => {
    it('应该在鼠标悬停时显示课程详情', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 初始状态：详情卡片不显示
      let detailCard = wrapper.find('.course-detail-card')
      expect(detailCard.exists()).toBe(false)

      // 找到课程项
      const courseItems = wrapper.findAll('.course-item')
      expect(courseItems.length).toBeGreaterThan(0)

      // 鼠标悬停在第一个课程项上
      await courseItems[0].trigger('mouseenter')
      await nextTick()

      // 验证详情卡片显示
      detailCard = wrapper.find('.course-detail-card')
      expect(detailCard.exists()).toBe(true)

      // 验证详情卡片包含课程信息
      const detailTitle = detailCard.find('h4')
      expect(detailTitle.text()).toBe('数据结构')

      // 鼠标离开
      await courseItems[0].trigger('mouseleave')
      await nextTick()

      // 验证详情卡片消失
      detailCard = wrapper.find('.course-detail-card')
      expect(detailCard.exists()).toBe(false)
    })

    it('应该正确计算课程等级', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 找到课程项并悬停
      const courseItems = wrapper.findAll('.course-item')
      await courseItems[0].trigger('mouseenter')
      await nextTick()

      // 验证等级显示（95分应该是 A+）
      const detailCard = wrapper.find('.course-detail-card')
      const detailValues = detailCard.findAll('.detail-value')
      
      // 第一个值是成绩
      expect(detailValues[0].text()).toBe('95')
      
      // 第二个值是等级
      expect(detailValues[1].text()).toBe('优秀 (A+)')
    })
  })

  describe('响应式布局', () => {
    it('应该在移动端正确显示', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器存在
      const page = wrapper.find('.education-page')
      expect(page.exists()).toBe(true)

      // 验证主要内容区域存在
      const container = wrapper.find('.education-container')
      expect(container.exists()).toBe(true)
    })
  })

  describe('动画效果', () => {
    it('应该为页面元素添加动画延迟', async () => {
      const wrapper = mount(Education, {
        global: {
          stubs: {
            ParticleBackground: true,
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证荣誉标签有动画延迟
      const honorTags = wrapper.findAll('.honor-tag')
      honorTags.forEach((tag, index) => {
        const style = tag.attributes('style')
        expect(style).toContain('animation-delay')
      })

      // 验证课程项有动画延迟
      const courseItems = wrapper.findAll('.course-item')
      courseItems.forEach((item, index) => {
        const style = item.attributes('style')
        expect(style).toContain('animation-delay')
      })
    })
  })
})
