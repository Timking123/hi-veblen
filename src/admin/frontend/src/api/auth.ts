/**
 * 认证相关 API
 */
import request from './request'
import type { LoginRequest, LoginResponse, User } from '@/types'

/**
 * 用户登录
 */
export const login = (data: LoginRequest): Promise<LoginResponse> => {
  return request.post('/auth/login', data)
}

/**
 * 用户登出
 */
export const logout = (): Promise<{ success: boolean }> => {
  return request.post('/auth/logout')
}

/**
 * 获取当前用户信息
 */
export const getProfile = (): Promise<{ user: User }> => {
  return request.get('/auth/profile')
}

/**
 * 修改密码
 */
export const changePassword = (data: { oldPassword: string; newPassword: string }): Promise<{ success: boolean }> => {
  return request.put('/auth/password', data)
}
