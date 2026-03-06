/**
 * 内容服务模块
 * 提供内容管理相关的 CRUD 操作和数据导出功能
 * 
 * 需求: 3.7.1 - 内容修改后生成新的 profile.ts 数据文件
 * 需求: 3.7.3 - 提供"发布"功能，将修改同步到前端网站
 */

import { getDatabase, saveDatabase } from '../database/init'
import {
  Profile,
  ProfileRow,
  Education,
  EducationRow,
  Experience,
  ExperienceRow,
  Skill,
  SkillRow,
  SkillInput,
  SkillTreeNode,
  SkillTreeNodeRow,
  SkillTreeNodeWithChildren,
  Project,
  ProjectRow,
  Campus,
  CampusRow,
  CampusInput,
  parseProfileRow,
  parseEducationRow,
  parseExperienceRow,
  parseSkillRow,
  parseProjectRow,
  parseCampusRow,
  parseSkillTreeNodeRow,
  buildSkillTree,
  SkillCategory,
  ProjectCategory
} from '../models/content'

// ========== Profile（个人信息）CRUD ==========

/**
 * 获取个人信息
 * 
 * @returns 个人信息或 null
 */
export function getProfile(): Profile | null {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, name, title, phone, email, avatar, summary, job_intentions, updated_at
    FROM profile
    WHERE id = 1
  `)
  
  if (result.length === 0 || !result[0]?.values?.[0]) {
    return null
  }
  
  const row = result[0].values[0]
  const profileRow: ProfileRow = {
    id: row[0] as number,
    name: row[1] as string,
    title: row[2] as string,
    phone: row[3] as string | null,
    email: row[4] as string | null,
    avatar: row[5] as string | null,
    summary: row[6] as string | null,
    job_intentions: row[7] as string | null,
    updated_at: row[8] as string
  }
  
  return parseProfileRow(profileRow)
}

/**
 * 更新个人信息
 * 
 * @param profile - 个人信息数据
 * @returns 是否更新成功
 */
export function updateProfile(profile: Partial<Profile>): boolean {
  const db = getDatabase()
  
  try {
    const jobIntentionsJson = profile.job_intentions 
      ? JSON.stringify(profile.job_intentions) 
      : undefined
    
    // 构建动态更新语句
    const updates: string[] = []
    const values: (string | null)[] = []
    
    if (profile.name !== undefined) {
      updates.push('name = ?')
      values.push(profile.name)
    }
    if (profile.title !== undefined) {
      updates.push('title = ?')
      values.push(profile.title)
    }
    if (profile.phone !== undefined) {
      updates.push('phone = ?')
      values.push(profile.phone)
    }
    if (profile.email !== undefined) {
      updates.push('email = ?')
      values.push(profile.email)
    }
    if (profile.avatar !== undefined) {
      updates.push('avatar = ?')
      values.push(profile.avatar)
    }
    if (profile.summary !== undefined) {
      updates.push('summary = ?')
      values.push(profile.summary)
    }
    if (jobIntentionsJson !== undefined) {
      updates.push('job_intentions = ?')
      values.push(jobIntentionsJson)
    }
    
    if (updates.length === 0) {
      return true // 没有需要更新的字段
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    
    db.run(`
      UPDATE profile
      SET ${updates.join(', ')}
      WHERE id = 1
    `, values)
    
    saveDatabase()
    return true
  } catch (error) {
    console.error('更新个人信息失败:', error)
    return false
  }
}

// ========== Education（教育经历）CRUD ==========

/**
 * 获取教育经历列表
 * 
 * @returns 教育经历数组
 */
export function getEducationList(): Education[] {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, school, college, major, period, rank, honors, courses, sort_order, created_at, updated_at
    FROM education
    ORDER BY sort_order ASC, created_at DESC
  `)
  
  if (result.length === 0 || !result[0]?.values) {
    return []
  }
  
  return result[0].values.map(row => {
    const educationRow: EducationRow = {
      id: row[0] as string,
      school: row[1] as string,
      college: row[2] as string | null,
      major: row[3] as string,
      period: row[4] as string,
      rank: row[5] as string | null,
      honors: row[6] as string | null,
      courses: row[7] as string | null,
      sort_order: row[8] as number,
      created_at: row[9] as string,
      updated_at: row[10] as string
    }
    return parseEducationRow(educationRow)
  })
}

/**
 * 获取单个教育经历
 * 
 * @param id - 教育经历 ID
 * @returns 教育经历或 null
 */
export function getEducation(id: string): Education | null {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, school, college, major, period, rank, honors, courses, sort_order, created_at, updated_at
    FROM education
    WHERE id = ?
  `, [id])
  
  if (result.length === 0 || !result[0]?.values?.[0]) {
    return null
  }
  
  const row = result[0].values[0]
  const educationRow: EducationRow = {
    id: row[0] as string,
    school: row[1] as string,
    college: row[2] as string | null,
    major: row[3] as string,
    period: row[4] as string,
    rank: row[5] as string | null,
    honors: row[6] as string | null,
    courses: row[7] as string | null,
    sort_order: row[8] as number,
    created_at: row[9] as string,
    updated_at: row[10] as string
  }
  
  return parseEducationRow(educationRow)
}

/**
 * 创建教育经历
 * 
 * @param education - 教育经历数据
 * @returns 创建的教育经历 ID
 */
export function createEducation(education: Omit<Education, 'id'> & { id?: string }): string {
  const db = getDatabase()
  
  const id = education.id || `edu-${Date.now()}`
  const honorsJson = JSON.stringify(education.honors || [])
  const coursesJson = JSON.stringify(education.courses || [])
  
  db.run(`
    INSERT INTO education (id, school, college, major, period, rank, honors, courses, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    education.school,
    education.college || null,
    education.major,
    education.period,
    education.rank || null,
    honorsJson,
    coursesJson,
    education.sort_order || 0
  ])
  
  saveDatabase()
  return id
}

/**
 * 更新教育经历
 * 
 * @param id - 教育经历 ID
 * @param education - 更新的数据
 * @returns 是否更新成功
 */
export function updateEducation(id: string, education: Partial<Education>): boolean {
  const db = getDatabase()
  
  try {
    const updates: string[] = []
    const values: (string | number | null)[] = []
    
    if (education.school !== undefined) {
      updates.push('school = ?')
      values.push(education.school)
    }
    if (education.college !== undefined) {
      updates.push('college = ?')
      values.push(education.college)
    }
    if (education.major !== undefined) {
      updates.push('major = ?')
      values.push(education.major)
    }
    if (education.period !== undefined) {
      updates.push('period = ?')
      values.push(education.period)
    }
    if (education.rank !== undefined) {
      updates.push('rank = ?')
      values.push(education.rank)
    }
    if (education.honors !== undefined) {
      updates.push('honors = ?')
      values.push(JSON.stringify(education.honors))
    }
    if (education.courses !== undefined) {
      updates.push('courses = ?')
      values.push(JSON.stringify(education.courses))
    }
    if (education.sort_order !== undefined) {
      updates.push('sort_order = ?')
      values.push(education.sort_order)
    }
    
    if (updates.length === 0) {
      return true
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    
    db.run(`
      UPDATE education
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)
    
    saveDatabase()
    return true
  } catch (error) {
    console.error('更新教育经历失败:', error)
    return false
  }
}

/**
 * 删除教育经历
 * 
 * @param id - 教育经历 ID
 * @returns 是否删除成功
 */
export function deleteEducation(id: string): boolean {
  const db = getDatabase()
  
  try {
    db.run('DELETE FROM education WHERE id = ?', [id])
    saveDatabase()
    return true
  } catch (error) {
    console.error('删除教育经历失败:', error)
    return false
  }
}

// ========== Experience（工作经历）CRUD ==========

/**
 * 获取工作经历列表
 * 
 * @returns 工作经历数组
 */
export function getExperienceList(): Experience[] {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, company, position, period, responsibilities, achievements, sort_order, created_at, updated_at
    FROM experience
    ORDER BY sort_order ASC, created_at DESC
  `)
  
  if (result.length === 0 || !result[0]?.values) {
    return []
  }
  
  return result[0].values.map(row => {
    const experienceRow: ExperienceRow = {
      id: row[0] as string,
      company: row[1] as string,
      position: row[2] as string,
      period: row[3] as string,
      responsibilities: row[4] as string | null,
      achievements: row[5] as string | null,
      sort_order: row[6] as number,
      created_at: row[7] as string,
      updated_at: row[8] as string
    }
    return parseExperienceRow(experienceRow)
  })
}

/**
 * 获取单个工作经历
 * 
 * @param id - 工作经历 ID
 * @returns 工作经历或 null
 */
export function getExperience(id: string): Experience | null {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, company, position, period, responsibilities, achievements, sort_order, created_at, updated_at
    FROM experience
    WHERE id = ?
  `, [id])
  
  if (result.length === 0 || !result[0]?.values?.[0]) {
    return null
  }
  
  const row = result[0].values[0]
  const experienceRow: ExperienceRow = {
    id: row[0] as string,
    company: row[1] as string,
    position: row[2] as string,
    period: row[3] as string,
    responsibilities: row[4] as string | null,
    achievements: row[5] as string | null,
    sort_order: row[6] as number,
    created_at: row[7] as string,
    updated_at: row[8] as string
  }
  
  return parseExperienceRow(experienceRow)
}

/**
 * 创建工作经历
 * 
 * @param experience - 工作经历数据
 * @returns 创建的工作经历 ID
 */
export function createExperience(experience: Omit<Experience, 'id'> & { id?: string }): string {
  const db = getDatabase()
  
  const id = experience.id || `exp-${Date.now()}`
  const responsibilitiesJson = JSON.stringify(experience.responsibilities || [])
  const achievementsJson = JSON.stringify(experience.achievements || [])
  
  db.run(`
    INSERT INTO experience (id, company, position, period, responsibilities, achievements, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    experience.company,
    experience.position,
    experience.period,
    responsibilitiesJson,
    achievementsJson,
    experience.sort_order || 0
  ])
  
  saveDatabase()
  return id
}

/**
 * 更新工作经历
 * 
 * @param id - 工作经历 ID
 * @param experience - 更新的数据
 * @returns 是否更新成功
 */
export function updateExperience(id: string, experience: Partial<Experience>): boolean {
  const db = getDatabase()
  
  try {
    const updates: string[] = []
    const values: (string | number | null)[] = []
    
    if (experience.company !== undefined) {
      updates.push('company = ?')
      values.push(experience.company)
    }
    if (experience.position !== undefined) {
      updates.push('position = ?')
      values.push(experience.position)
    }
    if (experience.period !== undefined) {
      updates.push('period = ?')
      values.push(experience.period)
    }
    if (experience.responsibilities !== undefined) {
      updates.push('responsibilities = ?')
      values.push(JSON.stringify(experience.responsibilities))
    }
    if (experience.achievements !== undefined) {
      updates.push('achievements = ?')
      values.push(JSON.stringify(experience.achievements))
    }
    if (experience.sort_order !== undefined) {
      updates.push('sort_order = ?')
      values.push(experience.sort_order)
    }
    
    if (updates.length === 0) {
      return true
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    
    db.run(`
      UPDATE experience
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)
    
    saveDatabase()
    return true
  } catch (error) {
    console.error('更新工作经历失败:', error)
    return false
  }
}

/**
 * 删除工作经历
 * 
 * @param id - 工作经历 ID
 * @returns 是否删除成功
 */
export function deleteExperience(id: string): boolean {
  const db = getDatabase()
  
  try {
    db.run('DELETE FROM experience WHERE id = ?', [id])
    saveDatabase()
    return true
  } catch (error) {
    console.error('删除工作经历失败:', error)
    return false
  }
}

// ========== Skill（技能）CRUD ==========

/**
 * 获取技能列表
 * 
 * @param category - 可选的分类筛选
 * @returns 技能数组
 */
export function getSkillList(category?: SkillCategory): Skill[] {
  const db = getDatabase()
  
  let sql = `
    SELECT id, name, level, category, experience, projects, sort_order, created_at, updated_at
    FROM skills
  `
  const params: string[] = []
  
  if (category) {
    sql += ' WHERE category = ?'
    params.push(category)
  }
  
  sql += ' ORDER BY sort_order ASC, created_at DESC'
  
  const result = db.exec(sql, params)
  
  if (result.length === 0 || !result[0]?.values) {
    return []
  }
  
  return result[0].values.map(row => {
    const skillRow: SkillRow = {
      id: row[0] as number,
      name: row[1] as string,
      level: row[2] as number,
      category: row[3] as string,
      experience: row[4] as string | null,
      projects: row[5] as string | null,
      sort_order: row[6] as number,
      created_at: row[7] as string,
      updated_at: row[8] as string
    }
    return parseSkillRow(skillRow)
  })
}

/**
 * 获取单个技能
 * 
 * @param id - 技能 ID
 * @returns 技能或 null
 */
export function getSkill(id: number): Skill | null {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, name, level, category, experience, projects, sort_order, created_at, updated_at
    FROM skills
    WHERE id = ?
  `, [id])
  
  if (result.length === 0 || !result[0]?.values?.[0]) {
    return null
  }
  
  const row = result[0].values[0]
  const skillRow: SkillRow = {
    id: row[0] as number,
    name: row[1] as string,
    level: row[2] as number,
    category: row[3] as string,
    experience: row[4] as string | null,
    projects: row[5] as string | null,
    sort_order: row[6] as number,
    created_at: row[7] as string,
    updated_at: row[8] as string
  }
  
  return parseSkillRow(skillRow)
}

/**
 * 创建技能
 * 
 * @param skill - 技能数据
 * @returns 创建的技能 ID
 */
export function createSkill(skill: SkillInput): number {
  const db = getDatabase()
  
  const projectsJson = JSON.stringify(skill.projects || [])
  
  db.run(`
    INSERT INTO skills (name, level, category, experience, projects, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    skill.name,
    skill.level,
    skill.category,
    skill.experience || null,
    projectsJson,
    skill.sort_order || 0
  ])
  
  saveDatabase()
  
  // 获取插入的 ID
  const result = db.exec('SELECT last_insert_rowid() as id')
  if (result.length > 0 && result[0]?.values?.[0]) {
    return result[0].values[0][0] as number
  }
  
  return -1
}

/**
 * 更新技能
 * 
 * @param id - 技能 ID
 * @param skill - 更新的数据
 * @returns 是否更新成功
 */
export function updateSkill(id: number, skill: Partial<SkillInput>): boolean {
  const db = getDatabase()
  
  try {
    const updates: string[] = []
    const values: (string | number | null)[] = []
    
    if (skill.name !== undefined) {
      updates.push('name = ?')
      values.push(skill.name)
    }
    if (skill.level !== undefined) {
      updates.push('level = ?')
      values.push(skill.level)
    }
    if (skill.category !== undefined) {
      updates.push('category = ?')
      values.push(skill.category)
    }
    if (skill.experience !== undefined) {
      updates.push('experience = ?')
      values.push(skill.experience)
    }
    if (skill.projects !== undefined) {
      updates.push('projects = ?')
      values.push(JSON.stringify(skill.projects))
    }
    if (skill.sort_order !== undefined) {
      updates.push('sort_order = ?')
      values.push(skill.sort_order)
    }
    
    if (updates.length === 0) {
      return true
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    
    db.run(`
      UPDATE skills
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)
    
    saveDatabase()
    return true
  } catch (error) {
    console.error('更新技能失败:', error)
    return false
  }
}

/**
 * 删除技能
 * 
 * @param id - 技能 ID
 * @returns 是否删除成功
 */
export function deleteSkill(id: number): boolean {
  const db = getDatabase()
  
  try {
    db.run('DELETE FROM skills WHERE id = ?', [id])
    saveDatabase()
    return true
  } catch (error) {
    console.error('删除技能失败:', error)
    return false
  }
}


// ========== SkillTree（技能树）CRUD ==========

/**
 * 获取技能树（树形结构）
 * 
 * @returns 技能树根节点数组
 */
export function getSkillTree(): SkillTreeNodeWithChildren[] {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, parent_id, name, level, experience, sort_order
    FROM skill_tree
    ORDER BY sort_order ASC
  `)
  
  if (result.length === 0 || !result[0]?.values) {
    return []
  }
  
  const nodes: SkillTreeNode[] = result[0].values.map(row => {
    const nodeRow: SkillTreeNodeRow = {
      id: row[0] as string,
      parent_id: row[1] as string | null,
      name: row[2] as string,
      level: row[3] as number,
      experience: row[4] as string | null,
      sort_order: row[5] as number
    }
    return parseSkillTreeNodeRow(nodeRow)
  })
  
  return buildSkillTree(nodes)
}

/**
 * 获取技能树节点列表（扁平结构）
 * 
 * @returns 技能树节点数组
 */
export function getSkillTreeNodeList(): SkillTreeNode[] {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, parent_id, name, level, experience, sort_order
    FROM skill_tree
    ORDER BY sort_order ASC
  `)
  
  if (result.length === 0 || !result[0]?.values) {
    return []
  }
  
  return result[0].values.map(row => {
    const nodeRow: SkillTreeNodeRow = {
      id: row[0] as string,
      parent_id: row[1] as string | null,
      name: row[2] as string,
      level: row[3] as number,
      experience: row[4] as string | null,
      sort_order: row[5] as number
    }
    return parseSkillTreeNodeRow(nodeRow)
  })
}

/**
 * 创建技能树节点
 * 
 * @param node - 节点数据
 * @returns 创建的节点 ID
 */
export function createSkillTreeNode(node: Omit<SkillTreeNode, 'id'> & { id?: string }): string {
  const db = getDatabase()
  
  const id = node.id || `skill-${Date.now()}`
  
  db.run(`
    INSERT INTO skill_tree (id, parent_id, name, level, experience, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    node.parent_id || null,
    node.name,
    node.level || 0,
    node.experience || null,
    node.sort_order || 0
  ])
  
  saveDatabase()
  return id
}

/**
 * 更新技能树节点
 * 
 * @param id - 节点 ID
 * @param node - 更新的数据
 * @returns 是否更新成功
 */
export function updateSkillTreeNode(id: string, node: Partial<SkillTreeNode>): boolean {
  const db = getDatabase()
  
  try {
    const updates: string[] = []
    const values: (string | number | null)[] = []
    
    if (node.parent_id !== undefined) {
      updates.push('parent_id = ?')
      values.push(node.parent_id)
    }
    if (node.name !== undefined) {
      updates.push('name = ?')
      values.push(node.name)
    }
    if (node.level !== undefined) {
      updates.push('level = ?')
      values.push(node.level)
    }
    if (node.experience !== undefined) {
      updates.push('experience = ?')
      values.push(node.experience)
    }
    if (node.sort_order !== undefined) {
      updates.push('sort_order = ?')
      values.push(node.sort_order)
    }
    
    if (updates.length === 0) {
      return true
    }
    
    values.push(id)
    
    db.run(`
      UPDATE skill_tree
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)
    
    saveDatabase()
    return true
  } catch (error) {
    console.error('更新技能树节点失败:', error)
    return false
  }
}

/**
 * 删除技能树节点（级联删除子节点）
 * 
 * @param id - 节点 ID
 * @returns 是否删除成功
 */
export function deleteSkillTreeNode(id: string): boolean {
  const db = getDatabase()
  
  try {
    // 由于设置了 ON DELETE CASCADE，删除父节点会自动删除子节点
    db.run('DELETE FROM skill_tree WHERE id = ?', [id])
    saveDatabase()
    return true
  } catch (error) {
    console.error('删除技能树节点失败:', error)
    return false
  }
}

// ========== Project（项目）CRUD ==========

/**
 * 获取项目列表
 * 
 * @param category - 可选的分类筛选
 * @returns 项目数组
 */
export function getProjectList(category?: ProjectCategory): Project[] {
  const db = getDatabase()
  
  let sql = `
    SELECT id, name, description, period, role, technologies, highlights, screenshots, 
           demo_url, source_url, category, sort_order, created_at, updated_at
    FROM projects
  `
  const params: string[] = []
  
  if (category) {
    sql += ' WHERE category = ?'
    params.push(category)
  }
  
  sql += ' ORDER BY sort_order ASC, created_at DESC'
  
  const result = db.exec(sql, params)
  
  if (result.length === 0 || !result[0]?.values) {
    return []
  }
  
  return result[0].values.map(row => {
    const projectRow: ProjectRow = {
      id: row[0] as string,
      name: row[1] as string,
      description: row[2] as string | null,
      period: row[3] as string | null,
      role: row[4] as string | null,
      technologies: row[5] as string | null,
      highlights: row[6] as string | null,
      screenshots: row[7] as string | null,
      demo_url: row[8] as string | null,
      source_url: row[9] as string | null,
      category: row[10] as string,
      sort_order: row[11] as number,
      created_at: row[12] as string,
      updated_at: row[13] as string
    }
    return parseProjectRow(projectRow)
  })
}

/**
 * 获取单个项目
 * 
 * @param id - 项目 ID
 * @returns 项目或 null
 */
export function getProject(id: string): Project | null {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, name, description, period, role, technologies, highlights, screenshots, 
           demo_url, source_url, category, sort_order, created_at, updated_at
    FROM projects
    WHERE id = ?
  `, [id])
  
  if (result.length === 0 || !result[0]?.values?.[0]) {
    return null
  }
  
  const row = result[0].values[0]
  const projectRow: ProjectRow = {
    id: row[0] as string,
    name: row[1] as string,
    description: row[2] as string | null,
    period: row[3] as string | null,
    role: row[4] as string | null,
    technologies: row[5] as string | null,
    highlights: row[6] as string | null,
    screenshots: row[7] as string | null,
    demo_url: row[8] as string | null,
    source_url: row[9] as string | null,
    category: row[10] as string,
    sort_order: row[11] as number,
    created_at: row[12] as string,
    updated_at: row[13] as string
  }
  
  return parseProjectRow(projectRow)
}

/**
 * 创建项目
 * 
 * @param project - 项目数据
 * @returns 创建的项目 ID
 */
export function createProject(project: Omit<Project, 'id'> & { id?: string }): string {
  const db = getDatabase()
  
  const id = project.id || `proj-${Date.now()}`
  const technologiesJson = JSON.stringify(project.technologies || [])
  const highlightsJson = JSON.stringify(project.highlights || [])
  const screenshotsJson = JSON.stringify(project.screenshots || [])
  
  db.run(`
    INSERT INTO projects (id, name, description, period, role, technologies, highlights, 
                          screenshots, demo_url, source_url, category, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    project.name,
    project.description || null,
    project.period || null,
    project.role || null,
    technologiesJson,
    highlightsJson,
    screenshotsJson,
    project.demo_url || null,
    project.source_url || null,
    project.category,
    project.sort_order || 0
  ])
  
  saveDatabase()
  return id
}

/**
 * 更新项目
 * 
 * @param id - 项目 ID
 * @param project - 更新的数据
 * @returns 是否更新成功
 */
export function updateProject(id: string, project: Partial<Project>): boolean {
  const db = getDatabase()
  
  try {
    const updates: string[] = []
    const values: (string | number | null)[] = []
    
    if (project.name !== undefined) {
      updates.push('name = ?')
      values.push(project.name)
    }
    if (project.description !== undefined) {
      updates.push('description = ?')
      values.push(project.description)
    }
    if (project.period !== undefined) {
      updates.push('period = ?')
      values.push(project.period)
    }
    if (project.role !== undefined) {
      updates.push('role = ?')
      values.push(project.role)
    }
    if (project.technologies !== undefined) {
      updates.push('technologies = ?')
      values.push(JSON.stringify(project.technologies))
    }
    if (project.highlights !== undefined) {
      updates.push('highlights = ?')
      values.push(JSON.stringify(project.highlights))
    }
    if (project.screenshots !== undefined) {
      updates.push('screenshots = ?')
      values.push(JSON.stringify(project.screenshots))
    }
    if (project.demo_url !== undefined) {
      updates.push('demo_url = ?')
      values.push(project.demo_url)
    }
    if (project.source_url !== undefined) {
      updates.push('source_url = ?')
      values.push(project.source_url)
    }
    if (project.category !== undefined) {
      updates.push('category = ?')
      values.push(project.category)
    }
    if (project.sort_order !== undefined) {
      updates.push('sort_order = ?')
      values.push(project.sort_order)
    }
    
    if (updates.length === 0) {
      return true
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    
    db.run(`
      UPDATE projects
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)
    
    saveDatabase()
    return true
  } catch (error) {
    console.error('更新项目失败:', error)
    return false
  }
}

/**
 * 删除项目
 * 
 * @param id - 项目 ID
 * @returns 是否删除成功
 */
export function deleteProject(id: string): boolean {
  const db = getDatabase()
  
  try {
    db.run('DELETE FROM projects WHERE id = ?', [id])
    saveDatabase()
    return true
  } catch (error) {
    console.error('删除项目失败:', error)
    return false
  }
}

// ========== Campus（校园经历）CRUD ==========

/**
 * 获取校园经历列表
 * 
 * @returns 校园经历数组
 */
export function getCampusList(): Campus[] {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, organization, position, period, sort_order, created_at, updated_at
    FROM campus_experience
    ORDER BY sort_order ASC, created_at DESC
  `)
  
  if (result.length === 0 || !result[0]?.values) {
    return []
  }
  
  return result[0].values.map(row => {
    const campusRow: CampusRow = {
      id: row[0] as number,
      organization: row[1] as string,
      position: row[2] as string,
      period: row[3] as string,
      sort_order: row[4] as number,
      created_at: row[5] as string,
      updated_at: row[6] as string
    }
    return parseCampusRow(campusRow)
  })
}

/**
 * 获取单个校园经历
 * 
 * @param id - 校园经历 ID
 * @returns 校园经历或 null
 */
export function getCampus(id: number): Campus | null {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, organization, position, period, sort_order, created_at, updated_at
    FROM campus_experience
    WHERE id = ?
  `, [id])
  
  if (result.length === 0 || !result[0]?.values?.[0]) {
    return null
  }
  
  const row = result[0].values[0]
  const campusRow: CampusRow = {
    id: row[0] as number,
    organization: row[1] as string,
    position: row[2] as string,
    period: row[3] as string,
    sort_order: row[4] as number,
    created_at: row[5] as string,
    updated_at: row[6] as string
  }
  
  return parseCampusRow(campusRow)
}

/**
 * 创建校园经历
 * 
 * @param campus - 校园经历数据
 * @returns 创建的校园经历 ID
 */
export function createCampus(campus: CampusInput): number {
  const db = getDatabase()
  
  db.run(`
    INSERT INTO campus_experience (organization, position, period, sort_order)
    VALUES (?, ?, ?, ?)
  `, [
    campus.organization,
    campus.position,
    campus.period,
    campus.sort_order || 0
  ])
  
  saveDatabase()
  
  // 获取插入的 ID
  const result = db.exec('SELECT last_insert_rowid() as id')
  if (result.length > 0 && result[0]?.values?.[0]) {
    return result[0].values[0][0] as number
  }
  
  return -1
}

/**
 * 更新校园经历
 * 
 * @param id - 校园经历 ID
 * @param campus - 更新的数据
 * @returns 是否更新成功
 */
export function updateCampus(id: number, campus: Partial<CampusInput>): boolean {
  const db = getDatabase()
  
  try {
    const updates: string[] = []
    const values: (string | number | null)[] = []
    
    if (campus.organization !== undefined) {
      updates.push('organization = ?')
      values.push(campus.organization)
    }
    if (campus.position !== undefined) {
      updates.push('position = ?')
      values.push(campus.position)
    }
    if (campus.period !== undefined) {
      updates.push('period = ?')
      values.push(campus.period)
    }
    if (campus.sort_order !== undefined) {
      updates.push('sort_order = ?')
      values.push(campus.sort_order)
    }
    
    if (updates.length === 0) {
      return true
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    
    db.run(`
      UPDATE campus_experience
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values)
    
    saveDatabase()
    return true
  } catch (error) {
    console.error('更新校园经历失败:', error)
    return false
  }
}

/**
 * 删除校园经历
 * 
 * @param id - 校园经历 ID
 * @returns 是否删除成功
 */
export function deleteCampus(id: number): boolean {
  const db = getDatabase()
  
  try {
    db.run('DELETE FROM campus_experience WHERE id = ?', [id])
    saveDatabase()
    return true
  } catch (error) {
    console.error('删除校园经历失败:', error)
    return false
  }
}


// ========== 数据导出和预览功能 ==========

/**
 * 预览数据接口
 * 包含所有内容数据，用于预览和导出
 */
export interface PreviewData {
  profile: Profile | null
  education: Education[]
  experience: Experience[]
  skills: Skill[]
  skillTree: SkillTreeNodeWithChildren[]
  projects: Project[]
  campusExperience: Campus[]
}

/**
 * 获取所有内容数据用于预览
 * 需求: 3.7.2 - 提供"预览"功能，在保存前查看修改效果
 * 
 * @returns 预览数据
 */
export function getPreviewData(): PreviewData {
  return {
    profile: getProfile(),
    education: getEducationList(),
    experience: getExperienceList(),
    skills: getSkillList(),
    skillTree: getSkillTree(),
    projects: getProjectList(),
    campusExperience: getCampusList()
  }
}

/**
 * 将技能树转换为前端格式
 * 前端使用的技能树格式与数据库格式略有不同
 */
function convertSkillTreeToFrontendFormat(nodes: SkillTreeNodeWithChildren[]): object | null {
  if (nodes.length === 0) {
    return null
  }
  
  // 如果只有一个根节点，直接返回
  if (nodes.length === 1) {
    const firstNode = nodes[0]
    if (firstNode) {
      return convertNodeToFrontendFormat(firstNode)
    }
    return null
  }
  
  // 如果有多个根节点，创建一个虚拟根节点
  return {
    id: 'root',
    name: '技能树',
    level: 100,
    children: nodes.map(convertNodeToFrontendFormat)
  }
}

/**
 * 转换单个节点为前端格式
 */
function convertNodeToFrontendFormat(node: SkillTreeNodeWithChildren): object {
  const result: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    level: node.level
  }
  
  if (node.experience) {
    result.experience = node.experience
  }
  
  if (node.children && node.children.length > 0) {
    result.children = node.children.map(convertNodeToFrontendFormat)
  }
  
  return result
}

/**
 * 将技能数据转换为前端格式
 * 前端技能数据不包含 id 和 sort_order
 */
function convertSkillToFrontendFormat(skill: Skill): object {
  return {
    name: skill.name,
    level: skill.level,
    category: skill.category,
    experience: skill.experience || undefined,
    projects: skill.projects.length > 0 ? skill.projects : undefined
  }
}

/**
 * 将教育经历转换为前端格式
 */
function convertEducationToFrontendFormat(edu: Education): object {
  return {
    id: edu.id,
    school: edu.school,
    college: edu.college || undefined,
    major: edu.major,
    period: edu.period,
    rank: edu.rank || undefined,
    honors: edu.honors.length > 0 ? edu.honors : undefined,
    courses: edu.courses.length > 0 ? edu.courses : undefined
  }
}

/**
 * 将工作经历转换为前端格式
 */
function convertExperienceToFrontendFormat(exp: Experience): object {
  return {
    id: exp.id,
    company: exp.company,
    position: exp.position,
    period: exp.period,
    responsibilities: exp.responsibilities.length > 0 ? exp.responsibilities : undefined,
    achievements: exp.achievements.length > 0 ? exp.achievements : undefined
  }
}

/**
 * 将校园经历转换为前端格式
 */
function convertCampusToFrontendFormat(campus: Campus): object {
  return {
    organization: campus.organization,
    position: campus.position,
    period: campus.period
  }
}

/**
 * 将项目转换为前端格式
 */
function convertProjectToFrontendFormat(project: Project): object {
  const result: Record<string, unknown> = {
    id: project.id,
    name: project.name,
    category: project.category
  }
  
  if (project.description) result.description = project.description
  if (project.period) result.period = project.period
  if (project.role) result.role = project.role
  if (project.technologies.length > 0) result.technologies = project.technologies
  if (project.highlights.length > 0) result.highlights = project.highlights
  if (project.screenshots.length > 0) result.screenshots = project.screenshots
  if (project.demo_url) result.demoUrl = project.demo_url
  if (project.source_url) result.sourceUrl = project.source_url
  
  return result
}

/**
 * 导出为 profile.ts 文件格式
 * 需求: 3.7.1 - 内容修改后生成新的 profile.ts 数据文件
 * 需求: 3.7.3 - 提供"发布"功能，将修改同步到前端网站
 * 
 * @returns 生成的 TypeScript 文件内容
 */
export function exportToProfileTs(): string {
  const data = getPreviewData()
  
  // 构建 profileData 对象
  const profileData: Record<string, unknown> = {}
  
  if (data.profile) {
    profileData.name = data.profile.name
    profileData.title = data.profile.title
    if (data.profile.phone) profileData.phone = data.profile.phone
    if (data.profile.email) profileData.email = data.profile.email
    if (data.profile.avatar) profileData.avatar = data.profile.avatar
    if (data.profile.summary) profileData.summary = data.profile.summary
    if (data.profile.job_intentions.length > 0) {
      profileData.jobIntentions = data.profile.job_intentions
    }
  }
  
  // 添加教育经历
  if (data.education.length > 0) {
    profileData.education = data.education.map(convertEducationToFrontendFormat)
  }
  
  // 添加工作经历
  if (data.experience.length > 0) {
    profileData.experience = data.experience.map(convertExperienceToFrontendFormat)
  }
  
  // 添加技能
  if (data.skills.length > 0) {
    profileData.skills = data.skills.map(convertSkillToFrontendFormat)
  }
  
  // 添加校园经历
  if (data.campusExperience.length > 0) {
    profileData.campusExperience = data.campusExperience.map(convertCampusToFrontendFormat)
  }
  
  // 构建 projectsData 数组
  const projectsData = data.projects.map(convertProjectToFrontendFormat)
  
  // 构建技能树数据
  const skillTreeData = convertSkillTreeToFrontendFormat(data.skillTree)
  
  // 生成 TypeScript 文件内容
  let content = `import type { Profile } from '@/types'
import type { Project } from '@/types/project'
import type { SkillTreeNode } from '@/types/skillTree'

/**
 * 个人信息数据配置
 * Personal profile data
 * 
 * 此文件由后台管理系统自动生成
 * This file is auto-generated by the admin system
 * 生成时间: ${new Date().toISOString()}
 */
export const profileData: Profile = ${JSON.stringify(profileData, null, 2)}

// 导出默认配置
export default profileData

/**
 * 项目数据配置
 * Project data configuration
 */
export const projectsData: Project[] = ${JSON.stringify(projectsData, null, 2)}

`

  // 添加技能树数据（如果存在）
  if (skillTreeData) {
    content += `
/**
 * 技能树数据配置
 * Skill Tree Data Configuration
 */
export const skillTreeData: SkillTreeNode = ${JSON.stringify(skillTreeData, null, 2)}
`
  }
  
  return content
}

/**
 * 导出结果接口
 */
export interface ExportResult {
  success: boolean
  content?: string
  error?: string
}

/**
 * 执行导出操作
 * 
 * @returns 导出结果
 */
export function performExport(): ExportResult {
  try {
    const content = exportToProfileTs()
    return {
      success: true,
      content
    }
  } catch (error) {
    console.error('导出失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出失败'
    }
  }
}

/**
 * 批量导入教育经历
 * 
 * @param educationList - 教育经历数组
 * @returns 导入的记录数
 */
export function batchImportEducation(educationList: Array<Omit<Education, 'id'> & { id?: string }>): number {
  let count = 0
  for (const edu of educationList) {
    try {
      createEducation(edu)
      count++
    } catch (error) {
      console.error('导入教育经历失败:', error)
    }
  }
  return count
}

/**
 * 批量导入工作经历
 * 
 * @param experienceList - 工作经历数组
 * @returns 导入的记录数
 */
export function batchImportExperience(experienceList: Array<Omit<Experience, 'id'> & { id?: string }>): number {
  let count = 0
  for (const exp of experienceList) {
    try {
      createExperience(exp)
      count++
    } catch (error) {
      console.error('导入工作经历失败:', error)
    }
  }
  return count
}

/**
 * 批量导入技能
 * 
 * @param skillList - 技能数组
 * @returns 导入的记录数
 */
export function batchImportSkills(skillList: SkillInput[]): number {
  let count = 0
  for (const skill of skillList) {
    try {
      createSkill(skill)
      count++
    } catch (error) {
      console.error('导入技能失败:', error)
    }
  }
  return count
}

/**
 * 批量导入项目
 * 
 * @param projectList - 项目数组
 * @returns 导入的记录数
 */
export function batchImportProjects(projectList: Array<Omit<Project, 'id'> & { id?: string }>): number {
  let count = 0
  for (const project of projectList) {
    try {
      createProject(project)
      count++
    } catch (error) {
      console.error('导入项目失败:', error)
    }
  }
  return count
}

/**
 * 批量导入校园经历
 * 
 * @param campusList - 校园经历数组
 * @returns 导入的记录数
 */
export function batchImportCampus(campusList: CampusInput[]): number {
  let count = 0
  for (const campus of campusList) {
    try {
      createCampus(campus)
      count++
    } catch (error) {
      console.error('导入校园经历失败:', error)
    }
  }
  return count
}

/**
 * 清空所有内容数据（危险操作，仅用于重置）
 * 
 * @returns 是否清空成功
 */
export function clearAllContent(): boolean {
  const db = getDatabase()
  
  try {
    db.run('DELETE FROM education')
    db.run('DELETE FROM experience')
    db.run('DELETE FROM skills')
    db.run('DELETE FROM skill_tree')
    db.run('DELETE FROM projects')
    db.run('DELETE FROM campus_experience')
    
    // 重置 profile 为默认值
    db.run(`
      UPDATE profile
      SET name = '待设置', title = '待设置', phone = NULL, email = NULL,
          avatar = NULL, summary = NULL, job_intentions = '[]',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `)
    
    saveDatabase()
    return true
  } catch (error) {
    console.error('清空内容数据失败:', error)
    return false
  }
}
