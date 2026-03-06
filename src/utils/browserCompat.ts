/**
 * Browser Compatibility Detection Utilities
 * 
 * Detects browser features and provides compatibility information
 */

export interface BrowserInfo {
  name: string
  version: string
  isSupported: boolean
  missingFeatures: string[]
}

export interface CompatibilityResult {
  isCompatible: boolean
  browser: BrowserInfo
  warnings: string[]
}

/**
 * Detect browser name and version
 */
export function detectBrowser(): { name: string; version: string } {
  const ua = navigator.userAgent
  let name = 'Unknown'
  let version = 'Unknown'

  // Chrome
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    name = 'Chrome'
    const match = ua.match(/Chrome\/(\d+)/)
    version = match ? match[1] : 'Unknown'
  }
  // Edge
  else if (ua.includes('Edg')) {
    name = 'Edge'
    const match = ua.match(/Edg\/(\d+)/)
    version = match ? match[1] : 'Unknown'
  }
  // Firefox
  else if (ua.includes('Firefox')) {
    name = 'Firefox'
    const match = ua.match(/Firefox\/(\d+)/)
    version = match ? match[1] : 'Unknown'
  }
  // Safari
  else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari'
    const match = ua.match(/Version\/(\d+)/)
    version = match ? match[1] : 'Unknown'
  }
  // Opera
  else if (ua.includes('OPR') || ua.includes('Opera')) {
    name = 'Opera'
    const match = ua.match(/(?:OPR|Opera)\/(\d+)/)
    version = match ? match[1] : 'Unknown'
  }

  return { name, version }
}

/**
 * Check if a specific feature is supported
 */
export function checkFeatureSupport(feature: string): boolean {
  switch (feature) {
    case 'IntersectionObserver':
      return 'IntersectionObserver' in window
    
    case 'ResizeObserver':
      return 'ResizeObserver' in window
    
    case 'fetch':
      return 'fetch' in window
    
    case 'Promise':
      return 'Promise' in window
    
    case 'localStorage':
      try {
        const test = '__test__'
        localStorage.setItem(test, test)
        localStorage.removeItem(test)
        return true
      } catch {
        return false
      }
    
    case 'sessionStorage':
      try {
        const test = '__test__'
        sessionStorage.setItem(test, test)
        sessionStorage.removeItem(test)
        return true
      } catch {
        return false
      }
    
    case 'WebGL':
      try {
        const canvas = document.createElement('canvas')
        return !!(
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl')
        )
      } catch {
        return false
      }
    
    case 'CSS.supports':
      return 'CSS' in window && 'supports' in window.CSS
    
    case 'customElements':
      return 'customElements' in window
    
    case 'serviceWorker':
      return 'serviceWorker' in navigator
    
    case 'requestAnimationFrame':
      return 'requestAnimationFrame' in window
    
    case 'matchMedia':
      return 'matchMedia' in window
    
    default:
      return false
  }
}

/**
 * Check multiple features at once
 */
export function checkFeatures(features: string[]): Record<string, boolean> {
  const results: Record<string, boolean> = {}
  features.forEach((feature) => {
    results[feature] = checkFeatureSupport(feature)
  })
  return results
}

/**
 * Get list of required features for the application
 */
export function getRequiredFeatures(): string[] {
  return [
    'IntersectionObserver',
    'fetch',
    'Promise',
    'localStorage',
    'requestAnimationFrame',
    'matchMedia',
  ]
}

/**
 * Get list of optional features (nice to have)
 */
export function getOptionalFeatures(): string[] {
  return [
    'ResizeObserver',
    'WebGL',
    'serviceWorker',
    'CSS.supports',
  ]
}

/**
 * Check browser compatibility
 */
export function checkBrowserCompatibility(): CompatibilityResult {
  const browser = detectBrowser()
  const requiredFeatures = getRequiredFeatures()
  const optionalFeatures = getOptionalFeatures()
  
  const missingRequired: string[] = []
  const missingOptional: string[] = []
  
  // Check required features
  requiredFeatures.forEach((feature) => {
    if (!checkFeatureSupport(feature)) {
      missingRequired.push(feature)
    }
  })
  
  // Check optional features
  optionalFeatures.forEach((feature) => {
    if (!checkFeatureSupport(feature)) {
      missingOptional.push(feature)
    }
  })
  
  const isSupported = missingRequired.length === 0
  const warnings: string[] = []
  
  if (!isSupported) {
    warnings.push(
      `您的浏览器缺少以下必需功能: ${missingRequired.join(', ')}`
    )
  }
  
  if (missingOptional.length > 0) {
    warnings.push(
      `您的浏览器缺少以下可选功能，可能影响部分体验: ${missingOptional.join(', ')}`
    )
  }
  
  // Browser-specific warnings
  const version = parseInt(browser.version)
  if (browser.name === 'Chrome' && version < 90) {
    warnings.push('建议使用 Chrome 90 或更高版本以获得最佳体验')
  } else if (browser.name === 'Firefox' && version < 88) {
    warnings.push('建议使用 Firefox 88 或更高版本以获得最佳体验')
  } else if (browser.name === 'Safari' && version < 14) {
    warnings.push('建议使用 Safari 14 或更高版本以获得最佳体验')
  } else if (browser.name === 'Edge' && version < 90) {
    warnings.push('建议使用 Edge 90 或更高版本以获得最佳体验')
  }
  
  return {
    isCompatible: isSupported,
    browser: {
      name: browser.name,
      version: browser.version,
      isSupported,
      missingFeatures: missingRequired,
    },
    warnings,
  }
}

/**
 * Check if CSS feature is supported
 */
export function checkCSSSupport(property: string, value: string): boolean {
  if (!checkFeatureSupport('CSS.supports')) {
    return false
  }
  return CSS.supports(property, value)
}

/**
 * Get device type
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth
  
  if (width < 768) {
    return 'mobile'
  } else if (width < 1024) {
    return 'tablet'
  } else {
    return 'desktop'
  }
}

/**
 * Check if device is touch-enabled
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  )
}

/**
 * Get performance information
 */
export function getPerformanceInfo(): {
  memory?: number
  connection?: string
  hardwareConcurrency?: number
} {
  const info: {
    memory?: number
    connection?: string
    hardwareConcurrency?: number
  } = {}
  
  // @ts-expect-error - memory is non-standard
  if (performance.memory) {
    // @ts-expect-error - memory is non-standard
    info.memory = performance.memory.jsHeapSizeLimit
  }
  
  // @ts-expect-error - connection is experimental
  if (navigator.connection) {
    // @ts-expect-error - connection is experimental
    info.connection = navigator.connection.effectiveType
  }
  
  if (navigator.hardwareConcurrency) {
    info.hardwareConcurrency = navigator.hardwareConcurrency
  }
  
  return info
}
