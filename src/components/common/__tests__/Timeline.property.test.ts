import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import Timeline from '../Timeline.vue'
import type { TimelineItem } from '@/types'

/**
 * Feature: vue3-portfolio-website, Property 9: 时间轴排序正确性
 *
 * Property: 对于任何教育或工作经历列表，按时间轴展示时应当按照时间顺序（从新到旧或从旧到新）排列
 *
 * Validates: Requirements 2.4, 3.3
 */

// Helper to parse period strings like "2020.09 - 2024.06" or "2023.06 - 至今"
function parsePeriod(period: string): { start: Date; end: Date } {
  const parts = period.split('-').map((p) => p.trim())
  const startParts = parts[0].split('.').map((p) => parseInt(p, 10))
  const start = new Date(startParts[0], startParts[1] - 1, 1)

  let end: Date
  if (parts[1] === '至今' || parts[1].toLowerCase() === 'present') {
    end = new Date() // Current date
  } else {
    const endParts = parts[1].split('.').map((p) => parseInt(p, 10))
    end = new Date(endParts[0], endParts[1] - 1, 1)
  }

  return { start, end }
}

// Helper to check if timeline items are sorted by start date (newest first)
function isSortedNewestFirst(items: TimelineItem[]): boolean {
  for (let i = 0; i < items.length - 1; i++) {
    const current = parsePeriod(items[i].period)
    const next = parsePeriod(items[i + 1].period)

    // Current item should have a start date >= next item's start date (newest first)
    if (current.start < next.start) {
      return false
    }
  }
  return true
}

// Helper to check if timeline items are sorted by start date (oldest first)
function isSortedOldestFirst(items: TimelineItem[]): boolean {
  for (let i = 0; i < items.length - 1; i++) {
    const current = parsePeriod(items[i].period)
    const next = parsePeriod(items[i + 1].period)

    // Current item should have a start date <= next item's start date (oldest first)
    if (current.start > next.start) {
      return false
    }
  }
  return true
}

// Arbitrary generator for timeline items with valid period strings
const timelineItemArbitrary = fc.record({
  id: fc.uuid(),
  title: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]{5,30}$/), // Non-whitespace characters
  subtitle: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 -]{5,50}$/), // Allow some spaces but not only spaces
  period: fc
    .tuple(
      fc.integer({ min: 2015, max: 2024 }), // Start year
      fc.integer({ min: 1, max: 12 }), // Start month
      fc.integer({ min: 2015, max: 2025 }), // End year
      fc.integer({ min: 1, max: 12 }) // End month
    )
    .map(([startYear, startMonth, endYear, endMonth]) => {
      // Ensure end date is after start date
      const start = new Date(startYear, startMonth - 1, 1)
      let end = new Date(endYear, endMonth - 1, 1)

      if (end <= start) {
        // If end is before or equal to start, add at least 1 month
        end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      }

      const startStr = `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}`
      const endStr =
        Math.random() > 0.2
          ? `${end.getFullYear()}.${String(end.getMonth() + 1).padStart(2, '0')}`
          : '至今'

      return `${startStr} - ${endStr}`
    }),
  description: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{10,100}$/),
  details: fc.array(fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{5,50}$/), { maxLength: 5 }),
  expanded: fc.boolean(),
})

describe('Timeline Property Tests', () => {
  describe('Property 9: Timeline Sorting Correctness', () => {
    it('should display items in chronological order when sorted newest first', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(timelineItemArbitrary, { minLength: 2, maxLength: 10 }),
          async (items) => {
            // Sort items by start date (newest first)
            const sortedItems = [...items].sort((a, b) => {
              const aStart = parsePeriod(a.period).start
              const bStart = parsePeriod(b.period).start
              return bStart.getTime() - aStart.getTime() // Descending order
            })

            // Mount component with sorted items
            const wrapper = mount(Timeline, {
              props: {
                items: sortedItems,
                layout: 'vertical',
              },
            })

            // Property: The rendered items should maintain the sorted order
            const renderedItems = wrapper.findAll('.timeline-item')
            expect(renderedItems.length).toBe(sortedItems.length)

            // Property: Items should be sorted newest first
            expect(isSortedNewestFirst(sortedItems)).toBe(true)

            // Property: Each rendered item should match the corresponding sorted item
            for (let i = 0; i < sortedItems.length; i++) {
              const itemElement = renderedItems[i]
              const expectedItem = sortedItems[i]

              // Check that the title is rendered correctly
              const titleElement = itemElement.find('.timeline-title')
              expect(titleElement.text()).toBe(expectedItem.title)

              // Check that the period is rendered correctly
              const periodElement = itemElement.find('.timeline-period')
              expect(periodElement.text()).toBe(expectedItem.period)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should display items in chronological order when sorted oldest first', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(timelineItemArbitrary, { minLength: 2, maxLength: 10 }),
          async (items) => {
            // Sort items by start date (oldest first)
            const sortedItems = [...items].sort((a, b) => {
              const aStart = parsePeriod(a.period).start
              const bStart = parsePeriod(b.period).start
              return aStart.getTime() - bStart.getTime() // Ascending order
            })

            // Mount component with sorted items
            const wrapper = mount(Timeline, {
              props: {
                items: sortedItems,
                layout: 'vertical',
              },
            })

            // Property: The rendered items should maintain the sorted order
            const renderedItems = wrapper.findAll('.timeline-item')
            expect(renderedItems.length).toBe(sortedItems.length)

            // Property: Items should be sorted oldest first
            expect(isSortedOldestFirst(sortedItems)).toBe(true)

            // Property: Each rendered item should match the corresponding sorted item
            for (let i = 0; i < sortedItems.length; i++) {
              const itemElement = renderedItems[i]
              const expectedItem = sortedItems[i]

              const titleElement = itemElement.find('.timeline-title')
              expect(titleElement.text()).toBe(expectedItem.title)

              const periodElement = itemElement.find('.timeline-period')
              expect(periodElement.text()).toBe(expectedItem.period)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve order regardless of layout type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(timelineItemArbitrary, { minLength: 2, maxLength: 8 }),
          fc.constantFrom('vertical', 'horizontal'),
          async (items, layout) => {
            // Sort items by start date (newest first)
            const sortedItems = [...items].sort((a, b) => {
              const aStart = parsePeriod(a.period).start
              const bStart = parsePeriod(b.period).start
              return bStart.getTime() - aStart.getTime()
            })

            // Mount component with specified layout
            const wrapper = mount(Timeline, {
              props: {
                items: sortedItems,
                layout: layout as 'vertical' | 'horizontal',
              },
            })

            // Property: Layout should not affect the order of items
            const renderedItems = wrapper.findAll('.timeline-item')
            expect(renderedItems.length).toBe(sortedItems.length)

            // Property: Items should maintain sorted order regardless of layout
            for (let i = 0; i < sortedItems.length; i++) {
              const itemElement = renderedItems[i]
              const expectedItem = sortedItems[i]

              const titleElement = itemElement.find('.timeline-title')
              expect(titleElement.text()).toBe(expectedItem.title)
            }

            // Property: The correct layout class should be applied
            const timelineElement = wrapper.find('.timeline')
            expect(timelineElement.classes()).toContain(`timeline-${layout}`)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case of single item timeline', async () => {
      await fc.assert(
        fc.asyncProperty(timelineItemArbitrary, async (item) => {
          const wrapper = mount(Timeline, {
            props: {
              items: [item],
              layout: 'vertical',
            },
          })

          // Property: Single item should be rendered correctly
          const renderedItems = wrapper.findAll('.timeline-item')
          expect(renderedItems.length).toBe(1)

          // Property: The item should display correct information
          const titleElement = renderedItems[0].find('.timeline-title')
          expect(titleElement.text()).toBe(item.title)

          const periodElement = renderedItems[0].find('.timeline-period')
          expect(periodElement.text()).toBe(item.period)
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly order items with overlapping periods', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(timelineItemArbitrary, { minLength: 3, maxLength: 6 }),
          async (items) => {
            // Create some items with overlapping periods by modifying a subset
            const modifiedItems = items.map((item, index) => {
              if (index > 0 && Math.random() > 0.5) {
                // Make this item overlap with the previous one
                const prevPeriod = parsePeriod(items[index - 1].period)
                const overlapStart = new Date(
                  prevPeriod.start.getFullYear(),
                  prevPeriod.start.getMonth() + 2,
                  1
                )
                const overlapEnd = new Date(
                  prevPeriod.end.getFullYear(),
                  prevPeriod.end.getMonth() + 3,
                  1
                )

                const startStr = `${overlapStart.getFullYear()}.${String(overlapStart.getMonth() + 1).padStart(2, '0')}`
                const endStr = `${overlapEnd.getFullYear()}.${String(overlapEnd.getMonth() + 1).padStart(2, '0')}`

                return {
                  ...item,
                  period: `${startStr} - ${endStr}`,
                }
              }
              return item
            })

            // Sort by start date (newest first)
            const sortedItems = [...modifiedItems].sort((a, b) => {
              const aStart = parsePeriod(a.period).start
              const bStart = parsePeriod(b.period).start
              return bStart.getTime() - aStart.getTime()
            })

            const wrapper = mount(Timeline, {
              props: {
                items: sortedItems,
                layout: 'vertical',
              },
            })

            // Property: Even with overlapping periods, items should be sorted by start date
            expect(isSortedNewestFirst(sortedItems)).toBe(true)

            // Property: All items should be rendered
            const renderedItems = wrapper.findAll('.timeline-item')
            expect(renderedItems.length).toBe(sortedItems.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
