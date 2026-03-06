/**
 * 内容管理属性测试
 * 
 * 使用属性测试验证内容管理服务的通用正确性属性
 * 
 * **Feature: admin-system, Property 4: 内容数据往返一致性**
 * 
 * 验证需求: 3.1.1, 3.2.1, 3.3.1, 3.4.1, 3.5.1, 3.6.1
 */

import { describe, it, expect } from '@jest/globals'
import * as fc from 'fast-check'
import { initDatabase, closeDatabase } from '../database/init'
import {
  getProfile,
  updateProfile,
  createEducation,
  getEducation,
  updateEducation,
  getEducationList,
  createExperience,
  getExperience,
  createSkill,
  getSkill,
  getSkillList,
  createProject,
  getProject,
  getProjectList,
  createCampus,
  getCampus
} from '../services/content'

describe('内容管理属性测试', () => {
  /**
   * Property 4: 内容数据往返一致性
   * 
   * 对于任意有效的内容数据（个人信息、教育经历、工作经历、技能、项目、校园经历），
   * 保存到数据库后再读取，应该得到等价的数据。
   * 
   * **Validates: Requirements 3.1.1, 3.2.1, 3.3.1, 3.4.1, 3.5.1, 3.6.1**
   */
  describe('Property 4: 内容数据往返一致性', () => {
    describe('个人信息往返一致性', () => {
      it('更新个人信息后读取应该得到相同的数据', () => {
        fc.assert(
          fc.property(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              phone: fc.option(fc.string({ minLength: 11, maxLength: 11 }), { nil: null }),
              email: fc.option(fc.emailAddress(), { nil: null }),
              avatar: fc.option(fc.webUrl(), { nil: null }),
              summary: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
              job_intentions: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 })
            }),
            (profileData) => {
              initDatabase(':memory:')
              try {
                const success = updateProfile(profileData)
                expect(success).toBe(true)

                const retrieved = getProfile()
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  expect(retrieved.name).toBe(profileData.name)
                  expect(retrieved.title).toBe(profileData.title)
                  expect(retrieved.phone).toBe(profileData.phone)
                  expect(retrieved.email).toBe(profileData.email)
                  expect(retrieved.avatar).toBe(profileData.avatar)
                  expect(retrieved.summary).toBe(profileData.summary)
                  expect(retrieved.job_intentions).toEqual(profileData.job_intentions)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('部分更新个人信息应该只修改指定字段', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.string({ minLength: 1, maxLength: 100 }),
            (newName, newTitle) => {
              initDatabase(':memory:')
              try {
                updateProfile({
                  name: '初始姓名',
                  title: '初始职位',
                  email: 'initial@example.com'
                })

                updateProfile({
                  name: newName,
                  title: newTitle
                })

                const retrieved = getProfile()
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  expect(retrieved.name).toBe(newName)
                  expect(retrieved.title).toBe(newTitle)
                  expect(retrieved.email).toBe('initial@example.com')
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('教育经历往返一致性', () => {
      it('创建教育经历后读取应该得到相同的数据', () => {
        fc.assert(
          fc.property(
            fc.record({
              school: fc.string({ minLength: 1, maxLength: 100 }),
              college: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
              major: fc.string({ minLength: 1, maxLength: 100 }),
              period: fc.string({ minLength: 1, maxLength: 50 }),
              rank: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
              honors: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 10 }),
              courses: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 50 }),
                  score: fc.integer({ min: 0, max: 100 })
                }),
                { maxLength: 20 }
              )
            }),
            (educationData) => {
              initDatabase(':memory:')
              try {
                const id = createEducation(educationData)
                expect(id).toBeTruthy()

                const retrieved = getEducation(id)
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  expect(retrieved.school).toBe(educationData.school)
                  expect(retrieved.college).toBe(educationData.college)
                  expect(retrieved.major).toBe(educationData.major)
                  expect(retrieved.period).toBe(educationData.period)
                  expect(retrieved.rank).toBe(educationData.rank)
                  expect(retrieved.honors).toEqual(educationData.honors)
                  expect(retrieved.courses).toEqual(educationData.courses)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('更新教育经历后读取应该得到更新后的数据', () => {
        fc.assert(
          fc.property(
            fc.record({
              school: fc.string({ minLength: 1, maxLength: 100 }),
              major: fc.string({ minLength: 1, maxLength: 100 }),
              period: fc.string({ minLength: 1, maxLength: 50 })
            }),
            fc.record({
              school: fc.string({ minLength: 1, maxLength: 100 }),
              major: fc.string({ minLength: 1, maxLength: 100 })
            }),
            (initialData, updateData) => {
              initDatabase(':memory:')
              try {
                const id = createEducation(initialData)

                const success = updateEducation(id, updateData)
                expect(success).toBe(true)

                const retrieved = getEducation(id)
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  expect(retrieved.school).toBe(updateData.school)
                  expect(retrieved.major).toBe(updateData.major)
                  expect(retrieved.period).toBe(initialData.period)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('工作经历往返一致性', () => {
      it('创建工作经历后读取应该得到相同的数据', () => {
        fc.assert(
          fc.property(
            fc.record({
              company: fc.string({ minLength: 1, maxLength: 100 }),
              position: fc.string({ minLength: 1, maxLength: 100 }),
              period: fc.string({ minLength: 1, maxLength: 50 }),
              responsibilities: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { maxLength: 10 }),
              achievements: fc.array(
                fc.record({
                  metric: fc.string({ minLength: 1, maxLength: 50 }),
                  value: fc.string({ minLength: 1, maxLength: 50 })
                }),
                { maxLength: 10 }
              )
            }),
            (experienceData) => {
              initDatabase(':memory:')
              try {
                const id = createExperience(experienceData)
                expect(id).toBeTruthy()

                const retrieved = getExperience(id)
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  expect(retrieved.company).toBe(experienceData.company)
                  expect(retrieved.position).toBe(experienceData.position)
                  expect(retrieved.period).toBe(experienceData.period)
                  expect(retrieved.responsibilities).toEqual(experienceData.responsibilities)
                  expect(retrieved.achievements).toEqual(experienceData.achievements)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('技能往返一致性', () => {
      it('创建技能后读取应该得到相同的数据', () => {
        fc.assert(
          fc.property(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              level: fc.integer({ min: 0, max: 100 }),
              category: fc.constantFrom('frontend', 'backend', 'tools', 'other'),
              experience: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
              projects: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 10 })
            }),
            (skillData) => {
              initDatabase(':memory:')
              try {
                const id = createSkill(skillData)
                expect(id).toBeGreaterThan(0)

                const retrieved = getSkill(id)
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  expect(retrieved.name).toBe(skillData.name)
                  expect(retrieved.level).toBe(skillData.level)
                  expect(retrieved.category).toBe(skillData.category)
                  expect(retrieved.experience).toBe(skillData.experience)
                  expect(retrieved.projects).toEqual(skillData.projects)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('技能等级应该在 0-100 范围内', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 100 }),
            (level) => {
              initDatabase(':memory:')
              try {
                const id = createSkill({
                  name: '测试技能',
                  level: level,
                  category: 'frontend',
                  projects: []
                })

                const retrieved = getSkill(id)
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  expect(retrieved.level).toBe(level)
                  expect(retrieved.level).toBeGreaterThanOrEqual(0)
                  expect(retrieved.level).toBeLessThanOrEqual(100)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('项目往返一致性', () => {
      it('创建项目后读取应该得到相同的数据', () => {
        fc.assert(
          fc.property(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
              period: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
              role: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
              technologies: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 20 }),
              highlights: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { maxLength: 10 }),
              screenshots: fc.array(fc.webUrl(), { maxLength: 10 }),
              demo_url: fc.option(fc.webUrl(), { nil: null }),
              source_url: fc.option(fc.webUrl(), { nil: null }),
              category: fc.constantFrom('work', 'personal', 'opensource')
            }),
            (projectData) => {
              initDatabase(':memory:')
              try {
                const id = createProject(projectData)
                expect(id).toBeTruthy()

                const retrieved = getProject(id)
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  expect(retrieved.name).toBe(projectData.name)
                  expect(retrieved.description).toBe(projectData.description)
                  expect(retrieved.period).toBe(projectData.period)
                  expect(retrieved.role).toBe(projectData.role)
                  expect(retrieved.technologies).toEqual(projectData.technologies)
                  expect(retrieved.highlights).toEqual(projectData.highlights)
                  expect(retrieved.screenshots).toEqual(projectData.screenshots)
                  expect(retrieved.demo_url).toBe(projectData.demo_url)
                  expect(retrieved.source_url).toBe(projectData.source_url)
                  expect(retrieved.category).toBe(projectData.category)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('按分类筛选项目应该只返回该分类的项目', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('work', 'personal', 'opensource'),
            fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                category: fc.constantFrom('work', 'personal', 'opensource')
              }),
              { minLength: 5, maxLength: 20 }
            ),
            (targetCategory, projects) => {
              initDatabase(':memory:')
              try {
                for (const project of projects) {
                  createProject({
                    name: project.name,
                    category: project.category,
                    technologies: [],
                    highlights: [],
                    screenshots: []
                  })
                }

                const filtered = getProjectList(targetCategory)

                for (const project of filtered) {
                  expect(project.category).toBe(targetCategory)
                }

                const expectedCount = projects.filter(p => p.category === targetCategory).length
                expect(filtered.length).toBe(expectedCount)
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('校园经历往返一致性', () => {
      it('创建校园经历后读取应该得到相同的数据', () => {
        fc.assert(
          fc.property(
            fc.record({
              organization: fc.string({ minLength: 1, maxLength: 100 }),
              position: fc.string({ minLength: 1, maxLength: 100 }),
              period: fc.string({ minLength: 1, maxLength: 50 })
            }),
            (campusData) => {
              initDatabase(':memory:')
              try {
                const id = createCampus(campusData)
                expect(id).toBeGreaterThan(0)

                const retrieved = getCampus(id)
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  expect(retrieved.organization).toBe(campusData.organization)
                  expect(retrieved.position).toBe(campusData.position)
                  expect(retrieved.period).toBe(campusData.period)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('列表操作一致性', () => {
      it('创建多个教育经历后列表应该包含所有记录', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                school: fc.string({ minLength: 1, maxLength: 100 }),
                major: fc.string({ minLength: 1, maxLength: 100 }),
                period: fc.string({ minLength: 1, maxLength: 50 })
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (educationList) => {
              initDatabase(':memory:')
              try {
                const ids: string[] = []
                for (const education of educationList) {
                  const id = createEducation({
                    ...education,
                    honors: [],
                    courses: []
                  })
                  ids.push(id)
                }

                const retrieved = getEducationList()

                expect(retrieved.length).toBe(educationList.length)

                const retrievedIds = retrieved.map(e => e.id)
                for (const id of ids) {
                  expect(retrievedIds).toContain(id)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })

      it('创建多个技能后列表应该包含所有记录', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                level: fc.integer({ min: 0, max: 100 }),
                category: fc.constantFrom('frontend', 'backend', 'tools', 'other')
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (skillList) => {
              initDatabase(':memory:')
              try {
                const ids: number[] = []
                for (const skill of skillList) {
                  const id = createSkill({
                    ...skill,
                    projects: []
                  })
                  ids.push(id)
                }

                const retrieved = getSkillList()

                expect(retrieved.length).toBe(skillList.length)

                const retrievedIds = retrieved.map(s => s.id)
                for (const id of ids) {
                  expect(retrievedIds).toContain(id)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  })
})
