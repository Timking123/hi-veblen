import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // State
  const loading = ref(false)
  const currentRoute = ref('')
  const isMobile = ref(false)
  const routeHistory = ref<string[]>([])
  const routeDirection = ref<'forward' | 'backward'>('forward')

  // Actions
  function setLoading(value: boolean) {
    loading.value = value
  }

  function setCurrentRoute(route: string) {
    currentRoute.value = route
  }

  function setIsMobile(value: boolean) {
    isMobile.value = value
  }

  function pushRouteHistory(route: string) {
    routeHistory.value.push(route)
  }

  function popRouteHistory(): string | undefined {
    return routeHistory.value.pop()
  }

  function setRouteDirection(direction: 'forward' | 'backward') {
    routeDirection.value = direction
  }

  function getRouteHistory(): string[] {
    return [...routeHistory.value]
  }

  return {
    loading,
    currentRoute,
    isMobile,
    routeHistory,
    routeDirection,
    setLoading,
    setCurrentRoute,
    setIsMobile,
    pushRouteHistory,
    popRouteHistory,
    setRouteDirection,
    getRouteHistory,
  }
})
