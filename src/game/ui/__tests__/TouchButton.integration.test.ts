import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import TouchButton from '../TouchButton.vue'

describe('TouchButton 多指交互', () => {
  const wrappers: VueWrapper[] = []
  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  })

  it('两个按钮分别跟踪自己的触点，取消触摸只释放对应按钮', async () => {
    const fire = mount(TouchButton, { props: { label: '开火' } })
    const missile = mount(TouchButton, { props: { label: '导弹' } })
    wrappers.push(fire, missile)

    await fire.trigger('touchstart', { touches: [{ identifier: 1 }] })
    await missile.trigger('touchstart', { touches: [{ identifier: 2 }] })
    expect(fire.emitted('press')).toHaveLength(1)
    expect(missile.emitted('press')).toHaveLength(1)

    await fire.trigger('touchend', { changedTouches: [{ identifier: 2 }] })
    expect(fire.emitted('release')).toBeUndefined()
    await missile.trigger('touchcancel', { changedTouches: [{ identifier: 2 }] })
    expect(missile.emitted('release')).toHaveLength(1)
    expect(fire.emitted('release')).toBeUndefined()

    await fire.trigger('touchend', { changedTouches: [{ identifier: 1 }] })
    expect(fire.emitted('release')).toHaveLength(1)
    await missile.trigger('touchstart', { touches: [{ identifier: 3 }] })
    expect(missile.emitted('press')).toHaveLength(2)
  })

  it('同一次持续触摸不会重复发出按下事件', async () => {
    const button = mount(TouchButton)
    wrappers.push(button)
    await button.trigger('touchstart', { touches: [{ identifier: 1 }] })
    await button.trigger('touchstart', { touches: [{ identifier: 1 }, { identifier: 2 }] })
    expect(button.emitted('press')).toHaveLength(1)
    await button.trigger('touchend', { changedTouches: [{ identifier: 1 }] })
    expect(button.emitted('release')).toHaveLength(1)
  })
})
