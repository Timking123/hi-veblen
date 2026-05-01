export interface WebVitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

const rate = (name: string, value: number): WebVitalMetric['rating'] => {
  if (name === 'LCP') return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
  if (name === 'CLS') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
  if (name === 'FID') return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor'
  return 'good'
}

const emitMetric = (metric: WebVitalMetric) => {
  window.dispatchEvent(new CustomEvent('hyj:web-vital', { detail: metric }))
  if (import.meta.env.DEV) {
    console.info(`[WebVital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`)
  }
}

export const initWebVitals = () => {
  if (typeof PerformanceObserver === 'undefined') return

  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const last = entries[entries.length - 1]
      if (last) emitMetric({ name: 'LCP', value: last.startTime, rating: rate('LCP', last.startTime) })
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {}

  try {
    let cls = 0
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean }
        if (!layoutShift.hadRecentInput) cls += layoutShift.value || 0
      }
      emitMetric({ name: 'CLS', value: cls, rating: rate('CLS', cls) })
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  } catch {}

  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const first = entryList.getEntries()[0] as PerformanceEventTiming | undefined
      if (first) {
        const value = first.processingStart - first.startTime
        emitMetric({ name: 'FID', value, rating: rate('FID', value) })
      }
    })
    fidObserver.observe({ type: 'first-input', buffered: true })
  } catch {}
}
