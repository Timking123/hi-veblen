import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useScroll } from '../useScroll'

describe('useScroll', () => {
  beforeEach(() => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0,
    })
  })

  it('should track scroll position', async () => {
    const TestComponent = defineComponent({
      setup() {
        const { scrollY } = useScroll()
        return { scrollY }
      },
      template: '<div>{{ scrollY }}</div>',
    })

    const wrapper = mount(TestComponent)
    expect(wrapper.vm.scrollY).toBe(0)

    // Simulate scroll
    window.scrollY = 100
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(wrapper.vm.scrollY).toBe(100)
    wrapper.unmount()
  })

  it('should detect scroll direction', async () => {
    const TestComponent = defineComponent({
      setup() {
        const { scrollDirection } = useScroll()
        return { scrollDirection }
      },
      template: '<div>{{ scrollDirection }}</div>',
    })

    const wrapper = mount(TestComponent)

    // Scroll down
    window.scrollY = 100
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(wrapper.vm.scrollDirection).toBe('down')

    // Scroll up
    window.scrollY = 50
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(wrapper.vm.scrollDirection).toBe('up')
    wrapper.unmount()
  })

  it('should track scrolling state', async () => {
    vi.useFakeTimers()
    
    const TestComponent = defineComponent({
      setup() {
        const { isScrolling } = useScroll()
        return { isScrolling }
      },
      template: '<div>{{ isScrolling }}</div>',
    })

    const wrapper = mount(TestComponent)
    expect(wrapper.vm.isScrolling).toBe(false)

    window.scrollY = 100
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(wrapper.vm.isScrolling).toBe(true)

    // Wait for timeout
    vi.advanceTimersByTime(200)
    await nextTick()

    expect(wrapper.vm.isScrolling).toBe(false)

    wrapper.unmount()
    vi.useRealTimers()
  })
})

