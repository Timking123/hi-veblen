/**
 * 科幻改版后的页面语义、数据展示与真实组件交互测试。
 * 背景统一由 App 的 CinematicBackground/ShaderBackground 承载。
 * Happy DOM 的样式声明检查不替代真实浏览器的布局、悬停与响应式验收。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Skills from '../Skills.vue'

// 1478c5e 与科幻改版设计将旧图表/浮卡迁移为技能节点、核心面板与关联项目区。
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

describe('Skills - 页面交互测试', () => {
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
    it('应该显示技能矩阵的语义页面', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器存在
      expect(wrapper.find('.matrix-page').exists()).toBe(true)
    })

    it('应该正确渲染页面标题和副标题', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面标题
      const title = wrapper.find('h1')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('能力矩阵')

      // 验证页面副标题
      const subtitle = wrapper.find('.sci-eyebrow')
      expect(subtitle.exists()).toBe(true)
      expect(subtitle.text()).toBe('CAPABILITY MATRIX')
    })

    it('应该显示可操作的技能矩阵节点', async () => {
      const wrapper = mount(Skills, { attachTo: document.body })
      const nodes = wrapper.findAll('.matrix-node')
      expect(nodes).toHaveLength(4)
      expect(nodes.every(node => node.element.tagName === 'BUTTON')).toBe(true)
      expect(nodes.every(node => !node.classes().includes('active'))).toBe(true)
    })

    it('应该按类别显示技能', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证类别部分存在
      const categories = wrapper.findAll('.matrix-group')
      expect(categories.length).toBeGreaterThan(0)

      // 验证前端技能类别
      const frontendCategory = categories.find(cat => cat.find('h2').text().includes('前端核心'))
      expect(frontendCategory).toBeDefined()

      // 验证后端技能类别
      const backendCategory = categories.find(cat => cat.find('h2').text().includes('后端与接口'))
      expect(backendCategory).toBeDefined()

      // 验证工具类别
      const toolsCategory = categories.find(cat => cat.find('h2').text().includes('工具链'))
      expect(toolsCategory).toBeDefined()
    })
  })

  describe('页面层级关系', () => {
    it('应该为页面内容保留相对定位上下文', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 检查页面自身的定位；全局背景层级由 App 验收覆盖。
      const page = wrapper.find('.matrix-page')
      expect(page.exists()).toBe(true)

      // 相对定位保留页面内浮层的定位上下文。
      const pageElement = page.element as HTMLElement
      expect(getComputedStyle(pageElement).position).toBe('relative')
    })

    it('应该确保页面容器没有纯色背景遮罩', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器不应该有阻挡背景的纯色背景
      const page = wrapper.find('.matrix-page')
      const pageElement = page.element as HTMLElement

      // 页面容器不能用纯色遮住全局背景。
      expect(getComputedStyle(pageElement).backgroundColor).toMatch(
        /^(?:transparent|rgba\(0, 0, 0, 0\))?$/
      )
    })

    it('应该确保核心面板使用半透明背景', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证图表容器存在
      const chartWrappers = wrapper.findAll('.matrix-core')
      expect(chartWrappers.length).toBeGreaterThan(0)

      // 图表容器应该使用半透明背景，让粒子背景可见
      chartWrappers.forEach(wrapper => {
        const wrapperElement = wrapper.element as HTMLElement
        expect(getComputedStyle(wrapperElement).backgroundImage).toContain('rgba(10, 19, 39, 0.78)')
      })
    })
  })

  describe('能力节点切换', () => {
    it('应该支持在能力节点之间切换选择', async () => {
      const wrapper = mount(Skills, { attachTo: document.body })
      const nodes = wrapper.findAll('.matrix-node')
      await nodes[0].trigger('click')
      expect(nodes[0].classes()).toContain('active')
      expect(nodes[1].classes()).not.toContain('active')
      await nodes[1].trigger('click')
      expect(nodes[1].classes()).toContain('active')
      expect(nodes[0].classes()).not.toContain('active')
      await nodes[0].trigger('click')
      expect(nodes[0].classes()).toContain('active')
      expect(nodes[1].classes()).not.toContain('active')
    })
  })

  describe('技能标签显示', () => {
    it('应该显示所有技能标签', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证技能标签存在
      const skillTags = wrapper.findAll('.matrix-node')
      expect(skillTags.length).toBe(4)
    })

    it('应该显示技能名称和熟练度', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      const skillTags = wrapper.findAll('.matrix-node')
      const firstTag = skillTags[0]

      // 验证技能名称
      const skillName = firstTag.find('span')
      expect(skillName.exists()).toBe(true)
      expect(skillName.text()).toBe('Vue.js')

      // 验证熟练度
      const skillLevel = firstTag.find('strong')
      expect(skillLevel.exists()).toBe(true)
      expect(skillLevel.text()).toBe('95%')
    })
  })

  describe('技能详情卡片', () => {
    it('应该在鼠标悬停时显示技能详情', async () => {
      const wrapper = mount(Skills, { attachTo: document.body })
      const panel = wrapper.get('.matrix-core')
      expect(panel.text()).not.toContain('3年开发经验')
      const node = wrapper.get('.matrix-node')
      await node.trigger('mouseenter')
      expect(node.get('span').text()).toBe('Vue.js')
      expect(panel.get('p').text()).toContain('3年开发经验')
      await node.trigger('mouseleave')
      expect(panel.text()).not.toContain('3年开发经验')
      expect(panel.get('p').text()).toContain('悬停或点击')
    })

    it('应该显示技能的详细信息', async () => {
      const wrapper = mount(Skills, { attachTo: document.body })
      const node = wrapper.get('.matrix-node')
      await node.trigger('mouseenter')
      expect(node.get('strong').text()).toBe('95%')
      expect(wrapper.get('.matrix-core p').text()).toContain('3年开发经验')
    })

    it('应该在选择技能后显示相关项目', async () => {
      const wrapper = mount(Skills, { attachTo: document.body })
      const node = wrapper.get('.matrix-node')
      await node.trigger('mouseenter')
      expect(wrapper.get('.matrix-core p').text()).toContain('3年开发经验')
      await node.trigger('click')
      expect(wrapper.findAll('.matrix-projects__list .sci-chip').map(item => item.text())).toEqual([
        '个人作品集网站',
        '企业管理系统',
      ])
    })
  })

  describe('技能筛选功能', () => {
    it('应该在点击技能标签时显示筛选结果', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 初始状态：筛选结果不显示
      let filteredSection = wrapper.find('.matrix-projects')
      expect(filteredSection.exists()).toBe(false)

      // 点击技能标签
      const skillTags = wrapper.findAll('.matrix-node')
      await skillTags[0].trigger('click')
      await nextTick()

      // 验证筛选结果显示
      filteredSection = wrapper.find('.matrix-projects')
      expect(filteredSection.exists()).toBe(true)

      // 验证筛选标题
      const filterHeader = filteredSection.find('.matrix-projects__header h2')
      expect(filterHeader.text()).toContain('Vue.js')
    })

    it('应该显示筛选后的项目列表', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 点击技能标签
      const skillTags = wrapper.findAll('.matrix-node')
      await skillTags[0].trigger('click')
      await nextTick()

      // 验证项目卡片
      const projectCards = wrapper.findAll('.matrix-projects__list .sci-chip')
      expect(projectCards.length).toBe(2)
      expect(projectCards[0].text()).toBe('个人作品集网站')
      expect(projectCards[1].text()).toBe('企业管理系统')
    })

    it('应该支持清除筛选', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 点击技能标签
      const skillTags = wrapper.findAll('.matrix-node')
      await skillTags[0].trigger('click')
      await nextTick()

      // 验证筛选结果显示
      let filteredSection = wrapper.find('.matrix-projects')
      expect(filteredSection.exists()).toBe(true)

      // 点击清除按钮
      const clearBtn = wrapper.find('.matrix-projects__header button')
      await clearBtn.trigger('click')
      await nextTick()

      // 验证筛选结果消失
      filteredSection = wrapper.find('.matrix-projects')
      expect(filteredSection.exists()).toBe(false)
    })

    it('应该在再次点击同一技能时取消筛选', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      const skillTags = wrapper.findAll('.matrix-node')
      const firstTag = skillTags[0]

      // 第一次点击：显示筛选
      await firstTag.trigger('click')
      await nextTick()
      expect(wrapper.find('.matrix-projects').exists()).toBe(true)

      // 第二次点击：取消筛选
      await firstTag.trigger('click')
      await nextTick()
      expect(wrapper.find('.matrix-projects').exists()).toBe(false)
    })

    it('应该在切换技能时更新筛选结果', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      const skillTags = wrapper.findAll('.matrix-node')

      // 点击第一个技能
      await skillTags[0].trigger('click')
      await nextTick()

      let filterHeader = wrapper.find('.matrix-projects__header h2')
      expect(filterHeader.text()).toContain('Vue.js')

      // 点击第二个技能
      await skillTags[1].trigger('click')
      await nextTick()

      filterHeader = wrapper.find('.matrix-projects__header h2')
      expect(filterHeader.text()).toContain('TypeScript')
    })
  })

  describe('响应式布局', () => {
    it('应该保留响应式布局所需的内容容器', async () => {
      const wrapper = mount(Skills, {
        attachTo: document.body,
        global: {
          stubs: {
            SkillChart: true,
          },
        },
      })
      await nextTick()

      // 验证页面容器存在
      const page = wrapper.find('.matrix-page')
      expect(page.exists()).toBe(true)

      // 验证主要内容区域存在
      const container = wrapper.find('.matrix-layout')
      expect(container.exists()).toBe(true)
    })
  })

  describe('动画效果', () => {
    it('应该为每个类别保留统一的视觉容器', async () => {
      const wrapper = mount(Skills, { attachTo: document.body })
      const groups = wrapper.findAll('.matrix-group')
      expect(groups).toHaveLength(3)
      for (const group of groups) {
        expect(group.classes()).toContain('sci-card')
        expect(group.findAll('.matrix-node').length).toBeGreaterThan(0)
      }
    })

    it('应该按熟练度设置每个节点的视觉比例', async () => {
      const wrapper = mount(Skills, { attachTo: document.body })
      const nodes = wrapper.findAll('.matrix-node')
      expect(nodes).toHaveLength(4)
      expect(
        nodes.map(node => (node.element as HTMLElement).style.getPropertyValue('--level'))
      ).toEqual(['95%', '90%', '85%', '88%'])
    })
  })
})
