import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../Button.vue'
import Card from '../Card.vue'
import Loading from '../Loading.vue'
import Tag from '../Tag.vue'

describe('Common UI Components', () => {
  describe('Button Component', () => {
    it('renders button with default props', () => {
      const wrapper = mount(Button, {
        slots: {
          default: 'Click me',
        },
      })
      expect(wrapper.text()).toBe('Click me')
      expect(wrapper.find('[data-testid="button"]').exists()).toBe(true)
    })

    it('applies correct variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'primary' },
        slots: { default: 'Primary' },
      })
      expect(wrapper.classes()).toContain('btn-primary')
    })

    it('shows loading spinner when loading', () => {
      const wrapper = mount(Button, {
        props: { loading: true },
        slots: { default: 'Submit' },
      })
      expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true)
      expect(wrapper.text()).not.toBe('Submit')
    })

    it('emits click event when clicked', async () => {
      const wrapper = mount(Button, {
        slots: { default: 'Click' },
      })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeTruthy()
    })

    it('does not emit click when disabled', async () => {
      const wrapper = mount(Button, {
        props: { disabled: true },
        slots: { default: 'Disabled' },
      })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeFalsy()
    })
  })

  describe('Card Component', () => {
    it('renders card with content', () => {
      const wrapper = mount(Card, {
        slots: {
          default: 'Card content',
        },
      })
      expect(wrapper.text()).toBe('Card content')
      expect(wrapper.find('[data-testid="card"]').exists()).toBe(true)
    })

    it('renders header and footer slots', () => {
      const wrapper = mount(Card, {
        slots: {
          header: 'Header',
          default: 'Body',
          footer: 'Footer',
        },
      })
      expect(wrapper.text()).toContain('Header')
      expect(wrapper.text()).toContain('Body')
      expect(wrapper.text()).toContain('Footer')
    })

    it('applies hoverable class when hoverable prop is true', () => {
      const wrapper = mount(Card, {
        props: { hoverable: true },
        slots: { default: 'Hover me' },
      })
      expect(wrapper.classes()).toContain('card-hoverable')
    })

    it('emits click event when clickable', async () => {
      const wrapper = mount(Card, {
        props: { clickable: true },
        slots: { default: 'Click me' },
      })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeTruthy()
    })
  })

  describe('Loading Component', () => {
    it('renders loading spinner by default', () => {
      const wrapper = mount(Loading)
      expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)
      expect(wrapper.find('.spinner').exists()).toBe(true)
    })

    it('renders different loading types', () => {
      const dotsWrapper = mount(Loading, { props: { type: 'dots' } })
      expect(dotsWrapper.find('.dots').exists()).toBe(true)

      const pulseWrapper = mount(Loading, { props: { type: 'pulse' } })
      expect(pulseWrapper.find('.pulse').exists()).toBe(true)

      const barsWrapper = mount(Loading, { props: { type: 'bars' } })
      expect(barsWrapper.find('.bars').exists()).toBe(true)
    })

    it('displays loading text when provided', () => {
      const wrapper = mount(Loading, {
        props: { text: 'Loading...' },
      })
      expect(wrapper.text()).toBe('Loading...')
    })

    it('applies fullscreen class when fullscreen prop is true', () => {
      const wrapper = mount(Loading, {
        props: { fullscreen: true },
      })
      expect(wrapper.classes()).toContain('loading-fullscreen')
    })
  })

  describe('Tag Component', () => {
    it('renders tag with content', () => {
      const wrapper = mount(Tag, {
        slots: {
          default: 'Tag label',
        },
      })
      expect(wrapper.text()).toBe('Tag label')
      expect(wrapper.find('[data-testid="tag"]').exists()).toBe(true)
    })

    it('applies correct variant classes', () => {
      const wrapper = mount(Tag, {
        props: { variant: 'primary' },
        slots: { default: 'Primary' },
      })
      expect(wrapper.classes()).toContain('tag-primary')
    })

    it('shows close button when closable', () => {
      const wrapper = mount(Tag, {
        props: { closable: true },
        slots: { default: 'Closable' },
      })
      expect(wrapper.find('[data-testid="tag-close"]').exists()).toBe(true)
    })

    it('emits close event when close button clicked', async () => {
      const wrapper = mount(Tag, {
        props: { closable: true },
        slots: { default: 'Close me' },
      })
      await wrapper.find('[data-testid="tag-close"]').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits click event when clickable', async () => {
      const wrapper = mount(Tag, {
        props: { clickable: true },
        slots: { default: 'Click me' },
      })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeTruthy()
    })

    it('applies outlined class when outlined prop is true', () => {
      const wrapper = mount(Tag, {
        props: { outlined: true },
        slots: { default: 'Outlined' },
      })
      expect(wrapper.classes()).toContain('tag-outlined')
    })
  })
})
