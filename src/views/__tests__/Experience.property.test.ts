import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import * as fc from 'fast-check'
import Experience from '../Experience.vue'

enableAutoUnmount(afterEach)

// 通过真实标题按钮建立折叠起点，不依赖页面默认展开策略。
const mountCollapsedExperience = async () => {
  const wrapper = mount(Experience)
  const cards = wrapper.findAll('.mission-card')
  expect(cards.length).toBeGreaterThan(0)
  for (const card of cards) {
    if (card.find('.mission-card__body').exists()) await card.get('button').trigger('click')
  }
  return wrapper
}

// Mock the profile data module
vi.mock('@/data/profile', () => ({
  profileData: {
    experience: [],
  },
}))

/**
 * Feature: vue3-portfolio-website, Property 7: 交互状态切换正确性
 *
 * Property: 对于任何可展开的工作经历卡片，点击后其展开状态应当切换（从展开变为折叠，或从折叠变为展开）
 *
 * Validates: Requirements 3.2
 */

// Arbitrary generator for Achievement
const achievementArbitrary = fc.record({
  metric: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{3,20}$/),
  value: fc.oneof(
    fc.integer({ min: 1, max: 100 }).map(n => `${n}%`),
    fc.integer({ min: 1, max: 100 }).map(n => `${n}+`),
    fc.stringMatching(/^[0-9.]+\/[0-9.]+$/)
  ),
})

// Arbitrary generator for Experience items
const experienceArbitrary = fc.record({
  id: fc.uuid(),
  company: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{5,30}$/),
  position: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{5,30}$/),
  period: fc
    .tuple(
      fc.integer({ min: 2015, max: 2024 }), // Start year
      fc.integer({ min: 1, max: 12 }), // Start month
      fc.integer({ min: 2015, max: 2025 }), // End year
      fc.integer({ min: 1, max: 12 }), // End month
      fc.boolean()
    )
    .map(([startYear, startMonth, endYear, endMonth, current]) => {
      const start = new Date(startYear, startMonth - 1, 1)
      let end = new Date(endYear, endMonth - 1, 1)

      if (end <= start) {
        end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      }

      const startStr = `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}`
      const endStr = !current
        ? `${end.getFullYear()}.${String(end.getMonth() + 1).padStart(2, '0')}`
        : '至今'

      return `${startStr} - ${endStr}`
    }),
  responsibilities: fc.array(fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{10,80}$/), {
    minLength: 2,
    maxLength: 6,
  }),
  achievements: fc.option(fc.array(achievementArbitrary, { minLength: 1, maxLength: 5 }), {
    nil: undefined,
  }),
})

describe('Experience Property Tests', () => {
  describe('Property 7: Interaction State Toggle Correctness', () => {
    it('should toggle expanded state from collapsed to expanded when clicked', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(experienceArbitrary, {
            selector: item => item.id,
            minLength: 1,
            maxLength: 5,
          }),
          async experiences => {
            // Dynamically import and mock profileData
            const profileModule = await import('@/data/profile')
            vi.mocked(profileModule).profileData.experience = experiences

            // Mount component
            const wrapper = await mountCollapsedExperience()

            // Wait for component to render
            await wrapper.vm.$nextTick()

            // Get all experience cards
            const cards = wrapper.findAll('.mission-card')
            expect(cards.length).toBe(experiences.length)

            // Property: For each card, clicking should toggle from collapsed to expanded
            for (let i = 0; i < cards.length; i++) {
              const card = cards[i]

              // Initially, card should be collapsed (not expanded)
              expect(card.classes()).not.toContain('mission-card--expanded')

              // Card body should not be visible
              let cardBody = card.find('.mission-card__body')
              expect(cardBody.exists()).toBe(false)

              // Click the card to expand
              await card.get('button').trigger('click')
              await wrapper.vm.$nextTick()

              // After click, card should be expanded
              expect(card.classes()).toContain('mission-card--expanded')

              // Card body should now be visible
              cardBody = card.find('.mission-card__body')
              expect(cardBody.exists()).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should toggle expanded state from expanded to collapsed when clicked again', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(experienceArbitrary, {
            selector: item => item.id,
            minLength: 1,
            maxLength: 5,
          }),
          async experiences => {
            const profileModule = await import('@/data/profile')
            vi.mocked(profileModule).profileData.experience = experiences

            const wrapper = await mountCollapsedExperience()

            await wrapper.vm.$nextTick()

            const cards = wrapper.findAll('.mission-card')

            // Property: For each card, clicking twice should return to collapsed state
            for (let i = 0; i < cards.length; i++) {
              const card = cards[i]

              // First click: expand
              await card.get('button').trigger('click')
              await wrapper.vm.$nextTick()
              expect(card.classes()).toContain('mission-card--expanded')

              // Second click: collapse
              await card.get('button').trigger('click')
              await wrapper.vm.$nextTick()
              expect(card.classes()).not.toContain('mission-card--expanded')

              // Card body should not be visible after collapsing
              const cardBody = card.find('.mission-card__body')
              expect(cardBody.exists()).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should toggle state independently for each card', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(experienceArbitrary, {
            selector: item => item.id,
            minLength: 2,
            maxLength: 4,
          }),
          async experiences => {
            const profileModule = await import('@/data/profile')
            vi.mocked(profileModule).profileData.experience = experiences

            const wrapper = await mountCollapsedExperience()

            await wrapper.vm.$nextTick()

            const cards = wrapper.findAll('.mission-card')

            // Property: Expanding one card should not affect other cards
            // Expand the first card
            await cards[0].get('button').trigger('click')
            await wrapper.vm.$nextTick()

            expect(cards[0].classes()).toContain('mission-card--expanded')

            // All other cards should remain collapsed
            for (let i = 1; i < cards.length; i++) {
              expect(cards[i].classes()).not.toContain('mission-card--expanded')
            }

            // Expand the second card
            if (cards.length > 1) {
              await cards[1].get('button').trigger('click')
              await wrapper.vm.$nextTick()

              expect(cards[1].classes()).toContain('mission-card--expanded')
              // First card should still be expanded
              expect(cards[0].classes()).toContain('mission-card--expanded')

              // All other cards should remain collapsed
              for (let i = 2; i < cards.length; i++) {
                expect(cards[i].classes()).not.toContain('mission-card--expanded')
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain toggle state through multiple interactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          experienceArbitrary,
          fc.array(fc.boolean(), { minLength: 3, maxLength: 10 }),
          async (experience, clickSequence) => {
            const profileModule = await import('@/data/profile')
            vi.mocked(profileModule).profileData.experience = [experience]

            const wrapper = await mountCollapsedExperience()

            await wrapper.vm.$nextTick()

            const card = wrapper.find('.mission-card')
            let expectedExpanded = false

            // Property: State should toggle correctly through a sequence of clicks
            for (const shouldClick of clickSequence) {
              if (shouldClick) {
                await card.get('button').trigger('click')
                await wrapper.vm.$nextTick()
                expectedExpanded = !expectedExpanded
              }

              // Verify state matches expected
              if (expectedExpanded) {
                expect(card.classes()).toContain('mission-card--expanded')
                expect(card.find('.mission-card__body').exists()).toBe(true)
              } else {
                expect(card.classes()).not.toContain('mission-card--expanded')
                expect(card.find('.mission-card__body').exists()).toBe(false)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should display responsibilities when expanded', async () => {
      await fc.assert(
        fc.asyncProperty(experienceArbitrary, async experience => {
          const profileModule = await import('@/data/profile')
          vi.mocked(profileModule).profileData.experience = [experience]

          const wrapper = await mountCollapsedExperience()

          await wrapper.vm.$nextTick()

          const card = wrapper.find('.mission-card')

          // Initially collapsed - no responsibilities visible
          expect(card.find('.sci-list').exists()).toBe(false)

          // Click to expand
          await card.get('button').trigger('click')
          await wrapper.vm.$nextTick()

          // Property: When expanded, all responsibilities should be visible
          const responsibilitiesList = card.find('.sci-list')
          expect(responsibilitiesList.exists()).toBe(true)

          const responsibilityItems = responsibilitiesList.findAll('li')
          expect(responsibilityItems.length).toBe(experience.responsibilities.length)

          // Verify each responsibility is rendered
          for (let i = 0; i < experience.responsibilities.length; i++) {
            expect(responsibilityItems[i].text().trim()).toBe(experience.responsibilities[i].trim())
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should display achievements when expanded and available', async () => {
      await fc.assert(
        fc.asyncProperty(
          experienceArbitrary.filter(exp => exp.achievements !== undefined),
          async experience => {
            const profileModule = await import('@/data/profile')
            vi.mocked(profileModule).profileData.experience = [experience]

            const wrapper = await mountCollapsedExperience()

            await wrapper.vm.$nextTick()

            const card = wrapper.find('.mission-card')

            // Click to expand
            await card.get('button').trigger('click')
            await wrapper.vm.$nextTick()

            // Property: When expanded and achievements exist, they should be visible
            if (experience.achievements && experience.achievements.length > 0) {
              const achievementsSection = card.find('.mission-card__metrics')
              expect(achievementsSection.exists()).toBe(true)

              const achievementCards = achievementsSection.findAll('.mission-metric')
              expect(achievementCards.length).toBe(experience.achievements.length)

              // Verify each achievement is rendered correctly
              for (let i = 0; i < experience.achievements.length; i++) {
                const achievementCard = achievementCards[i]
                const achievement = experience.achievements[i]

                const valueElement = achievementCard.find('strong')
                const metricElement = achievementCard.find('span')

                expect(valueElement.text().trim()).toBe(String(achievement.value).trim())
                expect(metricElement.text().trim()).toBe(achievement.metric.trim())
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('切换时更新展开按钮的操作提示', async () => {
      await fc.assert(
        fc.asyncProperty(experienceArbitrary, async experience => {
          const profileModule = await import('@/data/profile')
          vi.mocked(profileModule).profileData.experience = [experience]

          const wrapper = await mountCollapsedExperience()

          await wrapper.vm.$nextTick()

          const card = wrapper.find('.mission-card')
          const expandBtn = card.find('.mission-card__toggle')

          // Property: Initially, button should not have rotated class
          expect(expandBtn.text()).toBe('EXPAND')

          // Click to expand
          await card.get('button').trigger('click')
          await wrapper.vm.$nextTick()

          // Property: When expanded, button should have rotated class
          expect(expandBtn.text()).toBe('COLLAPSE')

          // Click to collapse
          await card.get('button').trigger('click')
          await wrapper.vm.$nextTick()

          // Property: When collapsed again, button should not have rotated class
          expect(expandBtn.text()).toBe('EXPAND')
        }),
        { numRuns: 100 }
      )
    })
  })
})
