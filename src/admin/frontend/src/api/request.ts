/**
 * Axios 请求配置
 * 配置请求/响应拦截器，处理 Token 和错误
 * 包含 CSRF Token 支持
 */
import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 获取 API 基础地址（支持环境变量配置）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// CSRF Token Cookie 名称
const CSRF_COOKIE_NAME = 'csrf_token'
// CSRF Token 请求头名称
const CSRF_HEADER_NAME = 'X-CSRF-Token'

// Token 存储键名
const TOKEN_KEY = 'admin_token'

// 内存中缓存的 token（解决竞态条件问题）
let cachedToken: string | null = null

/**
 * 设置 Token（同时更新内存缓存和 localStorage）
 * 供 Login 组件调用，确保 token 立即可用
 */
export function setAuthToken(token: string): void {
  cachedToken = token
  localStorage.setItem(TOKEN_KEY, token)
  console.log('[Request] Token 已设置到内存和 localStorage')
}

/**
 * 清除 Token
 */
export function clearAuthToken(): void {
  cachedToken = null
  localStorage.removeItem(TOKEN_KEY)
  console.log('[Request] Token 已清除')
}

/**
 * 获取当前 Token（优先从内存缓存获取）
 */
export function getAuthToken(): string | null {
  // 优先使用内存缓存的 token
  if (cachedToken) {
    return cachedToken
  }
  // 回退到 localStorage
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    cachedToken = token // 同步到内存缓存
  }
  return token
}

/**
 * 从 Cookie 中获取 CSRF Token
 */
function getCsrfToken(): string | null {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_COOKIE_NAME) {
      return value
    }
  }
  return null
}

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  // 允许携带 Cookie（用于 CSRF Token）
  withCredentials: true
})

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 使用 getAuthToken 获取 Token（优先内存缓存）
    const token = getAuthToken()
    
    // 如果有 Token，添加到请求头
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('[Request] 请求携带 Token:', config.url)
    } else {
      console.log('[Request] 请求无 Token:', config.url)
    }
    
    // 添加 CSRF Token（仅对非 GET 请求）
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      const csrfToken = getCsrfToken()
      if (csrfToken && config.headers) {
        config.headers[CSRF_HEADER_NAME] = csrfToken
      }
    }
    
    return config
  },
  (error: AxiosError) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 直接返回响应数据
    return response.data
  },
  (error: AxiosError<{ message?: string; code?: number }>) => {
    const { response } = error
    
    if (response) {
      const { status, data } = response
      
      switch (status) {
        case 401:
          // 未认证，清除 Token 并跳转到登录页
          clearAuthToken()
          ElMessage.error('登录已过期，请重新登录')
          router.push('/login')
          break
          
        case 403:
          ElMessage.error('权限不足')
          break
          
        case 404:
          ElMessage.error('请求的资源不存在')
          break
          
        case 423:
          // 账户锁定
          ElMessage.error(data?.message || '账户已被锁定，请稍后再试')
          break
          
        case 500:
          ElMessage.error('服务器内部错误')
          break
          
        default:
          ElMessage.error(data?.message || '请求失败')
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后重试')
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
    
    return Promise.reject(error)
  }
)

export default request
