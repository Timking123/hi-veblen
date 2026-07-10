import { beforeEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Home from '../Home.vue'
import { profileData } from '@/data/profile'

describe('数字艺术展厅首页', () => {
  let wrapper: VueWrapper

  beforeEach(async () => {
    const Page = { template: '<div>Page</div>' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Home },
        { path: '/about', component: Page },
        { path: '/skills', component: Page },
        { path: '/projects', component: Page },
        { path: '/gallery', component: Page },
        { path: '/contact', component: Page },
        { path: '/os', component: Page },
      ],
    })
    await router.push('/')
    await router.isReady()
    wrapper = mount(Home, { global: { plugins: [router] } })
  })

  it('保留原首页的姓名与数字艺术展厅定位', () => {
    expect(wrapper.get('#signal-title').text()).toContain(profileData.name)
    expect(wrapper.text()).toContain('沉浸式科幻终端与数字艺术展厅')
  })

  it('在原有操作组中提供唯一灵犀入口', () => {
    const links = wrapper.findAll('a[href="/lingxi/"]')
    expect(links).toHaveLength(1)
    expect(links[0].text()).toBe('ENTER LINGXI')
    expect(links[0].classes()).not.toContain('sci-button--primary')
  })

  it('保留 Gallery、Archive 与 Legacy OS 入口', () => {
    expect(wrapper.find('a[href="/gallery"]').classes()).toContain('sci-button--primary')
    expect(wrapper.find('a[href="/projects"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/os"]').exists()).toBe(true)
  })

  it('保留六个原有探索模块和真实经历', () => {
    expect(wrapper.findAll('.module-card')).toHaveLength(6)
    expect(wrapper.findAll('.log-card')).toHaveLength(profileData.experience.length)
  })
})
