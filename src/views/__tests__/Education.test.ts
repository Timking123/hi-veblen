/**
 * 科幻改版后的页面语义、数据展示与真实组件交互测试。
 * 背景统一由 App 的 CinematicBackground/ShaderBackground 承载。
 * Happy DOM 的样式声明检查不替代真实浏览器的布局、悬停与响应式验收。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Education from '../Education.vue'

// 背景现由全局布局管理；本套件只验证页面内容与交互。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sharedStyles = readFileSync(resolve('src/style.css'), 'utf8')
let styleElement: HTMLStyleElement
beforeEach(() => {
  styleElement = document.createElement('style')
  styleElement.textContent = sharedStyles.replace(/^@import[^;]+;/gm, '')
  document.head.appendChild(styleElement)
})
afterEach(() => styleElement.remove())
enableAutoUnmount(afterEach)
afterEach(() => vi.unstubAllGlobals())

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

describe('Education - 页面交互测试', () => {
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
    it('应该显示教育记录的语义页面', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: {
          stubs: {
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
        attachTo: document.body,
        global: {
          stubs: {
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面标题
      const title = wrapper.find('h1')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('学术数据库')

      // 验证页面副标题
      const subtitle = wrapper.find('.sci-eyebrow')
      expect(subtitle.exists()).toBe(true)
      expect(subtitle.text()).toBe('ACADEMIC RECORD')
    })

    it('应该显示教育时间线', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: {
          stubs: {
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证时间线容器存在
      const timeline = wrapper.find('.education-records')
      expect(timeline.exists()).toBe(true)
    })

    it('应该显示荣誉与奖项部分', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: {
          stubs: {
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证荣誉部分存在
      const honorsSection = wrapper.find('.academic-card__section')
      expect(honorsSection.exists()).toBe(true)

      // 验证荣誉标题
      const sectionTitle = honorsSection.find('.sci-eyebrow')
      expect(sectionTitle.text()).toBe('HONORS')

      // 验证荣誉标签
      const honorTags = honorsSection.findAll('.identity-card__tags .sci-chip')
      expect(honorTags.length).toBe(2)
    })

    it('应该显示课程成绩部分', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: {
          stubs: {
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证课程部分存在
      const coursesSection = wrapper.find('.academic-card__section:nth-of-type(3)')
      expect(coursesSection.exists()).toBe(true)

      // 验证课程标题
      const sectionTitle = coursesSection.find('.sci-eyebrow')
      expect(sectionTitle.text()).toBe('COURSE MATRIX')
    })
  })

  describe('页面层级关系', () => {
    it('应该为页面内容保留相对定位上下文', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: {
          stubs: {
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 检查页面自身的定位；全局背景层级由 App 验收覆盖。
      const page = wrapper.find('.education-page')
      expect(page.exists()).toBe(true)

      // 相对定位保留页面内浮层的定位上下文。
      // 不将组件挂载声明为全局背景已验收。
      const pageElement = page.element as HTMLElement
      expect(getComputedStyle(pageElement).position).toBe('relative')
    })

    it('应该确保页面容器没有纯色背景遮罩', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: {
          stubs: {
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器不应该有阻挡背景的纯色背景
      const page = wrapper.find('.education-page')
      const pageElement = page.element as HTMLElement

      // 页面容器不能用纯色遮住全局背景。
      expect(getComputedStyle(pageElement).backgroundColor).toMatch(
        /^(?:transparent|rgba\(0, 0, 0, 0\))?$/
      )
    })
  })

  describe('图表类型切换', () => {
    it('应该支持柱状图和雷达图切换', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: {
          stubs: {
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
      const buttons = selector.findAll('button')
      expect(buttons.length).toBe(2)

      // 验证按钮文本
      expect(buttons[0].text()).toBe('BAR')
      expect(buttons[1].text()).toBe('RADAR')

      // 默认应该选中柱状图
      expect(buttons[0].classes()).toContain('active')
      expect(wrapper.get('course-chart-stub').attributes('type')).toBe('bar')
      expect(buttons[1].classes()).not.toContain('active')

      // 点击雷达图按钮
      await buttons[1].trigger('click')
      await nextTick()

      // 验证雷达图按钮被选中
      expect(buttons[1].classes()).toContain('active')
      expect(wrapper.get('course-chart-stub').attributes('type')).toBe('radar')
      expect(buttons[0].classes()).not.toContain('active')
    })
  })

  describe('课程列表交互', () => {
    it('应该在鼠标悬停时显示课程详情', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: {
          stubs: {
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 初始状态：详情卡片不显示
      let detailCard = wrapper.find('.course-inspector')
      expect(detailCard.exists()).toBe(false)

      // 找到课程项
      const courseItems = wrapper.findAll('.matrix-node')
      expect(courseItems.length).toBeGreaterThan(0)

      // 鼠标悬停在第一个课程项上
      await courseItems[0].trigger('mouseenter')
      await nextTick()

      // 验证详情卡片显示
      detailCard = wrapper.find('.course-inspector')
      expect(detailCard.exists()).toBe(true)

      // 验证详情卡片包含课程信息
      const detailTitle = detailCard.find('span')
      expect(detailTitle.text()).toBe('数据结构')

      // 鼠标离开
      await courseItems[0].trigger('mouseleave')
      await nextTick()

      // 验证详情卡片消失
      detailCard = wrapper.find('.course-inspector')
      expect(detailCard.exists()).toBe(false)
    })

    it('应该正确计算课程等级', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: {
          stubs: {
            Timeline: true,
            CourseChart: true,
          },
        },
      })
      await nextTick()

      // 找到课程项并悬停
      const courseItems = wrapper.findAll('.matrix-node')
      await courseItems[0].trigger('mouseenter')
      await nextTick()

      // 验证等级显示（95分应该是 A+）
      const detailCard = wrapper.find('.course-inspector')
      const gradeText = detailCard.get('strong').text()

      // 第一个值是成绩
      expect(gradeText).toContain('95')

      // 第二个值是等级
      expect(gradeText).toContain('A+')
    })
  })

  describe('响应式布局', () => {
    it('应该保留响应式布局所需的内容容器', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: {
          stubs: {
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
      const container = wrapper.find('.education-records')
      expect(container.exists()).toBe(true)
    })
  })

  describe('动画效果', () => {
    it('应该为课程节点提供按成绩显示的视觉比例', async () => {
      const wrapper = mount(Education, {
        attachTo: document.body,
        global: { stubs: { CourseChart: true } },
      })
      const honors = wrapper.findAll('.identity-card__tags .sci-chip')
      expect(honors.map(item => item.text())).toEqual(['优秀毕业生', '一等奖学金'])
      const nodes = wrapper.findAll('.matrix-node')
      expect(nodes).toHaveLength(2)
      expect((nodes[0].element as HTMLElement).style.getPropertyValue('--level')).toBe('95%')
      expect((nodes[1].element as HTMLElement).style.getPropertyValue('--level')).toBe('92%')
    })
  })
})
