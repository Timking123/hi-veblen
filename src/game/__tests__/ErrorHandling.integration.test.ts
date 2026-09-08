/**
 * 通过真实引擎与资源管理器验证异常边界；浏览器能力由合成替身提供。
 * 运行时错误遵循需求 20.3：记录并停止，等待用户重试，不带错继续生成帧。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameEngine } from '../GameEngine'
import { SoundEffect } from '../AudioSystem'
import { ResourceManager, ResourceLoadError, ResourceTimeoutError } from '../ResourceManager'
import { MemoryManager } from '../MemoryManager'
import { PoolManager } from '../PoolManager'
import { PixelArtRenderer } from '../PixelArtRenderer'
import { PERFORMANCE_CONFIG } from '../constants'
import type { Entity } from '../types'
import { installGameEnvironment, TestAudio, TestAudioContext, TestImage } from './gameEnvironment'

describe('集成测试 33.3: 错误处理', () => {
  let canvas: HTMLCanvasElement
  let engine: GameEngine
  let environment: ReturnType<typeof installGameEnvironment>
  const memoryDescriptor = Object.getOwnPropertyDescriptor(performance, 'memory')
  const setMemory = (usedMB: number) => Object.defineProperty(performance, 'memory', {
    value: { usedJSHeapSize: usedMB * 1024 ** 2, totalJSHeapSize: 100 * 1024 ** 2, jsHeapSizeLimit: 100 * 1024 ** 2 },
    configurable: true,
  })
  const entity = (id: string): Entity => ({
    id, x: 10, y: 10, width: 10, height: 10, isActive: true,
    update: vi.fn(), render: vi.fn(), onCollision: vi.fn(),
  })

  beforeEach(() => {
    vi.useFakeTimers()
    environment = installGameEnvironment()
    setMemory(20)
    canvas = document.createElement('canvas')
    engine = new GameEngine(canvas)
  })
  afterEach(async () => {
    engine.stop()
    engine.getAudioSystem().cleanup()
    await vi.advanceTimersByTimeAsync(500)
    MemoryManager.getInstance().destroy()
    ResourceManager.getInstance().destroy()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    if (memoryDescriptor) Object.defineProperty(performance, 'memory', memoryDescriptor)
    else Reflect.deleteProperty(performance, 'memory')
  })

  it('关键音频加载失败时引擎仍能以降级模式启动', async () => {
    TestAudio.failLoading = true
    await expect(engine.initializeAudio()).resolves.toBeUndefined()
    expect(() => engine.start()).not.toThrow()
    expect(environment.frames).toHaveBeenCalledTimes(1)
  })

  it('音频上下文不可用时由引擎捕获并记录初始化失败', async () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(engine.initializeAudio()).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledWith('[游戏引擎] 音频系统初始化失败:', expect.any(Error))
    expect(() => engine.start()).not.toThrow()
  })

  it('合法音效对应的文件缺失时记录错误且不产生未处理拒绝', async () => {
    TestAudio.failLoading = true
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    engine.getAudioSystem().playSoundEffect(SoundEffect.PLAYER_GUN_FIRE)
    await vi.advanceTimersByTimeAsync(0)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('加载音效失败'), expect.any(Error))
  })

  it('媒体解码或加载错误通过真实资源入口返回类型化错误', async () => {
    TestAudio.failLoading = true
    await expect(ResourceManager.getInstance().loadAudio('/synthetic-broken.mp3')).rejects.toBeInstanceOf(ResourceLoadError)
  })

  it('资源在完整截止时间前未就绪时返回超时错误', async () => {
    TestImage.mode = 'pending'
    const settled = ResourceManager.getInstance().loadImage('/synthetic-pending.png').catch(error => error)
    let finished = false
    void settled.then(() => { finished = true })
    await vi.advanceTimersByTimeAsync(9999)
    expect(finished).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await settled).toBeInstanceOf(ResourceTimeoutError)
  })

  it('超时后清除同一资源的在途状态并允许显式重试', async () => {
    const manager = ResourceManager.getInstance()
    TestImage.mode = 'pending'
    const failed = manager.loadImage('/synthetic-retry.png').catch(error => error)
    await vi.advanceTimersByTimeAsync(10000)
    expect(await failed).toBeInstanceOf(ResourceTimeoutError)
    TestImage.mode = 'load'
    await expect(manager.loadImage('/synthetic-retry.png')).resolves.toHaveProperty('src', '/synthetic-retry.png')
  })

  it('资源加载完成时取消其超时定时器', async () => {
    const timersBefore = vi.getTimerCount()
    await ResourceManager.getInstance().loadImage('/synthetic-ready.png')
    expect(vi.getTimerCount()).toBe(timersBefore)
    await vi.advanceTimersByTimeAsync(10000)
    expect(vi.getTimerCount()).toBe(timersBefore)
  })

  it('多项资源失败后仍能独立加载后续合法资源', async () => {
    const manager = ResourceManager.getInstance()
    TestImage.mode = 'error'
    const results = await Promise.allSettled(['/a.png', '/b.png', '/c.png'].map(url => manager.loadImage(url)))
    expect(results.map(result => result.status)).toEqual(['rejected', 'rejected', 'rejected'])
    TestImage.mode = 'load'
    await expect(manager.loadImage('/ok.png')).resolves.toHaveProperty('src', '/ok.png')
  })

  it('真实Canvas接口返回空上下文时提供明确错误', () => {
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    expect(() => new GameEngine(canvas)).toThrow('无法获取 Canvas 2D 上下文')
  })

  it('渲染异常时恢复画布状态并停止调度下一帧', () => {
    const context = environment.contexts.get(canvas)!
    context.fillRect.mockImplementationOnce(() => { throw new Error('合成渲染错误') })
    const failure = vi.fn()
    engine.setOnError(failure)
    expect(() => engine.start()).not.toThrow()
    expect(context.restore).toHaveBeenCalledTimes(1)
    expect(environment.frames).not.toHaveBeenCalled()
    expect(failure).toHaveBeenCalledTimes(1)
    expect(engine.getMemoryManager().getStats().isMonitoring).toBe(false)
  })

  it('像素缓存清空后能够由真实渲染器重新构造', () => {
    const renderer = new PixelArtRenderer()
    const context = canvas.getContext('2d')!
    renderer.renderPlayerShip(context, 100, 100)
    const draw = environment.contexts.get(canvas)!.drawImage
    const previousSprite = draw.mock.calls.at(-1)?.[0]
    expect(previousSprite).toBeDefined()
    renderer.clearCache()
    renderer.renderPlayerShip(context, 100, 100)
    expect(draw.mock.calls.at(-1)?.[0]).not.toBe(previousSprite)
    expect(renderer.getCacheStats().totalSprites).toBeGreaterThan(0)
  })

  it('大量合法实体通过实际渲染循环且可停止', () => {
    for (let index = 0; index < 1000; index++) engine.addEntity(entity('synthetic-' + index))
    expect(() => engine.start()).not.toThrow()
    expect(engine.getEntities()).toHaveLength(1000)
    engine.stop()
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })

  it('高内存使用触发已注册清理回调', () => {
    setMemory(95)
    const cleanup = vi.fn()
    engine.getMemoryManager().registerCleanupCallback(cleanup)
    engine.getMemoryManager().startMonitoring()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('严重内存压力收缩真实对象池', () => {
    setMemory(95)
    const shrink = vi.spyOn(PoolManager.getInstance(), 'shrink')
    engine.getMemoryManager().startMonitoring()
    expect(shrink).toHaveBeenCalled()
  })

  it('内存压力后的缓存清理不阻止后续绘制', () => {
    const renderer = new PixelArtRenderer()
    renderer.renderPlayerShip(canvas.getContext('2d')!, 100, 100)
    const draw = environment.contexts.get(canvas)!.drawImage
    const previousSprite = draw.mock.calls.at(-1)?.[0]
    expect(previousSprite).toBeDefined()
    engine.getMemoryManager().registerCleanupCallback(() => renderer.clearCache())
    setMemory(95)
    engine.getMemoryManager().startMonitoring()
    expect(() => renderer.renderPlayerShip(canvas.getContext('2d')!, 100, 100)).not.toThrow()
    expect(draw.mock.calls.at(-1)?.[0]).not.toBe(previousSprite)
  })

  it('连续十次增长样本达到泄漏判据时发出警告', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    engine.getMemoryManager().startMonitoring()
    for (let index = 1; index <= 9; index++) {
      setMemory(20 + index * 3)
      await vi.advanceTimersByTimeAsync(PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL)
    }
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('可能的内存泄漏'))
  })

  it('内存超过阈值时报告不可继续分配的压力状态', () => {
    setMemory(98)
    expect(engine.getMemoryManager().isMemoryExceeded()).toBe(true)
    setMemory(20)
    expect(engine.getMemoryManager().isMemoryExceeded()).toBe(false)
  })

  it('运行中错误及错误回调自身失败时仍停止游戏', () => {
    engine.setOnError(() => { throw new Error('合成回调错误') })
    engine.setOnUpdate(() => { throw new Error('合成更新错误') })
    expect(() => engine.start()).not.toThrow()
    expect(environment.frames).not.toHaveBeenCalled()
    expect(engine.getMemoryManager().getStats().isMonitoring).toBe(false)
  })

  it('音频初始化失败后可在能力恢复时显式重新初始化', async () => {
    const audio = engine.getAudioSystem()
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    await expect(audio.initialize()).rejects.toThrow('AudioContext')
    vi.stubGlobal('AudioContext', TestAudioContext)
    await expect(audio.initialize()).resolves.toBeUndefined()
    expect(audio.getLoadingProgress().loaded).toBeGreaterThan(0)
  })

  it('故障后显式清理状态并重新开始', () => {
    engine.setOnError(vi.fn())
    engine.setOnUpdate(() => { throw new Error('合成失败') })
    engine.addEntity(entity('discard'))
    engine.start()
    engine.clearEntities()
    engine.setOnUpdate(() => {})
    engine.start()
    expect(engine.getEntities()).toHaveLength(0)
    expect(environment.frames).toHaveBeenCalledTimes(1)
  })

  it('严重错误以固定用户消息通知外层而不泄漏内部异常正文', () => {
    const failure = vi.fn()
    engine.setOnError(failure)
    engine.setOnUpdate(() => { throw new Error('synthetic-internal-details') })
    engine.start()
    expect(failure).toHaveBeenCalledWith('游戏运行时发生错误，请重试或返回网站')
  })

  it('后续动画帧中的异常同样被捕获，且不再请求下一帧', () => {
    const failure = vi.fn()
    engine.setOnError(failure)
    engine.start()
    const nextFrame = environment.frames.mock.calls[0]![0]
    engine.setOnUpdate(() => { throw new Error('合成后续帧错误') })
    expect(() => nextFrame(16)).not.toThrow()
    expect(environment.frames).toHaveBeenCalledTimes(1)
    expect(failure).toHaveBeenCalledTimes(1)
  })
})
