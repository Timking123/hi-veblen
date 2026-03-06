import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { filterProjects } from '../useProjectFilter'

interface Project {
  id: string
  name: string
  description: string
  period: string
  role: string
  technologies: string[]
  highlights: string[]
  screenshots: string[]
  demoUrl?: string
  sourceUrl?: string
  category: 'work' | 'personal' | 'open-source'
}

interface ProjectFilter {
  technology?: string
  category?: Project['category']
}

const categoryArb = fc.constantFrom<Project['category']>('work', 'personal', 'open-source')

const technologyArb = fc.constantFrom(
  'Vue 3', 'React', 'TypeScript', 'JavaScript', 'Node.js',
  'Python', 'Java', 'Go', 'Rust', 'Docker'
)

const technologiesArb = fc.array(technologyArb, { minLength: 1, maxLength: 8 })
  .map(techs => [...new Set(techs)])

const projectArb: fc.Arbitrary<Project> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  period: fc.constantFrom('2023.01 - 2023.06', '2022.06 - 2023.01'),
  role: fc.constantFrom('Frontend Developer', 'Full Stack Developer'),
  technologies: technologiesArb,
  highlights: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
  screenshots: fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }),
  demoUrl: fc.option(fc.webUrl(), { nil: undefined }),
  sourceUrl: fc.option(fc.webUrl(), { nil: undefined }),
  category: categoryArb,
})

const projectsArb = fc.array(projectArb, { minLength: 0, maxLength: 20 })

const filterArb: fc.Arbitrary<ProjectFilter> = fc.record({
  technology: fc.option(technologyArb, { nil: undefined }),
  category: fc.option(categoryArb, { nil: undefined }),
})

describe('useProjectFilter Property Tests', () => {
  describe('Feature: website-enhancement-v2, Property 12: Project Filter Logic', () => {
    describe('Filter by Technology', () => {
      it('filtered results should only contain projects with the specified technology', () => {
        fc.assert(
          fc.property(projectsArb, technologyArb, (projects, technology) => {
            const filter: ProjectFilter = { technology }
            const result = filterProjects(projects, filter)
            result.forEach(project => {
              const hasTech = project.technologies.some(
                t => t.toLowerCase() === technology.toLowerCase()
              )
              expect(hasTech).toBe(true)
            })
          }),
          { numRuns: 100 }
        )
      })

      it('projects without the specified technology should not appear in results', () => {
        fc.assert(
          fc.property(projectsArb, technologyArb, (projects, technology) => {
            const filter: ProjectFilter = { technology }
            const result = filterProjects(projects, filter)
            const projectsWithoutTech = projects.filter(
              p => !p.technologies.some(t => t.toLowerCase() === technology.toLowerCase())
            )
            projectsWithoutTech.forEach(project => {
              const inResult = result.some(r => r.id === project.id)
              expect(inResult).toBe(false)
            })
          }),
          { numRuns: 100 }
        )
      })

      it('technology filter should be case-insensitive', () => {
        fc.assert(
          fc.property(projectsArb, technologyArb, (projects, technology) => {
            const lowerResult = filterProjects(projects, { technology: technology.toLowerCase() })
            const upperResult = filterProjects(projects, { technology: technology.toUpperCase() })
            const originalResult = filterProjects(projects, { technology })
            expect(lowerResult.length).toBe(originalResult.length)
            expect(upperResult.length).toBe(originalResult.length)
          }),
          { numRuns: 100 }
        )
      })
    })

    describe('Filter by Category', () => {
      it('filtered results should only contain projects of the specified category', () => {
        fc.assert(
          fc.property(projectsArb, categoryArb, (projects, category) => {
            const filter: ProjectFilter = { category }
            const result = filterProjects(projects, filter)
            result.forEach(project => {
              expect(project.category).toBe(category)
            })
          }),
          { numRuns: 100 }
        )
      })

      it('projects of other categories should not appear in results', () => {
        fc.assert(
          fc.property(projectsArb, categoryArb, (projects, category) => {
            const filter: ProjectFilter = { category }
            const result = filterProjects(projects, filter)
            const projectsOtherCategory = projects.filter(p => p.category !== category)
            projectsOtherCategory.forEach(project => {
              const inResult = result.some(r => r.id === project.id)
              expect(inResult).toBe(false)
            })
          }),
          { numRuns: 100 }
        )
      })
    })

    describe('Combined Filter', () => {
      it('combined filter results should satisfy both conditions', () => {
        fc.assert(
          fc.property(projectsArb, technologyArb, categoryArb, (projects, technology, category) => {
            const filter: ProjectFilter = { technology, category }
            const result = filterProjects(projects, filter)
            result.forEach(project => {
              const hasTech = project.technologies.some(
                t => t.toLowerCase() === technology.toLowerCase()
              )
              expect(hasTech).toBe(true)
              expect(project.category).toBe(category)
            })
          }),
          { numRuns: 100 }
        )
      })

      it('combined filter result should be intersection of individual filters', () => {
        fc.assert(
          fc.property(projectsArb, technologyArb, categoryArb, (projects, technology, category) => {
            const techResult = filterProjects(projects, { technology })
            const categoryResult = filterProjects(projects, { category })
            const combinedResult = filterProjects(projects, { technology, category })
            const techIds = new Set(techResult.map(p => p.id))
            const intersection = categoryResult.filter(p => techIds.has(p.id))
            expect(combinedResult.length).toBe(intersection.length)
          }),
          { numRuns: 100 }
        )
      })
    })

    describe('Empty Filter', () => {
      it('empty filter should return all projects', () => {
        fc.assert(
          fc.property(projectsArb, (projects) => {
            const filter: ProjectFilter = {}
            const result = filterProjects(projects, filter)
            expect(result.length).toBe(projects.length)
          }),
          { numRuns: 100 }
        )
      })
    })

    describe('Subset Property', () => {
      it('filtered result length should be less than or equal to original length', () => {
        fc.assert(
          fc.property(projectsArb, filterArb, (projects, filter) => {
            const result = filterProjects(projects, filter)
            expect(result.length).toBeLessThanOrEqual(projects.length)
          }),
          { numRuns: 100 }
        )
      })

      it('every project in result should exist in original list', () => {
        fc.assert(
          fc.property(projectsArb, filterArb, (projects, filter) => {
            const result = filterProjects(projects, filter)
            const originalIds = new Set(projects.map(p => p.id))
            result.forEach(project => {
              expect(originalIds.has(project.id)).toBe(true)
            })
          }),
          { numRuns: 100 }
        )
      })

      it('filtered result should preserve original order', () => {
        fc.assert(
          fc.property(projectsArb, filterArb, (projects, filter) => {
            const result = filterProjects(projects, filter)
            const resultIndices = result.map(p => projects.findIndex(op => op.id === p.id))
            for (let i = 1; i < resultIndices.length; i++) {
              expect(resultIndices[i]).toBeGreaterThan(resultIndices[i - 1])
            }
          }),
          { numRuns: 100 }
        )
      })
    })

    describe('Idempotence', () => {
      it('applying same filter multiple times should yield same result', () => {
        fc.assert(
          fc.property(projectsArb, filterArb, (projects, filter) => {
            const result1 = filterProjects(projects, filter)
            const result2 = filterProjects(projects, filter)
            expect(result1.length).toBe(result2.length)
          }),
          { numRuns: 100 }
        )
      })

      it('filtering result again with same filter should yield same result', () => {
        fc.assert(
          fc.property(projectsArb, filterArb, (projects, filter) => {
            const result1 = filterProjects(projects, filter)
            const result2 = filterProjects(result1, filter)
            expect(result1.length).toBe(result2.length)
          }),
          { numRuns: 100 }
        )
      })
    })

    describe('Edge Cases', () => {
      it('empty project list should return empty result', () => {
        fc.assert(
          fc.property(filterArb, (filter) => {
            const result = filterProjects([], filter)
            expect(result.length).toBe(0)
          }),
          { numRuns: 100 }
        )
      })

      it('non-existent technology filter should return empty result', () => {
        fc.assert(
          fc.property(projectsArb, (projects) => {
            const result = filterProjects(projects, { technology: 'NonExistentTech12345' })
            expect(result.length).toBe(0)
          }),
          { numRuns: 100 }
        )
      })
    })

    describe('Invariants', () => {
      it('filter should not modify original project list', () => {
        fc.assert(
          fc.property(projectsArb, filterArb, (projects, filter) => {
            const originalLength = projects.length
            filterProjects(projects, filter)
            expect(projects.length).toBe(originalLength)
          }),
          { numRuns: 100 }
        )
      })
    })
  })
})
