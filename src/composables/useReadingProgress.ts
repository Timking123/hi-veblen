/**
 * useReadingProgress Composable
 * 计算页面滚动阅读进度
 * 
 * 进度计算公式：
 * progress = (scrollTop / (docHeight - viewportHeight)) * 100
 * 
 * 结果范围：[0, 100]
 * - 0: 页面顶部
 * - 100: 页面底部
 * 
 * @module useReadingProgress
 * @see 需求 8.2
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * useReadingProgress 返回值接口
 */
export interface UseReadingProgressReturn {
  /** 当前阅读进度百分比 (0-100) */
  progress: Ref<number>
}

/**
 * 计算阅读进度百分比
 * 
 * @param scrollTop - 当前滚动位置
 * @param docHeight - 文档总高度
 * @param viewportHeight - 视口高度
 * @returns 进度百分比 (0-100)
 */
export function calculateProgress(
  scrollTop: number,
  docHeight: number,
  viewportHeight: number
): number {
  // 可滚动的最大距离
  const maxScrollDistance = docHeight - viewportHeight
  
  // 如果文档高度小于等于视口高度，无法滚动，进度为 0
  if (maxScrollDistance <= 0) {
    return 0
  }
  
  // 计算进度百分比
  const rawProgress = (scrollTop / maxScrollDistance) * 100
  
  // 确保结果在 [0, 100] 范围内
  return Math.max(0, Math.min(rawProgress, 100))
}

/**
 * 阅读进度 Composable
 * 
 * 监听页面滚动事件，实时计算当前阅读进度百分比。
 * 使用 passive 事件监听器以优化滚动性能。
 * 
 * @returns 包含响应式进度值的对象
 * 
 * @example
 * ```typescript
 * import { useReadingProgress } from '@/composables/useReadingProgress'
 * 
 * // 在组件中使用
 * const { progress } = useReadingProgress()
 * 
 * // 在模板中显示进度条
 * // <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
 * ```
 */
export function useReadingProgress(): UseReadingProgressReturn {
  const progress = ref(0)
  
  /**
   * 更新进度值
   * 从 DOM 获取当前滚动位置和文档尺寸，计算进度
   */
  const updateProgress = (): void => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight
    const viewportHeight = window.innerHeight
    
    progress.value = calculateProgress(scrollTop, docHeight, viewportHeight)
  }
  
  onMounted(() => {
    // 使用 passive 选项优化滚动性能
    window.addEventListener('scroll', updateProgress, { passive: true })
    // 初始化进度值
    updateProgress()
  })
  
  onUnmounted(() => {
    window.removeEventListener('scroll', updateProgress)
  })
  
  return { progress }
}

export default useReadingProgress
