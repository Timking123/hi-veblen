import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the echarts module BEFORE other imports
vi.mock('echarts', () => {
  class LinearGradient {
    type = 'linear'
    x: number
    y: number
    x2: number
    y2: number
    colorStops: any[]

    constructor(x1: number, y1: number, x2: number, y2: number, colorStops: any[]) {
      this.x = x1
      this.y = y1
      this.x2 = x2
      this.y2 = y2
      this.colorStops = colorStops
    }
  }

  class RadialGradient {
    type = 'radial'
    x: number
    y: number
    r: number
    colorStops: any[]

    constructor(x: number, y: number, r: number, colorStops: any[]) {
      this.x = x
      this.y = y
      this.r = r
      this.colorStops = colorStops
    }
  }

  return {
    init: vi.fn(),
    graphic: {
      LinearGradient,
      RadialGradient,
    },
  }
})

import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import CourseChart from '../CourseChart.vue'
import * as echarts from 'echarts'

/**
 * Feature: vue3-portfolio-website, Property 4: 数据可视化准确性
 *
 * Property: 对于任何技能数据集合，图表组件渲染的数据点数量应当等于输入数据的数量，且每个数据点的值应当与输入数据对应
 *
 * Validates: Requirements 2.2, 3.4, 4.2
 */

// Mock ECharts to capture the options passed to it
let capturedOptions: echarts.EChartsOption | null = null
let mockSetOption: ReturnType<typeof vi.fn>
let mockOn: ReturnType<typeof vi.fn>
let mockResize: ReturnType<typeof vi.fn>
let mockDispose: ReturnType<typeof vi.fn>

beforeEach(() => {
  capturedOptions = null
  
  // Create fresh mock functions for each test
  mockSetOption = vi.fn((options: echarts.EChartsOption) => {
    capturedOptions = options
  })
  mockOn = vi.fn()
  mockResize = vi.fn()
  mockDispose = vi.fn()
  
  // Configure the mocked init function to return our mock chart instance
  const mockInit = echarts.init as ReturnType<typeof vi.fn>
  mockInit.mockReturnValue({
    setOption: mockSetOption,
    on: mockOn,
    resize: mockResize,
    dispose: mockDispose,
  } as any)
})

// Arbitrary generator for course data
const courseArbitrary = fc.record({
  name: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{3,20}$/),
  score: fc.integer({ min: 0, max: 100 }),
})

describe('CourseChart Property Tests', () => {
  describe('Property 4: Data Visualization Accuracy', () => {
    it('should render the same number of data points as input courses for bar chart', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(courseArbitrary, { minLength: 1, maxLength: 15 }),
          async (courses) => {
            // Mount component with bar chart type
            const wrapper = mount(CourseChart, {
              props: {
                courses,
                type: 'bar',
              },
            })

            // Wait for component to mount and initialize chart
            await wrapper.vm.$nextTick()

            // Property: The chart should be initialized
            expect(mockSetOption).toHaveBeenCalled()
            expect(capturedOptions).not.toBeNull()

            // Property: The number of data points should equal the number of input courses
            const xAxisData = (capturedOptions as any)?.xAxis?.data
            const seriesData = (capturedOptions as any)?.series?.[0]?.data

            expect(xAxisData).toBeDefined()
            expect(seriesData).toBeDefined()
            expect(xAxisData.length).toBe(courses.length)
            expect(seriesData.length).toBe(courses.length)

            // Property: Each data point value should match the corresponding input course score
            for (let i = 0; i < courses.length; i++) {
              expect(xAxisData[i]).toBe(courses[i].name)
              expect(seriesData[i]).toBe(courses[i].score)
            }

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should render the same number of data points as input courses for radar chart', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(courseArbitrary, { minLength: 3, maxLength: 12 }),
          async (courses) => {
            // Mount component with radar chart type
            const wrapper = mount(CourseChart, {
              props: {
                courses,
                type: 'radar',
              },
            })

            // Wait for component to mount and initialize chart
            await wrapper.vm.$nextTick()

            // Property: The chart should be initialized
            expect(mockSetOption).toHaveBeenCalled()
            expect(capturedOptions).not.toBeNull()

            // Property: The number of indicators should equal the number of input courses
            const indicators = (capturedOptions as any)?.radar?.indicator
            const seriesData = (capturedOptions as any)?.series?.[0]?.data?.[0]?.value

            expect(indicators).toBeDefined()
            expect(seriesData).toBeDefined()
            expect(indicators.length).toBe(courses.length)
            expect(seriesData.length).toBe(courses.length)

            // Property: Each indicator should match the corresponding input course
            for (let i = 0; i < courses.length; i++) {
              expect(indicators[i].name).toBe(courses[i].name)
              expect(indicators[i].max).toBe(100)
              expect(seriesData[i]).toBe(courses[i].score)
            }

            wrapper.unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve data accuracy when switching between chart types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(courseArbitrary, { minLength: 3, maxLength: 10 }),
          async (courses) => {
            // Mount component with bar chart initially
            const wrapper = mount(CourseChart, {
              props: {
                courses,
                type: 'bar',
              },
            })

            await wrapper.vm.$nextTick()

            // Capture bar chart data
            const barSeriesData = (capturedOptions as any)?.series?.[0]?.data
            expect(barSeriesData.length).toBe(courses.length)

            // Switch to radar chart
            await wrapper.setProps({ type: 'radar' })
            await wrapper.vm.$nextTick()

            // Property: Data should remain accurate after switching chart type
            const radarSeriesData = (capturedOptions as any)?.series?.[0]?.data?.[0]?.value
            expect(radarSeriesData.length).toBe(courses.length)

            // Property: The data values should be the same in both chart types
            for (let i = 0; i < courses.length; i++) {
              expect(radarSeriesData[i]).toBe(courses[i].score)
              expect(radarSeriesData[i]).toBe(barSeriesData[i])
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case of single course', async () => {
      await fc.assert(
        fc.asyncProperty(courseArbitrary, async (course) => {
          const wrapper = mount(CourseChart, {
            props: {
              courses: [course],
              type: 'bar',
            },
          })

          await wrapper.vm.$nextTick()

          // Property: Single course should be rendered correctly
          const xAxisData = (capturedOptions as any)?.xAxis?.data
          const seriesData = (capturedOptions as any)?.series?.[0]?.data

          expect(xAxisData.length).toBe(1)
          expect(seriesData.length).toBe(1)
          expect(xAxisData[0]).toBe(course.name)
          expect(seriesData[0]).toBe(course.score)
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly map all score values within valid range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(courseArbitrary, { minLength: 2, maxLength: 10 }),
          async (courses) => {
            const wrapper = mount(CourseChart, {
              props: {
                courses,
                type: 'bar',
              },
            })

            await wrapper.vm.$nextTick()

            const seriesData = (capturedOptions as any)?.series?.[0]?.data

            // Property: All scores should be within the valid range [0, 100]
            for (let i = 0; i < courses.length; i++) {
              expect(seriesData[i]).toBeGreaterThanOrEqual(0)
              expect(seriesData[i]).toBeLessThanOrEqual(100)
              expect(seriesData[i]).toBe(courses[i].score)
            }

            // Property: Y-axis should have appropriate min/max values
            const yAxis = (capturedOptions as any)?.yAxis
            expect(yAxis.min).toBe(0)
            expect(yAxis.max).toBe(100)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain data order from input to visualization', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(courseArbitrary, { minLength: 3, maxLength: 10 }),
          async (courses) => {
            const wrapper = mount(CourseChart, {
              props: {
                courses,
                type: 'bar',
              },
            })

            await wrapper.vm.$nextTick()

            const xAxisData = (capturedOptions as any)?.xAxis?.data
            const seriesData = (capturedOptions as any)?.series?.[0]?.data

            // Property: The order of courses in the chart should match the input order
            for (let i = 0; i < courses.length; i++) {
              expect(xAxisData[i]).toBe(courses[i].name)
              expect(seriesData[i]).toBe(courses[i].score)
            }

            // Property: If we reverse the input, the chart should also reverse
            const reversedCourses = [...courses].reverse()
            await wrapper.setProps({ courses: reversedCourses })
            await wrapper.vm.$nextTick()

            const newXAxisData = (capturedOptions as any)?.xAxis?.data
            const newSeriesData = (capturedOptions as any)?.series?.[0]?.data

            for (let i = 0; i < reversedCourses.length; i++) {
              expect(newXAxisData[i]).toBe(reversedCourses[i].name)
              expect(newSeriesData[i]).toBe(reversedCourses[i].score)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should update visualization when course data changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(courseArbitrary, { minLength: 2, maxLength: 8 }),
          fc.array(courseArbitrary, { minLength: 2, maxLength: 8 }),
          async (initialCourses, updatedCourses) => {
            const wrapper = mount(CourseChart, {
              props: {
                courses: initialCourses,
                type: 'bar',
              },
            })

            await wrapper.vm.$nextTick()

            // Verify initial data
            let seriesData = (capturedOptions as any)?.series?.[0]?.data
            expect(seriesData.length).toBe(initialCourses.length)

            // Update courses
            await wrapper.setProps({ courses: updatedCourses })
            await wrapper.vm.$nextTick()

            // Property: Chart should reflect the updated data
            seriesData = (capturedOptions as any)?.series?.[0]?.data
            expect(seriesData.length).toBe(updatedCourses.length)

            for (let i = 0; i < updatedCourses.length; i++) {
              expect(seriesData[i]).toBe(updatedCourses[i].score)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
