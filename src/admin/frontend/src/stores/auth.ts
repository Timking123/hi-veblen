/**
 * 认证状态管理
 * 管理用户登录状态和 Token
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: number
  username: string
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const user = ref<User | null>(null)
  
  // 计算属性
  const isLoggedIn = computed(() => !!token.value)
  
  // 设置 Token
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('admin_token', newToken)
  }
  
  // 清除 Token
  const clearToken = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('admin_token')
  }
  
  // 设置用户信息
  const setUser = (newUser: User) => {
    user.value = newUser
  }
  
  // 登出
  const logout = () => {
    clearToken()
  }
  
  return {
    token,
    user,
    isLoggedIn,
    setToken,
    clearToken,
    setUser,
    logout
  }
})
