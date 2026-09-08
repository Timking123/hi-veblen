import { vi } from 'vitest'

/** 仅提供浏览器能力替身，游戏状态与资源管理代码仍执行真实实现。 */
export class CanvasContext {
  constructor(public canvas: HTMLCanvasElement) {}
  fillStyle = ''
  strokeStyle = ''
  lineWidth = 1
  font = ''
  textAlign = 'left'
  textBaseline = 'top'
  globalAlpha = 1
  fillRect = vi.fn()
  strokeRect = vi.fn()
  clearRect = vi.fn()
  beginPath = vi.fn()
  closePath = vi.fn()
  moveTo = vi.fn()
  lineTo = vi.fn()
  arc = vi.fn()
  ellipse = vi.fn()
  fill = vi.fn()
  stroke = vi.fn()
  fillText = vi.fn()
  strokeText = vi.fn()
  measureText = vi.fn(() => ({ width: 10 }))
  save = vi.fn()
  restore = vi.fn()
  translate = vi.fn()
  rotate = vi.fn()
  scale = vi.fn()
  drawImage = vi.fn()
  createLinearGradient = vi.fn(() => ({ addColorStop: vi.fn() }))
  createRadialGradient = vi.fn(() => ({ addColorStop: vi.fn() }))
  getImageData = vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }))
  putImageData = vi.fn()
}

export class TestAudio extends EventTarget {
  static failLoading = false
  static created: TestAudio[] = []
  volume = 1
  loop = false
  paused = true
  currentTime = 0
  constructor(public src = '') {
    super()
    TestAudio.created.push(this)
  }
  play = vi.fn(async () => { this.paused = false })
  pause = vi.fn(() => { this.paused = true })
  load() {
    queueMicrotask(() => this.dispatchEvent(new Event(TestAudio.failLoading ? 'error' : 'canplaythrough')))
  }
}

export class TestAudioContext {
  state = 'running'
  resume = vi.fn(async () => { this.state = 'running' })
  close = vi.fn(async () => { this.state = 'closed' })
}

export class TestImage {
  static mode: 'load' | 'error' | 'pending' = 'load'
  onload: (() => void) | null = null
  onerror: ((event: Event) => void) | null = null
  private source = ''
  get src() { return this.source }
  set src(value: string) {
    this.source = value
    queueMicrotask(() => {
      if (TestImage.mode === 'load') this.onload?.()
      if (TestImage.mode === 'error') this.onerror?.(new Event('error'))
    })
  }
}

export function installGameEnvironment() {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasContext>()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let context = contexts.get(this)
    if (!context) { context = new CanvasContext(this); contexts.set(this, context) }
    return context as unknown as CanvasRenderingContext2D
  })
  TestAudio.failLoading = false
  TestAudio.created = []
  TestImage.mode = 'load'
  vi.stubGlobal('Audio', TestAudio)
  vi.stubGlobal('AudioContext', TestAudioContext)
  vi.stubGlobal('webkitAudioContext', TestAudioContext)
  vi.stubGlobal('Image', TestImage)
  // 由测试显式驱动帧回调，不留下后台帧或访问外部音频/图片。
  const frames = vi.fn((_callback: FrameRequestCallback) => 1)
  vi.stubGlobal('requestAnimationFrame', frames)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  return { contexts, frames }
}
