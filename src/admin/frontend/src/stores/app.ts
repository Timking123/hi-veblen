/**
 * 应用状态管理
 * 管理全局应用状态
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 侧边栏折叠状态
  const sidebarCollapsed = ref(false)
  
  // 全局加载状态
  const loading = ref(false)
  
  // 切换侧边栏折叠状态
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
  
  // 设置加载状态
  const setLoading = (value: boolean) => {
    loading.value = value
  }
  
  return {
    sidebarCollapsed,
    loading,
    toggleSidebar,
    setLoading
  }
})
