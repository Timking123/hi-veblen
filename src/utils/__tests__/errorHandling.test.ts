import { describe, it, expect } from 'vitest'
import {
  detectBrowser,
  checkFeatureSupport,
  checkBrowserCompatibility,
  getDeviceType,
  isTouchDevice,
} from '../browserCompat'
import {
  isNullOrUndefined,
  isEmptyString,
  isEmptyArray,
  sanitizeString,
  sanitizeArray,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  truncateText,
} from '../dataValidation'

describe('Browser Compatibility Utilities', () => {
  describe('detectBrowser', () => {
    it('should detect browser name and version', () => {
      const result = detectBrowser()
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('version')
      expect(typeof result.name).toBe('string')
      expect(typeof result.version).toBe('string')
    })
  })

  describe('checkFeatureSupport', () => {
    it('should check if IntersectionObserver is supported', () => {
      const result = checkFeatureSupport('IntersectionObserver')
      expect(typeof result).toBe('boolean')
    })

    it('should check if fetch is supported', () => {
      const result = checkFeatureSupport('fetch')
      expect(result).toBe(true) // Modern browsers support fetch
    })

    it('should check if Promise is supported', () => {
      const result = checkFeatureSupport('Promise')
      expect(result).toBe(true) // Modern browsers support Promise
    })

    it('should check if localStorage is supported', () => {
      const result = checkFeatureSupport('localStorage')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('checkBrowserCompatibility', () => {
    it('should return compatibility result', () => {
      const result = checkBrowserCompatibility()
      expect(result).toHaveProperty('isCompatible')
      expect(result).toHaveProperty('browser')
      expect(result).toHaveProperty('warnings')
      expect(typeof result.isCompatible).toBe('boolean')
      expect(Array.isArray(result.warnings)).toBe(true)
    })
  })

  describe('getDeviceType', () => {
    it('should return device type based on window width', () => {
      const result = getDeviceType()
      expect(['mobile', 'tablet', 'desktop']).toContain(result)
    })
  })

  describe('isTouchDevice', () => {
    it('should return boolean for touch device detection', () => {
      const result = isTouchDevice()
      expect(typeof result).toBe('boolean')
    })
  })
})

describe('Data Validation Utilities', () => {
  describe('isNullOrUndefined', () => {
    it('should return true for null', () => {
      expect(isNullOrUndefined(null)).toBe(true)
    })

    it('should return true for undefined', () => {
      expect(isNullOrUndefined(undefined)).toBe(true)
    })

    it('should return false for other values', () => {
      expect(isNullOrUndefined(0)).toBe(false)
      expect(isNullOrUndefined('')).toBe(false)
      expect(isNullOrUndefined(false)).toBe(false)
    })
  })

  describe('isEmptyString', () => {
    it('should return true for empty string', () => {
      expect(isEmptyString('')).toBe(true)
    })

    it('should return true for whitespace-only string', () => {
      expect(isEmptyString('   ')).toBe(true)
      expect(isEmptyString('\t\n')).toBe(true)
    })

    it('should return false for non-empty string', () => {
      expect(isEmptyString('hello')).toBe(false)
      expect(isEmptyString(' hello ')).toBe(false)
    })

    it('should return false for non-string values', () => {
      expect(isEmptyString(123)).toBe(false)
      expect(isEmptyString(null)).toBe(false)
    })
  })

  describe('isEmptyArray', () => {
    it('should return true for empty array', () => {
      expect(isEmptyArray([])).toBe(true)
    })

    it('should return false for non-empty array', () => {
      expect(isEmptyArray([1, 2, 3])).toBe(false)
    })

    it('should return false for non-array values', () => {
      expect(isEmptyArray('[]')).toBe(false)
      expect(isEmptyArray(null)).toBe(false)
    })
  })

  describe('sanitizeString', () => {
    it('should return default value for null or undefined', () => {
      expect(sanitizeString(null)).toBe('未提供')
      expect(sanitizeString(undefined)).toBe('未提供')
      expect(sanitizeString(null, 'default')).toBe('default')
    })

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello')
    })

    it('should return default for empty string', () => {
      expect(sanitizeString('')).toBe('未提供')
      expect(sanitizeString('   ')).toBe('未提供')
    })

    it('should convert non-string to string', () => {
      expect(sanitizeString(123)).toBe('123')
      expect(sanitizeString(true)).toBe('true')
    })
  })

  describe('sanitizeArray', () => {
    it('should return default for non-array', () => {
      expect(sanitizeArray(null)).toEqual([])
      expect(sanitizeArray('not array')).toEqual([])
      expect(sanitizeArray(null, [1, 2])).toEqual([1, 2])
    })

    it('should filter out null and undefined', () => {
      expect(sanitizeArray([1, null, 2, undefined, 3])).toEqual([1, 2, 3])
    })

    it('should keep valid values', () => {
      expect(sanitizeArray([1, 2, 3])).toEqual([1, 2, 3])
      expect(sanitizeArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
    })
  })

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    })

    it('should return false for invalid email', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('invalid@')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('should return true for valid Chinese mobile', () => {
      expect(isValidPhone('13800138000')).toBe(true)
      expect(isValidPhone('138 0013 8000')).toBe(true)
      expect(isValidPhone('138-0013-8000')).toBe(true)
    })

    it('should return true for international format', () => {
      expect(isValidPhone('+8613800138000')).toBe(true)
      expect(isValidPhone('+1234567890')).toBe(true)
    })

    it('should return false for invalid phone', () => {
      expect(isValidPhone('')).toBe(false)
      expect(isValidPhone('123')).toBe(false)
      expect(isValidPhone('abc')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('should return true for valid URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://example.com/path')).toBe(true)
    })

    it('should return false for invalid URL', () => {
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('not a url')).toBe(false)
      expect(isValidUrl('example.com')).toBe(false)
    })
  })

  describe('truncateText', () => {
    it('should not truncate if text is shorter than max length', () => {
      expect(truncateText('hello', 10)).toBe('hello')
    })

    it('should truncate and add suffix if text is longer', () => {
      expect(truncateText('hello world', 8)).toBe('hello...')
      expect(truncateText('hello world', 8, '…')).toBe('hello w…')
    })

    it('should handle exact length', () => {
      expect(truncateText('hello', 5)).toBe('hello')
    })
  })
})
