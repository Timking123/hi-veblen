import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export interface ScrollAnimationOptions {
  threshold?: number // 元素进入视口的阈值 (0-1)
  rootMargin?: string // 视口边距
  once?: boolean // 是否只触发一次
  animationClass?: string // 动画类名
}

export interface ParallaxOptions {
  speed?: number // 视差速度 (0-1, 值越小移动越慢)
  direction?: 'vertical' | 'horizontal' // 视差方向
}

/**
 * 滚动动画系统 Composable
 * 提供元素进入视口检测、滚动触发动画和视差滚动效果
 */
export function useScroll() {
  const scrollY = ref(0)
  const scrollDirection = ref<'up' | 'down'>('down')
  const isScrolling = ref(false)
  let lastScrollY = 0
  let scrollTimeout: number | null = null

  // 更新滚动位置
  const updateScroll = () => {
    const currentScrollY = window.scrollY
    scrollY.value = currentScrollY
    scrollDirection.value = currentScrollY > lastScrollY ? 'down' : 'up'
    lastScrollY = currentScrollY

    isScrolling.value = true
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    scrollTimeout = window.setTimeout(() => {
      isScrolling.value = false
    }, 150)
  }

  onMounted(() => {
    scrollY.value = window.scrollY
    lastScrollY = window.scrollY
    window.addEventListener('scroll', updateScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', updateScroll)
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
  })

  return {
    scrollY,
    scrollDirection,
    isScrolling,
  }
}

/**
 * 元素进入视口检测和动画触发
 * @param elementRef 要观察的元素引用
 * @param options 动画选项
 */
export function useScrollAnimation(
  elementRef: Ref<HTMLElement | null>,
  options: ScrollAnimationOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    once = true,
    animationClass = 'animate-fadeInUp',
  } = options

  const isVisible = ref(false)
  const hasAnimated = ref(false)
  let observer: IntersectionObserver | null = null

  const startObserving = () => {
    if (!elementRef.value) return

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true

            // 添加动画类
            if (elementRef.value && !hasAnimated.value) {
              elementRef.value.classList.add(animationClass)
              hasAnimated.value = true

              // 如果只触发一次，停止观察
              if (once && observer) {
                observer.disconnect()
              }
            }
          } else {
            isVisible.value = false

            // 如果不是只触发一次，移除动画类以便重新触发
            if (!once && elementRef.value && hasAnimated.value) {
              elementRef.value.classList.remove(animationClass)
              hasAnimated.value = false
            }
          }
        })
      },
      {
        threshold,
        rootMargin,
      }
    )

    observer.observe(elementRef.value)
  }

  const stopObserving = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  onMounted(() => {
    startObserving()
  })

  onUnmounted(() => {
    stopObserving()
  })

  return {
    isVisible,
    hasAnimated,
  }
}

/**
 * 视差滚动效果
 * @param elementRef 要应用视差效果的元素引用
 * @param options 视差选项
 */
export function useParallax(elementRef: Ref<HTMLElement | null>, options: ParallaxOptions = {}) {
  const { speed = 0.5, direction = 'vertical' } = options

  const parallaxOffset = ref(0)

  const updateParallax = () => {
    if (!elementRef.value) return

    const rect = elementRef.value.getBoundingClientRect()
    const scrolled = window.scrollY
    const elementTop = rect.top + scrolled

    // 计算元素相对于视口的位置
    const viewportHeight = window.innerHeight
    const elementOffset = scrolled - elementTop + viewportHeight

    // 计算视差偏移量
    const offset = elementOffset * speed

    parallaxOffset.value = offset

    // 应用变换
    if (direction === 'vertical') {
      elementRef.value.style.transform = `translateY(${-offset}px)`
    } else {
      elementRef.value.style.transform = `translateX(${-offset}px)`
    }
  }

  onMounted(() => {
    updateParallax()
    window.addEventListener('scroll', updateParallax, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', updateParallax)
  })

  return {
    parallaxOffset,
  }
}

/**
 * 批量元素滚动动画
 * 用于为多个元素添加交错动画效果
 */
export function useStaggeredAnimation(
  elementsRef: Ref<HTMLElement[]>,
  options: ScrollAnimationOptions & { staggerDelay?: number } = {}
) {
  const { threshold = 0.1, rootMargin = '0px', staggerDelay = 100 } = options

  const visibleElements = ref<Set<number>>(new Set())
  let observer: IntersectionObserver | null = null

  const startObserving = () => {
    if (!elementsRef.value || elementsRef.value.length === 0) return

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement
          const index = elementsRef.value.indexOf(element)

          if (entry.isIntersecting && index !== -1) {
            visibleElements.value.add(index)

            // 添加交错延迟
            setTimeout(() => {
              element.classList.add('animate-fadeInUp')
            }, index * staggerDelay)
          }
        })
      },
      {
        threshold,
        rootMargin,
      }
    )

    elementsRef.value.forEach((element) => {
      if (element) {
        observer!.observe(element)
      }
    })
  }

  const stopObserving = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  onMounted(() => {
    startObserving()
  })

  onUnmounted(() => {
    stopObserving()
  })

  return {
    visibleElements,
  }
}
