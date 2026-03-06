/**
 * 访问统计工具模块
 * 
 * 提供网站访问统计上报功能，包括：
 * - 页面访问记录
 * - 设备信息检测
 * - 浏览器信息检测
 * - 会话管理
 * 
 * 需求: 2.1.1 - 显示今日/本周/本月访问量（PV/UV）
 * 需求: 2.2.3 - 使用柱状图展示访客来源分析（设备类型、浏览器）
 * 
 * @module analytics
 */

/**
 * 访问数据接口
 */
export interface VisitData {
  /** 访问的页面路径 */
  page: string
  /** 设备类型 */
  deviceType?: string
  /** 浏览器名称 */
  browser?: string
  /** 来源页面 */
  referrer?: string
  /** 会话 ID */
  sessionId?: string
  /** User Agent */
  userAgent?: string
}

/**
 * API 响应接口
 */
interface ApiResponse {
  success: boolean
  id?: number
  message?: string
}

// ========== 常量配置 ==========

/** API 基础地址 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/** 是否启用访问统计 */
const ANALYTICS_ENABLED = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

/** 会话 ID 存储键 */
const SESSION_ID_KEY = 'analytics_session_id'

/** 会话过期时间（30 分钟，毫秒） */
const SESSION_EXPIRY = 30 * 60 * 1000

/** 会话时间戳存储键 */
const SESSION_TIMESTAMP_KEY = 'analytics_session_timestamp'

/** 已上报页面存储键（用于去重） */
const REPORTED_PAGES_KEY = 'analytics_reported_pages'

/** 访问已上报标记键 */
const VISIT_REPORTED_KEY = 'analytics_visit_reported'

// ========== 设备检测 ==========

/**
 * 检测设备类型
 * 
 * @returns 设备类型：desktop（桌面端）、tablet（平板）、mobile（移动端）
 */
export function detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
  const userAgent = navigator.userAgent.toLowerCase()
  
  // 检测平板设备
  const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent)
  if (isTablet) {
    return 'tablet'
  }
  
  // 检测移动设备
  const isMobile = /iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/i.test(userAgent)
  if (isMobile) {
    return 'mobile'
  }
  
  // 默认为桌面端
  return 'desktop'
}

/**
 * 检测浏览器名称
 * 
 * @returns 浏览器名称
 */
export function detectBrowser(): string {
  const userAgent = navigator.userAgent
  
  // 检测顺序很重要，因为某些浏览器的 UA 包含多个浏览器名称
  
  // Edge（新版基于 Chromium）
  if (userAgent.includes('Edg/')) {
    return 'Edge'
  }
  
  // Opera
  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) {
    return 'Opera'
  }
  
  // Chrome
  if (userAgent.includes('Chrome') && !userAgent.includes('Chromium')) {
    return 'Chrome'
  }
  
  // Safari
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari'
  }
  
  // Firefox
  if (userAgent.includes('Firefox')) {
    return 'Firefox'
  }
  
  // IE
  if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
    return 'IE'
  }
  
  // 其他浏览器
  return 'Other'
}

// ========== 会话管理 ==========

/**
 * 生成唯一的会话 ID
 * 
 * @returns 会话 ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomPart}`
}

/**
 * 获取或创建会话 ID
 * 会话在 30 分钟无活动后过期
 * 
 * @returns 会话 ID
 */
export function getSessionId(): string {
  try {
    const storedSessionId = sessionStorage.getItem(SESSION_ID_KEY)
    const storedTimestamp = sessionStorage.getItem(SESSION_TIMESTAMP_KEY)
    
    const now = Date.now()
    
    // 检查会话是否存在且未过期
    if (storedSessionId && storedTimestamp) {
      const lastActivity = parseInt(storedTimestamp, 10)
      if (now - lastActivity < SESSION_EXPIRY) {
        // 更新活动时间
        sessionStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString())
        return storedSessionId
      }
    }
    
    // 创建新会话
    const newSessionId = generateSessionId()
    sessionStorage.setItem(SESSION_ID_KEY, newSessionId)
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString())
    
    return newSessionId
  } catch {
    // sessionStorage 不可用时，每次生成新的会话 ID
    return generateSessionId()
  }
}

// ========== 访问统计上报 ==========

/**
 * 上报页面访问
 * 同一会话内只上报一次（无论访问多少页面）
 * 
 * @param page - 页面路径
 * @returns 是否上报成功
 */
export async function trackPageView(page: string): Promise<boolean> {
  // 检查是否启用访问统计
  if (!ANALYTICS_ENABLED) {
    console.debug('[Analytics] 访问统计已禁用')
    return false
  }
  
  try {
    // 检查本次会话是否已经上报过
    const visitReported = sessionStorage.getItem(VISIT_REPORTED_KEY)
    if (visitReported === 'true') {
      console.debug('[Analytics] 本次会话已上报，跳过:', page)
      return true // 返回 true 表示不需要再上报
    }
    
    const visitData: VisitData = {
      page,
      deviceType: detectDeviceType(),
      browser: detectBrowser(),
      referrer: document.referrer || undefined,
      sessionId: getSessionId(),
      userAgent: navigator.userAgent
    }
    
    const response = await fetch(`${API_BASE_URL}/dashboard/visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(visitData)
    })
    
    if (!response.ok) {
      console.warn('[Analytics] 访问统计上报失败:', response.status)
      return false
    }
    
    const result: ApiResponse = await response.json()
    
    if (result.success) {
      // 标记本次会话已上报
      sessionStorage.setItem(VISIT_REPORTED_KEY, 'true')
      console.debug('[Analytics] 访问统计上报成功:', page)
      return true
    } else {
      console.warn('[Analytics] 访问统计上报失败:', result.message)
      return false
    }
  } catch (error) {
    // 静默处理错误，不影响用户体验
    console.debug('[Analytics] 访问统计上报异常:', error)
    return false
  }
}

/**
 * 初始化访问统计
 * 在应用启动时调用，自动跟踪页面访问
 * 
 * @param router - Vue Router 实例（可选）
 */
export function initAnalytics(router?: { afterEach: (callback: (to: { path: string }) => void) => void }): void {
  if (!ANALYTICS_ENABLED) {
    console.debug('[Analytics] 访问统计已禁用，跳过初始化')
    return
  }
  
  // 上报当前页面访问
  trackPageView(window.location.pathname)
  
  // 如果提供了 router，监听路由变化
  if (router) {
    router.afterEach((to) => {
      trackPageView(to.path)
    })
    console.debug('[Analytics] 已启用路由监听')
  }
  
  console.debug('[Analytics] 访问统计初始化完成')
}
