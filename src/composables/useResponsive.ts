import { ref, onMounted, onUnmounted } from 'vue'

export interface Breakpoints {
  mobile: number
  tablet: number
  desktop: number
}

const defaultBreakpoints: Breakpoints = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
}

export function useResponsive(breakpoints: Breakpoints = defaultBreakpoints) {
  const windowWidth = ref(0)
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)

  const updateWidth = () => {
    windowWidth.value = window.innerWidth
    isMobile.value = windowWidth.value < breakpoints.tablet
    isTablet.value =
      windowWidth.value >= breakpoints.tablet && windowWidth.value < breakpoints.desktop
    isDesktop.value = windowWidth.value >= breakpoints.desktop
  }

  onMounted(() => {
    updateWidth()
    window.addEventListener('resize', updateWidth)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateWidth)
  })

  return {
    windowWidth,
    isMobile,
    isTablet,
    isDesktop,
  }
}
