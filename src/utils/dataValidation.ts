/**
 * Data Validation Utilities
 * 
 * Provides utilities for validating and handling missing or invalid data
 */

import type {
  Profile,
  Education,
  Experience,
  Skill,
  CampusExperience,
} from '@/types'

/**
 * Check if a value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

/**
 * Check if a string is empty or whitespace
 */
export function isEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length === 0
}

/**
 * Check if an array is empty
 */
export function isEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0
}

/**
 * Get a default value if the provided value is invalid
 */
export function getOrDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return isNullOrUndefined(value) ? defaultValue : value
}

/**
 * Validate and sanitize a string
 */
export function sanitizeString(
  value: unknown,
  defaultValue = '未提供'
): string {
  if (isNullOrUndefined(value)) {
    return defaultValue
  }
  
  if (typeof value !== 'string') {
    return String(value)
  }
  
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : defaultValue
}

/**
 * Validate and sanitize an array
 */
export function sanitizeArray<T>(
  value: unknown,
  defaultValue: T[] = []
): T[] {
  if (!Array.isArray(value)) {
    return defaultValue
  }
  
  return value.filter((item) => !isNullOrUndefined(item))
}

/**
 * Validate Education data
 */
export function validateEducation(education: Partial<Education>): Education {
  return {
    id: sanitizeString(education.id, `edu-${Date.now()}`),
    school: sanitizeString(education.school, '未知学校'),
    college: sanitizeString(education.college, ''),
    major: sanitizeString(education.major, '未知专业'),
    period: sanitizeString(education.period, ''),
    rank: sanitizeString(education.rank, ''),
    honors: sanitizeArray(education.honors),
    courses: sanitizeArray(education.courses),
  }
}

/**
 * Validate Experience data
 */
export function validateExperience(
  experience: Partial<Experience>
): Experience {
  return {
    id: sanitizeString(experience.id, `exp-${Date.now()}`),
    company: sanitizeString(experience.company, '未知公司'),
    position: sanitizeString(experience.position, '未知职位'),
    period: sanitizeString(experience.period, ''),
    responsibilities: sanitizeArray(experience.responsibilities),
    achievements: sanitizeArray(experience.achievements),
  }
}

/**
 * Validate Skill data
 */
export function validateSkill(skill: Partial<Skill>): Skill {
  return {
    name: sanitizeString(skill.name, '未知技能'),
    level: typeof skill.level === 'number' ? Math.max(0, Math.min(100, skill.level)) : 0,
    category: sanitizeString(skill.category, 'other') as Skill['category'],
    experience: sanitizeString(skill.experience, ''),
    projects: sanitizeArray(skill.projects),
  }
}

/**
 * Validate CampusExperience data
 */
export function validateCampusExperience(
  experience: Partial<CampusExperience>
): CampusExperience {
  return {
    organization: sanitizeString(experience.organization, '未知组织'),
    position: sanitizeString(experience.position, '未知职位'),
    period: sanitizeString(experience.period, ''),
  }
}

/**
 * Validate Profile data
 */
export function validateProfile(profile: Partial<Profile>): Profile {
  return {
    name: sanitizeString(profile.name, '未知'),
    title: sanitizeString(profile.title, ''),
    phone: sanitizeString(profile.phone, ''),
    email: sanitizeString(profile.email, ''),
    avatar: sanitizeString(profile.avatar, ''),
    summary: sanitizeString(profile.summary, ''),
    jobIntentions: sanitizeArray(profile.jobIntentions),
    education: sanitizeArray(profile.education).map((edu) => validateEducation(edu as Partial<Education>)),
    experience: sanitizeArray(profile.experience).map((exp) => validateExperience(exp as Partial<Experience>)),
    skills: sanitizeArray(profile.skills).map((skill) => validateSkill(skill as Partial<Skill>)),
    campusExperience: sanitizeArray(profile.campusExperience).map(
      (exp) => validateCampusExperience(exp as Partial<CampusExperience>)
    ),
  }
}

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  if (isEmptyString(email)) {
    return false
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if phone number is valid (Chinese format)
 */
export function isValidPhone(phone: string): boolean {
  if (isEmptyString(phone)) {
    return false
  }
  
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '')
  
  // Chinese mobile: 11 digits starting with 1
  // Chinese landline: 10-12 digits
  // International: starts with +
  const phoneRegex = /^(\+?\d{10,15}|1\d{10})$/
  return phoneRegex.test(cleaned)
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  if (isEmptyString(url)) {
    return false
  }
  
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix = '...'
): string {
  if (text.length <= maxLength) {
    return text
  }
  
  return text.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Format date string
 */
export function formatDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(d.getTime())) {
      return '无效日期'
    }
    
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return '无效日期'
  }
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(
  json: string,
  fallback: T
): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Check if object has required properties
 */
export function hasRequiredProperties<T extends object>(
  obj: unknown,
  properties: (keyof T)[]
): obj is T {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }
  
  return properties.every((prop) => prop in obj)
}

/**
 * Deep clone an object safely
 */
export function deepClone<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch {
    return obj
  }
}

/**
 * Merge objects with defaults
 */
export function mergeWithDefaults<T extends object>(
  obj: Partial<T>,
  defaults: T
): T {
  return { ...defaults, ...obj }
}
