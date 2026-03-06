import { ref, onMounted, onUnmounted, Ref } from 'vue'

/**
 * Composable for lazy loading images and components
 * Uses Intersection Observer API to detect when elements enter viewport
 */
export function useLazyLoad(options: IntersectionObserverInit = {}) {
  const isVisible = ref(false)
  const target: Ref<HTMLElement | null> = ref(null)
  let observer: IntersectionObserver | null = null

  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px', // Start loading 50px before entering viewport
    threshold: 0.01,
    ...options,
  }

  onMounted(() => {
    if (!target.value) return

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isVisible.value) {
          isVisible.value = true
          // Once loaded, disconnect observer to save resources
          if (observer && target.value) {
            observer.unobserve(target.value)
          }
        }
      })
    }, defaultOptions)

    observer.observe(target.value)
  })

  onUnmounted(() => {
    if (observer && target.value) {
      observer.unobserve(target.value)
      observer.disconnect()
    }
  })

  return {
    isVisible,
    target,
  }
}

/**
 * Composable for lazy loading multiple elements
 */
export function useLazyLoadMultiple(options: IntersectionObserverInit = {}) {
  const visibleItems = ref<Set<string>>(new Set())
  const targets = ref<Map<string, HTMLElement>>(new Map())
  let observer: IntersectionObserver | null = null

  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
    ...options,
  }

  const observe = (id: string, element: HTMLElement) => {
    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const elementId = (entry.target as HTMLElement).dataset.lazyId
          if (elementId && entry.isIntersecting && !visibleItems.value.has(elementId)) {
            visibleItems.value.add(elementId)
            observer?.unobserve(entry.target)
          }
        })
      }, defaultOptions)
    }

    element.dataset.lazyId = id
    targets.value.set(id, element)
    observer.observe(element)
  }

  const isVisible = (id: string) => visibleItems.value.has(id)

  onUnmounted(() => {
    if (observer) {
      targets.value.forEach((element) => {
        observer?.unobserve(element)
      })
      observer.disconnect()
    }
  })

  return {
    observe,
    isVisible,
    visibleItems,
  }
}
