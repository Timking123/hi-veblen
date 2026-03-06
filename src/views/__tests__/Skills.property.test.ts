import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import Skills from '../Skills.vue'
import type { Skill, Profile } from '@/types'

/**
 * Feature: vue3-portfolio-website, Property 5: 技能分类正确性
 *
 * Property: 对于任何技能列表，按类别分组后，每个分组中的所有技能的 category 字段应当与该分组的类别名称一致
 *
 * Validates: Requirements 4.1
 */

/**
 * Feature: vue3-portfolio-website, Property 6: 技能筛选功能正确性
 *
 * Property: 对于任何选中的技能标签，筛选后显示的所有项目都应当在其 skills 数组中包含该技能
 *
 * Validates: Requirements 4.5
 */

/**
 * Feature: vue3-portfolio-website, Property 8: 悬停状态管理正确性
 *
 * Property: 对于任何支持悬停交互的元素（课程项、技能标签），鼠标悬停时应当显示额外信息或改变视觉状态
 *
 * Validates: Requirements 2.3, 4.3
 */

// Mock ECharts to avoid canvas rendering issues in tests
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

// Mock the profile data module with a reactive object
vi.mock('@/data/profile', () => {
  const mockData: Profile = {
    name: 'Test User',
    title: 'Test Title',
    phone: '+86 12345678901',
    email: 'test@example.com',
    avatar: '/test.jpg',
    summary: 'Test summary',
    jobIntentions: [],
    education: [],
    experience: [],
    skills: [],
    campusExperience: [],
  }
  return {
    profileData: mockData,
    default: mockData,
  }
})

// Import the mocked profile data after mocking
import { profileData as mockProfileData } from '@/data/profile'

// Arbitrary generator for skills
const skillArbitrary = fc.record({
  name: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5.+# ]{2,20}$/),
  level: fc.integer({ min: 0, max: 100 }),
  category: fc.constantFrom('frontend', 'backend', 'tools', 'other'),
  experience: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5,，、 ]{10,100}$/),
  projects: fc.array(fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{3,30}$/), {
    minLength: 0,
    maxLength: 5,
  }),
}).map((skill) => ({
  ...skill,
  name: skill.name.trim() || 'Skill', // Trim and provide default if empty
  experience: skill.experience.trim() || 'Experience', // Trim experience
  projects: skill.projects.map((p) => p.trim()).filter((p) => p.length > 0), // Trim projects
}))

describe('Skills Property Tests', () => {
  beforeEach(() => {
    // Reset mock profile data before each test
    mockProfileData.skills = []
  })

  describe('Property 5: Skill Categorization Correctness', () => {
    it('should group skills by category correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(skillArbitrary, { minLength: 4, maxLength: 20 }),
          async (skills) => {
            // Set the mock profile data
            mockProfileData.skills = skills

            // Mount component
            const wrapper = mount(Skills)

            // Wait for component to render
            await wrapper.vm.$nextTick()

            // Property: Each category section should only contain skills of that category
            const categoryMap: Record<string, string> = {
              frontend: '前端技能',
              backend: '后端技能',
              tools: '工具与其他',
              other: '其他技能',
            }

            // Group skills by category manually
            const groupedSkills: Record<string, Skill[]> = {
              frontend: [],
              backend: [],
              tools: [],
              other: [],
            }

            skills.forEach((skill) => {
              groupedSkills[skill.category].push(skill)
            })

            // Check each category section
            const categorySections = wrapper.findAll('.category-section')

            categorySections.forEach((section) => {
              const titleElement = section.find('.category-title')
              const categoryTitle = titleElement.text()

              // Find which category this section represents
              const categoryKey = Object.keys(categoryMap).find(
                (key) => categoryMap[key] === categoryTitle
              )

              if (categoryKey) {
                // Get all skill tags in this section
                const skillTags = section.findAll('.skill-tag')

                // Property: All skills in this section should have the correct category
                skillTags.forEach((tag) => {
                  const skillName = tag.find('.skill-name').text()
                  // Find all skills with this name in the input
                  const skillsWithName = skills.filter((s) => s.name === skillName)
                  
                  // At least one of the skills with this name should have the correct category
                  const hasCorrectCategory = skillsWithName.some((s) => s.category === categoryKey)
                  expect(hasCorrectCategory).toBe(true)
                })

                // Property: The number of skills in this section should match the grouped count
                const expectedCount = groupedSkills[categoryKey].length
                if (expectedCount > 0) {
                  expect(skillTags.length).toBe(expectedCount)
                }
              }
            })

            // Property: All skills should be rendered exactly once (or as many times as they appear in the input)
            const allSkillTags = wrapper.findAll('.skill-tag')
            const renderedSkillNames = allSkillTags.map((tag) =>
              tag.find('.skill-name').text()
            )

            // Count how many times each skill name appears in the input
            const inputNameCounts = new Map<string, number>()
            skills.forEach((skill) => {
              inputNameCounts.set(skill.name, (inputNameCounts.get(skill.name) || 0) + 1)
            })

            // Check that each skill name appears the correct number of times in the rendered output
            inputNameCounts.forEach((expectedCount, skillName) => {
              const actualCount = renderedSkillNames.filter((name) => name === skillName).length
              expect(actualCount).toBe(expectedCount)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not display empty category sections', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(skillArbitrary, { minLength: 1, maxLength: 10 }),
          async (skills) => {
            // Filter to only include one category
            const singleCategorySkills = skills.map((skill) => ({
              ...skill,
              category: 'frontend' as const,
            }))

            mockProfileData.skills = singleCategorySkills

            const wrapper = mount(Skills)

            await wrapper.vm.$nextTick()

            // Property: Only categories with skills should be displayed
            const categorySections = wrapper.findAll('.category-section')

            // Since all skills are frontend, we should only see one category section
            expect(categorySections.length).toBeGreaterThan(0)

            // Property: Each displayed category should have at least one skill
            categorySections.forEach((section) => {
              const skillTags = section.findAll('.skill-tag')
              expect(skillTags.length).toBeGreaterThan(0)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain category integrity when skills have same names in different categories', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]{3,15}$/),
          fc.integer({ min: 50, max: 100 }),
          fc.integer({ min: 50, max: 100 }),
          async (skillName, level1, level2) => {
            // Create two skills with the same name but different categories
            const skills: Skill[] = [
              {
                name: skillName,
                level: level1,
                category: 'frontend',
                experience: 'Frontend experience',
                projects: ['Project A'],
              },
              {
                name: skillName,
                level: level2,
                category: 'backend',
                experience: 'Backend experience',
                projects: ['Project B'],
              },
            ]

            mockProfileData.skills = skills

            const wrapper = mount(Skills)

            await wrapper.vm.$nextTick()

            // Property: Each skill should appear in its correct category section
            const categorySections = wrapper.findAll('.category-section')

            let frontendFound = false
            let backendFound = false

            categorySections.forEach((section) => {
              const titleElement = section.find('.category-title')
              const categoryTitle = titleElement.text()

              const skillTags = section.findAll('.skill-tag')
              skillTags.forEach((tag) => {
                const name = tag.find('.skill-name').text()
                if (name === skillName) {
                  if (categoryTitle === '前端技能') {
                    frontendFound = true
                  } else if (categoryTitle === '后端技能') {
                    backendFound = true
                  }
                }
              })
            })

            // Property: Both instances should be found in their respective categories
            expect(frontendFound).toBe(true)
            expect(backendFound).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 6: Skill Filtering Correctness', () => {
    it('should filter projects correctly when a skill is selected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(skillArbitrary, { minLength: 3, maxLength: 10 }),
          async (skills) => {
            // Ensure at least one skill has projects
            const skillsWithProjects = skills.map((skill, index) => ({
              ...skill,
              projects:
                index === 0 || Math.random() > 0.5
                  ? skill.projects.length > 0
                    ? skill.projects
                    : ['Test Project']
                  : skill.projects,
            }))

            mockProfileData.skills = skillsWithProjects

            const wrapper = mount(Skills)

            await wrapper.vm.$nextTick()

            // Find a skill with projects to test
            const skillWithProjects = skillsWithProjects.find((s) => s.projects.length > 0)

            if (skillWithProjects) {
              // Find and click the skill tag
              const allSkillTags = wrapper.findAll('.skill-tag')
              const targetTag = allSkillTags.find(
                (tag) => tag.find('.skill-name').text() === skillWithProjects.name
              )

              if (targetTag) {
                await targetTag.trigger('click')
                await wrapper.vm.$nextTick()

                // Property: Filtered projects section should be visible
                const filteredSection = wrapper.find('.filtered-projects')
                expect(filteredSection.exists()).toBe(true)

                // Property: All displayed projects should be in the selected skill's project list
                const projectCards = wrapper.findAll('.project-card')
                projectCards.forEach((card) => {
                  const projectName = card.find('.project-name').text()
                  expect(skillWithProjects.projects).toContain(projectName)
                })

                // Property: The number of displayed projects should match the skill's project count
                expect(projectCards.length).toBe(skillWithProjects.projects.length)

                // Property: Clicking the same skill again should clear the filter
                await targetTag.trigger('click')
                await wrapper.vm.$nextTick()

                const filteredSectionAfter = wrapper.find('.filtered-projects')
                expect(filteredSectionAfter.exists()).toBe(false)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show correct projects when switching between skills', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.record({
              name: fc.constant('Skill A'),
              level: fc.integer({ min: 70, max: 100 }),
              category: fc.constant('frontend' as const),
              experience: fc.constant('Experience A'),
              projects: fc.constant(['Project 1', 'Project 2'] as string[]),
            }),
            fc.record({
              name: fc.constant('Skill B'),
              level: fc.integer({ min: 70, max: 100 }),
              category: fc.constant('backend' as const),
              experience: fc.constant('Experience B'),
              projects: fc.constant(['Project 3', 'Project 4'] as string[]),
            })
          ),
          async ([skillA, skillB]) => {
            mockProfileData.skills = [skillA, skillB]

            const wrapper = mount(Skills)

            await wrapper.vm.$nextTick()

            // Click first skill
            const allSkillTags = wrapper.findAll('.skill-tag')
            const skillATag = allSkillTags.find(
              (tag) => tag.find('.skill-name').text() === 'Skill A'
            )

            if (skillATag) {
              await skillATag.trigger('click')
              await wrapper.vm.$nextTick()

              // Property: Should show Skill A's projects
              let projectCards = wrapper.findAll('.project-card')
              let projectNames = projectCards.map((card) => card.find('.project-name').text())
              expect(projectNames).toEqual(['Project 1', 'Project 2'])

              // Click second skill
              const skillBTag = allSkillTags.find(
                (tag) => tag.find('.skill-name').text() === 'Skill B'
              )

              if (skillBTag) {
                await skillBTag.trigger('click')
                await wrapper.vm.$nextTick()

                // Property: Should now show Skill B's projects
                projectCards = wrapper.findAll('.project-card')
                projectNames = projectCards.map((card) => card.find('.project-name').text())
                expect(projectNames).toEqual(['Project 3', 'Project 4'])
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle skills with no projects gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]{3,15}$/),
              level: fc.integer({ min: 50, max: 100 }),
              category: fc.constantFrom('frontend', 'backend', 'tools', 'other'),
              experience: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{10,50}$/),
              projects: fc.constant([] as string[]), // No projects
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (skills) => {
            mockProfileData.skills = skills

            const wrapper = mount(Skills)

            await wrapper.vm.$nextTick()

            // Click a skill with no projects
            const allSkillTags = wrapper.findAll('.skill-tag')
            if (allSkillTags.length > 0) {
              await allSkillTags[0].trigger('click')
              await wrapper.vm.$nextTick()

              // Property: Filtered section should still appear
              const filteredSection = wrapper.find('.filtered-projects')
              expect(filteredSection.exists()).toBe(true)

              // Property: No project cards should be displayed
              const projectCards = wrapper.findAll('.project-card')
              expect(projectCards.length).toBe(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 8: Hover State Management Correctness', () => {
    it('should display skill details on hover', async () => {
      await fc.assert(
        fc.asyncProperty(skillArbitrary, async (skill) => {
          mockProfileData.skills = [skill]

          const wrapper = mount(Skills)

          await wrapper.vm.$nextTick()

          // Property: Detail card should not be visible initially
          let detailCard = wrapper.find('.skill-detail-card')
          expect(detailCard.exists()).toBe(false)

          // Find and hover over the skill tag
          const skillTag = wrapper.find('.skill-tag')
          await skillTag.trigger('mouseenter')
          await wrapper.vm.$nextTick()

          // Property: Detail card should be visible after hover
          detailCard = wrapper.find('.skill-detail-card')
          expect(detailCard.exists()).toBe(true)

          // Property: Detail card should contain skill information
          const detailTitle = detailCard.find('h3')
          expect(detailTitle.text()).toBe(skill.name)

          // Property: Detail card should show skill level
          const detailValues = detailCard.findAll('.detail-value')
          const levelText = detailValues[0].text()
          expect(levelText).toContain(skill.level.toString())

          // Property: Detail card should show experience
          const experienceText = detailValues[1].text()
          expect(experienceText).toBe(skill.experience)

          // Property: Detail card should disappear on mouse leave
          await skillTag.trigger('mouseleave')
          await wrapper.vm.$nextTick()

          detailCard = wrapper.find('.skill-detail-card')
          expect(detailCard.exists()).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should update detail card when hovering over different skills', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(skillArbitrary, skillArbitrary),
          async ([skill1, skill2]) => {
            // Ensure skills have different names
            const modifiedSkill2 = {
              ...skill2,
              name: skill1.name + '_different',
            }

            mockProfileData.skills = [skill1, modifiedSkill2]

            const wrapper = mount(Skills)

            await wrapper.vm.$nextTick()

            const skillTags = wrapper.findAll('.skill-tag')

            // Find the skill tags by name
            const skill1Tag = skillTags.find(
              (tag) => tag.find('.skill-name').text() === skill1.name
            )
            const skill2Tag = skillTags.find(
              (tag) => tag.find('.skill-name').text() === modifiedSkill2.name
            )

            if (skill1Tag && skill2Tag) {
              // Hover over first skill
              await skill1Tag.trigger('mouseenter')
              await wrapper.vm.$nextTick()

              let detailCard = wrapper.find('.skill-detail-card')
              expect(detailCard.exists()).toBe(true)
              let detailTitle = detailCard.find('h3')
              expect(detailTitle.text()).toBe(skill1.name)

              // Hover over second skill without leaving first
              await skill2Tag.trigger('mouseenter')
              await wrapper.vm.$nextTick()

              // Property: Detail card should update to show second skill
              detailCard = wrapper.find('.skill-detail-card')
              expect(detailCard.exists()).toBe(true)
              detailTitle = detailCard.find('h3')
              expect(detailTitle.text()).toBe(modifiedSkill2.name)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show projects in detail card when skill has projects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]{3,15}$/),
            level: fc.integer({ min: 50, max: 100 }),
            category: fc.constantFrom('frontend', 'backend', 'tools', 'other'),
            experience: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{10,50}$/),
            projects: fc.array(fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{3,20}$/), {
              minLength: 1,
              maxLength: 5,
            }),
          }).map((skill) => ({
            ...skill,
            name: skill.name.trim() || 'Skill',
            experience: skill.experience.trim() || 'Experience',
            projects: skill.projects.map((p) => p.trim()).filter((p) => p.length > 0),
          })),
          async (skill) => {
            mockProfileData.skills = [skill]

            const wrapper = mount(Skills)

            await wrapper.vm.$nextTick()

            const skillTag = wrapper.find('.skill-tag')
            await skillTag.trigger('mouseenter')
            await wrapper.vm.$nextTick()

            const detailCard = wrapper.find('.skill-detail-card')
            expect(detailCard.exists()).toBe(true)

            // Property: Detail card should show all projects
            const projectTags = detailCard.findAll('.project-tag')
            expect(projectTags.length).toBe(skill.projects.length)

            // Property: Each project should be displayed correctly
            const displayedProjects = projectTags.map((tag) => tag.text())
            skill.projects.forEach((project) => {
              expect(displayedProjects).toContain(project)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
