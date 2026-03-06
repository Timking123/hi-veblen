/**
 * 像素艺术渲染器
 * 负责渲染所有像素艺术元素，包括玩家飞船、边框、背景等
 */

import { PIXEL_BLOCK_CONFIG, PIXEL_STYLE } from './constants'
import { ResourceManager } from './ResourceManager'

/**
 * 精灵缓存项
 */
interface CachedSprite {
  canvas: HTMLCanvasElement
  width: number
  height: number
  timestamp: number
}

/**
 * 批量渲染项
 */
interface BatchItem {
  x: number
  y: number
  data?: any
}

/**
 * 批量渲染批次
 */
interface RenderBatch {
  type: string
  items: BatchItem[]
}

/**
 * 像素艺术渲染器类
 */
export class PixelArtRenderer {
  private spriteCache: Map<string, CachedSprite> = new Map()
  private batches: Map<string, RenderBatch> = new Map()
  private pixelBlockSize: number
  private offscreenCanvas: HTMLCanvasElement
  private resourceManager: ResourceManager
  // private offscreenCtx: CanvasRenderingContext2D // 暂未使用

  constructor() {
    this.pixelBlockSize = PIXEL_BLOCK_CONFIG.SIZE
    this.resourceManager = ResourceManager.getInstance()

    // 创建离屏 Canvas 用于预渲染
    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenCanvas.width = 1000
    this.offscreenCanvas.height = 1000
    // this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
    //   alpha: true,
    //   willReadFrequently: false
    // })! // 暂未使用

    // 预渲染常用精灵图
    this.preloadCommonSprites()
  }

  /**
   * 获取像素块大小
   */
  getPixelBlockSize(): number {
    return this.pixelBlockSize
  }

  /**
   * 预加载常用精灵图
   * 在初始化时预渲染常用的精灵图到离屏 Canvas 并缓存
   */
  private preloadCommonSprites(): void {
    console.log('[像素艺术渲染器] 开始预加载常用精灵图')

    // 预渲染玩家飞船
    const playerShipKey = 'sprite_player_ship'
    if (!this.resourceManager.hasResource(playerShipKey)) {
      const playerShipCanvas = this.createPlayerShipSprite()
      this.resourceManager.getResource(playerShipKey) // 触发缓存
      this.spriteCache.set('player_ship', {
        canvas: playerShipCanvas,
        width: playerShipCanvas.width,
        height: playerShipCanvas.height,
        timestamp: Date.now()
      })
      console.log('[像素艺术渲染器] 预加载玩家飞船精灵图')
    }

    // 预渲染常用的像素块（用于批量渲染优化）
    this.preloadPixelBlocks()

    console.log('[像素艺术渲染器] 常用精灵图预加载完成')
  }

  /**
   * 预加载常用的像素块
   * 为常用颜色预渲染像素块，提高批量渲染性能
   */
  private preloadPixelBlocks(): void {
    const commonColors = [
      '#00FF00', // 玩家主色
      '#FFFFFF', // 白色
      '#FF0000', // 红色
      '#0000FF', // 蓝色
      '#FFFF00', // 黄色
      '#FF6600', // 橙色
      '#00FFFF', // 青色
      '#FF00FF', // 品红
    ]

    for (const color of commonColors) {
      const key = `pixel_block_${color}`
      if (!this.resourceManager.hasResource(key)) {
        const canvas = this.prerenderToOffscreen(
          this.pixelBlockSize,
          this.pixelBlockSize,
          (ctx) => {
            ctx.fillStyle = color
            ctx.fillRect(0, 0, this.pixelBlockSize, this.pixelBlockSize)
          }
        )
        this.spriteCache.set(key, {
          canvas,
          width: canvas.width,
          height: canvas.height,
          timestamp: Date.now()
        })
      }
    }
  }

  /**
   * 绘制单个像素块
   */
  drawPixelBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    size: number = this.pixelBlockSize
  ): void {
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)
  }

  /**
   * 绘制带阴影的像素块
   */
  drawPixelBlockWithShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    shadowColor: string,
    size: number = this.pixelBlockSize
  ): void {
    // 绘制主体
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)

    // 绘制阴影（右下角）
    ctx.fillStyle = shadowColor
    ctx.fillRect(x + size * 0.7, y + size * 0.7, size * 0.3, size * 0.3)
  }

  /**
   * 绘制带高光的像素块
   */
  drawPixelBlockWithHighlight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    highlightColor: string,
    shadowColor: string,
    size: number = this.pixelBlockSize
  ): void {
    // 绘制主体
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)

    // 绘制高光（左上角）
    ctx.fillStyle = highlightColor
    ctx.fillRect(x, y, size * 0.3, size * 0.3)

    // 绘制阴影（右下角）
    ctx.fillStyle = shadowColor
    ctx.fillRect(x + size * 0.7, y + size * 0.7, size * 0.3, size * 0.3)
  }

  /**
   * 缓存精灵图
   * 使用 ResourceManager 进行统一的资源管理
   */
  cacheSprite(key: string, renderer: () => HTMLCanvasElement): void {
    // 检查本地缓存
    if (this.spriteCache.has(key)) {
      return
    }

    // 检查 ResourceManager 缓存
    const resourceKey = `sprite_${key}`
    if (this.resourceManager.hasResource(resourceKey)) {
      const cached = this.resourceManager.getResource<CachedSprite>(resourceKey)
      if (cached) {
        this.spriteCache.set(key, cached)
        return
      }
    }

    // 渲染并缓存
    const canvas = renderer()
    const cached: CachedSprite = {
      canvas,
      width: canvas.width,
      height: canvas.height,
      timestamp: Date.now()
    }

    // 同时缓存到本地和 ResourceManager
    this.spriteCache.set(key, cached)
    
    // 注意：这里我们不直接使用 ResourceManager 的 cacheResource 方法
    // 因为它是私有的，我们通过 getResource 来触发缓存
    // 实际上精灵图已经在本地缓存中了
    console.log(`[像素艺术渲染器] 缓存精灵图: ${key}, 尺寸: ${canvas.width}x${canvas.height}`)
  }

  /**
   * 获取缓存的精灵图
   */
  getCachedSprite(key: string): CachedSprite | null {
    // 先检查本地缓存
    let cached = this.spriteCache.get(key)
    
    if (!cached) {
      // 尝试从 ResourceManager 获取
      const resourceKey = `sprite_${key}`
      const resource = this.resourceManager.getResource<CachedSprite>(resourceKey)
      cached = resource || undefined
      
      if (cached) {
        // 更新本地缓存
        this.spriteCache.set(key, cached)
      }
    }
    
    return cached || null
  }

  /**
   * 渲染缓存的精灵图
   */
  renderCachedSprite(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number
  ): boolean {
    const cached = this.getCachedSprite(key)
    if (!cached) {
      return false
    }

    ctx.drawImage(cached.canvas, x, y)
    return true
  }

  /**
   * 添加到批量渲染队列
   * 收集同类型的渲染请求，以便批量处理
   */
  addToBatch(type: string, x: number, y: number, data?: any): void {
    if (!this.batches.has(type)) {
      this.batches.set(type, { type, items: [] })
    }
    this.batches.get(type)!.items.push({ x, y, data })
  }

  /**
   * 执行批量渲染
   * 优化：遍历所有批次，批量设置渲染状态并绘制
   * 减少状态切换次数，提高渲染性能
   */
  renderBatches(ctx: CanvasRenderingContext2D): void {
    if (this.batches.size === 0) {
      return
    }
    
    for (const batch of this.batches.values()) {
      this.renderBatch(ctx, batch)
    }
    this.batches.clear()
  }

  /**
   * 渲染单个批次
   * 批量设置渲染状态，然后批量绘制所有项
   */
  private renderBatch(ctx: CanvasRenderingContext2D, batch: RenderBatch): void {
    if (batch.items.length === 0) {
      return
    }

    // 保存当前渲染状态
    ctx.save()

    // 根据批次类型设置渲染状态（一次性设置，避免重复）
    this.setupBatchRenderState(ctx, batch.type, batch.items[0].data)

    // 批量绘制所有项
    for (const item of batch.items) {
      this.renderBatchItem(ctx, batch.type, item)
    }

    // 恢复渲染状态
    ctx.restore()
  }

  /**
   * 设置批次渲染状态
   * 根据批次类型一次性设置所有渲染参数，避免在循环中重复设置
   */
  private setupBatchRenderState(
    ctx: CanvasRenderingContext2D,
    type: string,
    firstItemData?: any
  ): void {
    switch (type) {
      case 'pixel_block':
        // 像素块批次：设置填充样式
        if (firstItemData?.color) {
          ctx.fillStyle = firstItemData.color
        }
        break

      case 'pixel_block_with_shadow':
        // 带阴影的像素块：无需预设置，每个项可能有不同颜色
        break

      case 'pixel_block_with_highlight':
        // 带高光的像素块：无需预设置，每个项可能有不同颜色
        break

      case 'stars':
        // 星星批次：设置通用颜色
        if (firstItemData?.color) {
          ctx.fillStyle = firstItemData.color
        }
        break

      case 'clouds':
        // 云朵批次：设置通用颜色
        if (firstItemData?.color) {
          ctx.fillStyle = firstItemData.color
        }
        break

      case 'buildings':
        // 建筑批次：设置通用颜色
        if (firstItemData?.color) {
          ctx.fillStyle = firstItemData.color
        }
        break

      case 'cached_sprite':
        // 缓存精灵批次：设置图像平滑
        ctx.imageSmoothingEnabled = false
        break

      default:
        // 未知类型，使用默认设置
        break
    }
  }

  /**
   * 渲染批次中的单个项
   * 在已设置好渲染状态的情况下，快速绘制单个项
   */
  private renderBatchItem(
    ctx: CanvasRenderingContext2D,
    type: string,
    item: BatchItem
  ): void {
    switch (type) {
      case 'pixel_block':
        // 简单像素块：直接绘制矩形（颜色已在 setupBatchRenderState 中设置）
        if (item.data?.color && ctx.fillStyle !== item.data.color) {
          // 如果颜色不同，需要更新
          ctx.fillStyle = item.data.color
        }
        const size = item.data?.size || this.pixelBlockSize
        ctx.fillRect(item.x, item.y, size, size)
        break

      case 'pixel_block_with_shadow':
        // 带阴影的像素块
        if (item.data?.color && item.data?.shadowColor) {
          this.drawPixelBlockWithShadow(
            ctx,
            item.x,
            item.y,
            item.data.color,
            item.data.shadowColor,
            item.data?.size || this.pixelBlockSize
          )
        }
        break

      case 'pixel_block_with_highlight':
        // 带高光的像素块
        if (item.data?.color && item.data?.highlightColor && item.data?.shadowColor) {
          this.drawPixelBlockWithHighlight(
            ctx,
            item.x,
            item.y,
            item.data.color,
            item.data.highlightColor,
            item.data.shadowColor,
            item.data?.size || this.pixelBlockSize
          )
        }
        break

      case 'stars':
        // 星星：简单像素块
        const starSize = item.data?.size || this.pixelBlockSize
        ctx.fillRect(item.x, item.y, starSize, starSize)
        break

      case 'clouds':
        // 云朵：多个像素块组成
        if (item.data?.width) {
          const cloudWidth = item.data.width
          for (let bx = 0; bx < cloudWidth; bx += this.pixelBlockSize) {
            ctx.fillRect(item.x + bx, item.y, this.pixelBlockSize, this.pixelBlockSize)
            if (bx > 0 && bx < cloudWidth - this.pixelBlockSize) {
              ctx.fillRect(
                item.x + bx,
                item.y - this.pixelBlockSize,
                this.pixelBlockSize,
                this.pixelBlockSize
              )
            }
          }
        }
        break

      case 'buildings':
        // 建筑：矩形块
        if (item.data?.width && item.data?.height) {
          for (let by = 0; by < item.data.height; by += this.pixelBlockSize) {
            for (let bx = 0; bx < item.data.width; bx += this.pixelBlockSize) {
              ctx.fillRect(
                item.x + bx,
                item.y + by,
                this.pixelBlockSize,
                this.pixelBlockSize
              )
            }
          }
        }
        break

      case 'cached_sprite':
        // 缓存的精灵图：直接绘制
        if (item.data?.spriteKey) {
          const cached = this.getCachedSprite(item.data.spriteKey)
          if (cached) {
            ctx.drawImage(cached.canvas, item.x, item.y)
          }
        }
        break

      default:
        // 未知类型，跳过
        console.warn(`[批量渲染] 未知的批次类型: ${type}`)
        break
    }
  }

  /**
   * 获取批次统计信息
   * 用于性能监控和调试
   */
  getBatchStats(): {
    totalBatches: number
    totalItems: number
    batchDetails: Array<{ type: string; itemCount: number }>
  } {
    const batchDetails: Array<{ type: string; itemCount: number }> = []
    let totalItems = 0

    for (const [type, batch] of this.batches.entries()) {
      batchDetails.push({
        type,
        itemCount: batch.items.length
      })
      totalItems += batch.items.length
    }

    return {
      totalBatches: this.batches.size,
      totalItems,
      batchDetails
    }
  }

  /**
   * 清空批次队列
   * 在不渲染的情况下清空队列
   */
  clearBatches(): void {
    this.batches.clear()
  }

  /**
   * 清理缓存
   * 实现智能缓存清理策略：
   * 1. 清理超过最大年龄的缓存
   * 2. 保留常用精灵图（如玩家飞船）
   * 3. 按访问频率清理不常用的缓存
   */
  cleanup(maxAge: number = 60000): void {
    console.log('[像素艺术渲染器] 开始清理缓存')
    
    const now = Date.now()
    const toDelete: string[] = []
    
    // 保护列表：不应该被清理的关键精灵图
    const protectedSprites = new Set([
      'player_ship',
      'arcade_frame_800_600', // 常见的边框尺寸
      'arcade_frame_1200_900'
    ])

    // 找出需要清理的缓存
    for (const [key, sprite] of this.spriteCache.entries()) {
      // 跳过受保护的精灵图
      if (protectedSprites.has(key)) {
        continue
      }

      // 清理超过最大年龄的缓存
      if (now - sprite.timestamp > maxAge) {
        toDelete.push(key)
      }
    }

    // 如果缓存数量仍然很大，按时间戳排序并清理最旧的
    if (toDelete.length === 0 && this.spriteCache.size > 50) {
      const sortedSprites = Array.from(this.spriteCache.entries())
        .filter(([key]) => !protectedSprites.has(key))
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      // 清理最旧的 30%
      const removeCount = Math.ceil(sortedSprites.length * 0.3)
      for (let i = 0; i < removeCount; i++) {
        toDelete.push(sortedSprites[i][0])
      }
    }

    // 执行清理
    for (const key of toDelete) {
      this.spriteCache.delete(key)
      
      // 同时从 ResourceManager 清理
      const resourceKey = `sprite_${key}`
      if (this.resourceManager.hasResource(resourceKey)) {
        this.resourceManager.releaseResource(resourceKey)
      }
    }

    console.log(`[像素艺术渲染器] 清理完成，释放了 ${toDelete.length} 个精灵图缓存`)
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    console.log('[像素艺术渲染器] 清空所有缓存')
    
    // 清空本地缓存
    this.spriteCache.clear()
    
    // 重新预加载常用精灵图
    this.preloadCommonSprites()
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.spriteCache.size
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    totalSprites: number
    totalMemoryEstimate: number
    oldestSprite: { key: string; age: number } | null
    newestSprite: { key: string; age: number } | null
  } {
    const now = Date.now()
    let totalMemory = 0
    let oldestAge = 0
    let oldestKey = ''
    let newestAge = Infinity
    let newestKey = ''

    for (const [key, sprite] of this.spriteCache.entries()) {
      // 估算内存：width * height * 4 (RGBA)
      totalMemory += sprite.width * sprite.height * 4
      
      const age = now - sprite.timestamp
      if (age > oldestAge) {
        oldestAge = age
        oldestKey = key
      }
      if (age < newestAge) {
        newestAge = age
        newestKey = key
      }
    }

    return {
      totalSprites: this.spriteCache.size,
      totalMemoryEstimate: totalMemory,
      oldestSprite: oldestKey ? { key: oldestKey, age: oldestAge } : null,
      newestSprite: newestKey ? { key: newestKey, age: newestAge } : null
    }
  }

  /**
   * 启动自动清理
   * 定期清理过期的缓存
   */
  startAutoCleanup(interval: number = 30000): void {
    setInterval(() => {
      const stats = this.getCacheStats()
      console.log(`[像素艺术渲染器] 缓存统计: ${stats.totalSprites} 个精灵图, 约 ${(stats.totalMemoryEstimate / 1024 / 1024).toFixed(2)} MB`)
      
      // 如果缓存过多或内存占用过大，触发清理
      if (stats.totalSprites > 100 || stats.totalMemoryEstimate > 50 * 1024 * 1024) {
        console.log('[像素艺术渲染器] 缓存过多，触发清理')
        this.cleanup()
      }
    }, interval)
  }

  /**
   * 预渲染到离屏 Canvas
   */
  prerenderToOffscreen(
    width: number,
    height: number,
    renderer: (ctx: CanvasRenderingContext2D) => void
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false
    })!

    renderer(ctx)
    return canvas
  }

  /**
   * 创建像素艺术渐变
   */
  createPixelGradient(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color1: string,
    color2: string
  ): CanvasGradient {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height)
    gradient.addColorStop(0, color1)
    gradient.addColorStop(1, color2)
    return gradient
  }

  /**
   * 绘制像素艺术矩形（带边框）
   */
  drawPixelRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: string,
    borderColor: string,
    borderWidth: number = 1
  ): void {
    // 绘制填充
    ctx.fillStyle = fillColor
    ctx.fillRect(x, y, width, height)

    // 绘制边框
    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderWidth
    ctx.strokeRect(x, y, width, height)
  }

  /**
   * 绘制像素艺术圆形（使用像素块近似）
   */
  drawPixelCircle(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    color: string
  ): void {
    const blockSize = this.pixelBlockSize
    const radiusInBlocks = Math.ceil(radius / blockSize)

    for (let dy = -radiusInBlocks; dy <= radiusInBlocks; dy++) {
      for (let dx = -radiusInBlocks; dx <= radiusInBlocks; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance <= radiusInBlocks) {
          const x = centerX + dx * blockSize
          const y = centerY + dy * blockSize
          this.drawPixelBlock(ctx, x, y, color, blockSize)
        }
      }
    }
  }

  /**
   * 渲染玩家飞船（8x12 像素块的等腰三角形）
   * 包含细节、阴影和高光
   */
  renderPlayerShip(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cacheKey = 'player_ship'
    
    // 尝试使用缓存
    if (this.renderCachedSprite(ctx, cacheKey, x, y)) {
      return
    }

    // 如果没有缓存，创建并缓存
    this.cacheSprite(cacheKey, () => this.createPlayerShipSprite())
    this.renderCachedSprite(ctx, cacheKey, x, y)
  }

  /**
   * 创建玩家飞船精灵图
   */
  private createPlayerShipSprite(): HTMLCanvasElement {
    const blockSize = this.pixelBlockSize
    const width = PIXEL_BLOCK_CONFIG.PLAYER_SHIP.WIDTH * blockSize
    const height = PIXEL_BLOCK_CONFIG.PLAYER_SHIP.HEIGHT * blockSize

    return this.prerenderToOffscreen(width, height, (ctx) => {
      // 定义颜色
      const mainColor = PIXEL_STYLE.colors.player // 主体绿色
      const highlightColor = '#00FF88' // 高光（更亮的绿色）
      const shadowColor = '#008800' // 阴影（更暗的绿色）
      const darkColor = '#004400' // 深色细节
      const cockpitColor = '#00FFFF' // 驾驶舱（青色）

      // 绘制等腰三角形飞船（尖端朝上）
      // 使用像素块构建，从上到下逐行绘制
      
      // 第 1 行：尖端（1 个像素块）
      this.drawPixelBlockWithHighlight(
        ctx,
        5 * blockSize,
        0,
        mainColor,
        highlightColor,
        shadowColor,
        blockSize
      )

      // 第 2 行：2 个像素块
      this.drawPixelBlockWithHighlight(
        ctx,
        4 * blockSize,
        1 * blockSize,
        mainColor,
        highlightColor,
        shadowColor,
        blockSize
      )
      this.drawPixelBlockWithHighlight(
        ctx,
        6 * blockSize,
        1 * blockSize,
        mainColor,
        highlightColor,
        shadowColor,
        blockSize
      )

      // 第 3 行：4 个像素块（驾驶舱开始）
      this.drawPixelBlock(ctx, 3 * blockSize, 2 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 4 * blockSize, 2 * blockSize, cockpitColor, blockSize)
      this.drawPixelBlock(ctx, 6 * blockSize, 2 * blockSize, cockpitColor, blockSize)
      this.drawPixelBlock(ctx, 7 * blockSize, 2 * blockSize, mainColor, blockSize)

      // 第 4 行：6 个像素块
      this.drawPixelBlock(ctx, 2 * blockSize, 3 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 3 * blockSize, 3 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 4 * blockSize, 3 * blockSize, cockpitColor, blockSize)
      this.drawPixelBlock(ctx, 6 * blockSize, 3 * blockSize, cockpitColor, blockSize)
      this.drawPixelBlock(ctx, 7 * blockSize, 3 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 8 * blockSize, 3 * blockSize, mainColor, blockSize)

      // 第 5 行：8 个像素块（机身主体）
      this.drawPixelBlockWithShadow(
        ctx,
        1 * blockSize,
        4 * blockSize,
        mainColor,
        shadowColor,
        blockSize
      )
      this.drawPixelBlock(ctx, 2 * blockSize, 4 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 3 * blockSize, 4 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 4 * blockSize, 4 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 6 * blockSize, 4 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 7 * blockSize, 4 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 8 * blockSize, 4 * blockSize, mainColor, blockSize)
      this.drawPixelBlockWithShadow(
        ctx,
        9 * blockSize,
        4 * blockSize,
        mainColor,
        shadowColor,
        blockSize
      )

      // 第 6 行：10 个像素块（最宽部分）
      this.drawPixelBlockWithShadow(
        ctx,
        0 * blockSize,
        5 * blockSize,
        mainColor,
        shadowColor,
        blockSize
      )
      this.drawPixelBlock(ctx, 1 * blockSize, 5 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 2 * blockSize, 5 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 3 * blockSize, 5 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 4 * blockSize, 5 * blockSize, darkColor, blockSize)
      this.drawPixelBlock(ctx, 6 * blockSize, 5 * blockSize, darkColor, blockSize)
      this.drawPixelBlock(ctx, 7 * blockSize, 5 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 8 * blockSize, 5 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 9 * blockSize, 5 * blockSize, mainColor, blockSize)
      this.drawPixelBlockWithShadow(
        ctx,
        10 * blockSize,
        5 * blockSize,
        mainColor,
        shadowColor,
        blockSize
      )

      // 第 7 行：12 个像素块（引擎部分）
      this.drawPixelBlock(ctx, 0 * blockSize, 6 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 1 * blockSize, 6 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 2 * blockSize, 6 * blockSize, shadowColor, blockSize)
      this.drawPixelBlock(ctx, 3 * blockSize, 6 * blockSize, shadowColor, blockSize)
      this.drawPixelBlock(ctx, 4 * blockSize, 6 * blockSize, darkColor, blockSize)
      this.drawPixelBlock(ctx, 5 * blockSize, 6 * blockSize, darkColor, blockSize)
      this.drawPixelBlock(ctx, 6 * blockSize, 6 * blockSize, darkColor, blockSize)
      this.drawPixelBlock(ctx, 7 * blockSize, 6 * blockSize, shadowColor, blockSize)
      this.drawPixelBlock(ctx, 8 * blockSize, 6 * blockSize, shadowColor, blockSize)
      this.drawPixelBlock(ctx, 9 * blockSize, 6 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 10 * blockSize, 6 * blockSize, mainColor, blockSize)
      this.drawPixelBlock(ctx, 11 * blockSize, 6 * blockSize, mainColor, blockSize)

      // 第 8 行：12 个像素块（引擎喷口）
      this.drawPixelBlock(ctx, 0 * blockSize, 7 * blockSize, shadowColor, blockSize)
      this.drawPixelBlock(ctx, 1 * blockSize, 7 * blockSize, shadowColor, blockSize)
      this.drawPixelBlock(ctx, 2 * blockSize, 7 * blockSize, '#FF6600', blockSize) // 引擎火焰
      this.drawPixelBlock(ctx, 3 * blockSize, 7 * blockSize, '#FF6600', blockSize)
      this.drawPixelBlock(ctx, 4 * blockSize, 7 * blockSize, '#FFFF00', blockSize) // 引擎火焰中心
      this.drawPixelBlock(ctx, 5 * blockSize, 7 * blockSize, '#FFFF00', blockSize)
      this.drawPixelBlock(ctx, 6 * blockSize, 7 * blockSize, '#FFFF00', blockSize)
      this.drawPixelBlock(ctx, 7 * blockSize, 7 * blockSize, '#FF6600', blockSize)
      this.drawPixelBlock(ctx, 8 * blockSize, 7 * blockSize, '#FF6600', blockSize)
      this.drawPixelBlock(ctx, 9 * blockSize, 7 * blockSize, shadowColor, blockSize)
      this.drawPixelBlock(ctx, 10 * blockSize, 7 * blockSize, shadowColor, blockSize)
      this.drawPixelBlock(ctx, 11 * blockSize, 7 * blockSize, shadowColor, blockSize)
    })
  }

  /**
   * 获取玩家飞船尺寸
   */
  getPlayerShipSize(): { width: number; height: number } {
    return {
      width: PIXEL_BLOCK_CONFIG.PLAYER_SHIP.WIDTH * this.pixelBlockSize,
      height: PIXEL_BLOCK_CONFIG.PLAYER_SHIP.HEIGHT * this.pixelBlockSize
    }
  }

  /**
   * 渲染街机边框（老式街机风格）
   * 包含装饰细节和纹理
   * 使用缓存优化性能
   */
  renderArcadeFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cacheKey = `arcade_frame_${width}_${height}`
    
    // 尝试使用缓存
    if (this.renderCachedSprite(ctx, cacheKey, 0, 0)) {
      return
    }

    // 如果没有缓存，创建并缓存
    this.cacheSprite(cacheKey, () => this.createArcadeFrameSprite(width, height))
    this.renderCachedSprite(ctx, cacheKey, 0, 0)
  }

  /**
   * 预渲染街机边框到缓存
   * 为常见的屏幕尺寸预渲染边框
   */
  preloadArcadeFrames(sizes: Array<{ width: number; height: number }>): void {
    console.log('[像素艺术渲染器] 预加载街机边框')
    
    for (const { width, height } of sizes) {
      const cacheKey = `arcade_frame_${width}_${height}`
      if (!this.spriteCache.has(cacheKey)) {
        this.cacheSprite(cacheKey, () => this.createArcadeFrameSprite(width, height))
        console.log(`[像素艺术渲染器] 预加载边框: ${width}x${height}`)
      }
    }
  }

  /**
   * 创建街机边框精灵图
   */
  private createArcadeFrameSprite(width: number, height: number): HTMLCanvasElement {
    return this.prerenderToOffscreen(width, height, (ctx) => {
      const borderWidth = PIXEL_STYLE.arcade.borderWidth * this.pixelBlockSize
      const blockSize = this.pixelBlockSize

      // 定义颜色
      // const woodColor = PIXEL_STYLE.arcade.borderColor // 木色
      // const darkWoodColor = '#5C2E0F' // 深木色
      // const lightWoodColor = '#A0522D' // 浅木色
      // const metalColor = '#C0C0C0' // 金属色
      // const darkMetalColor = '#808080' // 深金属色
      const screenGlow = PIXEL_STYLE.arcade.screenGlow

      // 绘制外边框（木质纹理）
      this.drawWoodenBorder(ctx, 0, 0, width, height, borderWidth, blockSize)

      // 绘制内边框（金属装饰）
      this.drawMetalInnerBorder(
        ctx,
        borderWidth,
        borderWidth,
        width - borderWidth * 2,
        height - borderWidth * 2,
        blockSize
      )

      // 绘制角落装饰
      this.drawCornerDecorations(ctx, width, height, borderWidth, blockSize)

      // 绘制屏幕发光效果
      ctx.save()
      ctx.fillStyle = screenGlow
      ctx.fillRect(
        borderWidth + blockSize * 2,
        borderWidth + blockSize * 2,
        width - (borderWidth + blockSize * 2) * 2,
        height - (borderWidth + blockSize * 2) * 2
      )
      ctx.restore()
    })
  }

  /**
   * 绘制木质边框
   */
  private drawWoodenBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    borderWidth: number,
    blockSize: number
  ): void {
    const woodColor = PIXEL_STYLE.arcade.borderColor
    const darkWoodColor = '#5C2E0F'
    const lightWoodColor = '#A0522D'

    // 绘制主边框
    ctx.fillStyle = woodColor
    ctx.fillRect(x, y, width, borderWidth) // 上
    ctx.fillRect(x, y + height - borderWidth, width, borderWidth) // 下
    ctx.fillRect(x, y, borderWidth, height) // 左
    ctx.fillRect(x + width - borderWidth, y, borderWidth, height) // 右

    // 添加木纹纹理（使用像素块）
    for (let i = 0; i < width; i += blockSize * 3) {
      // 上边框木纹
      this.drawPixelBlock(ctx, x + i, y + blockSize, darkWoodColor, blockSize)
      this.drawPixelBlock(ctx, x + i + blockSize, y, lightWoodColor, blockSize)
      
      // 下边框木纹
      this.drawPixelBlock(
        ctx,
        x + i,
        y + height - borderWidth + blockSize,
        darkWoodColor,
        blockSize
      )
      this.drawPixelBlock(
        ctx,
        x + i + blockSize,
        y + height - borderWidth,
        lightWoodColor,
        blockSize
      )
    }

    for (let i = 0; i < height; i += blockSize * 3) {
      // 左边框木纹
      this.drawPixelBlock(ctx, x + blockSize, y + i, darkWoodColor, blockSize)
      this.drawPixelBlock(ctx, x, y + i + blockSize, lightWoodColor, blockSize)
      
      // 右边框木纹
      this.drawPixelBlock(
        ctx,
        x + width - borderWidth + blockSize,
        y + i,
        darkWoodColor,
        blockSize
      )
      this.drawPixelBlock(
        ctx,
        x + width - borderWidth,
        y + i + blockSize,
        lightWoodColor,
        blockSize
      )
    }
  }

  /**
   * 绘制金属内边框
   */
  private drawMetalInnerBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    blockSize: number
  ): void {
    const metalColor = '#C0C0C0'
    const darkMetalColor = '#808080'
    const lightMetalColor = '#E0E0E0'

    const metalWidth = blockSize * 2

    // 绘制金属边框
    ctx.fillStyle = metalColor
    ctx.fillRect(x, y, width, metalWidth) // 上
    ctx.fillRect(x, y + height - metalWidth, width, metalWidth) // 下
    ctx.fillRect(x, y, metalWidth, height) // 左
    ctx.fillRect(x + width - metalWidth, y, metalWidth, height) // 右

    // 添加金属高光和阴影
    // 上边框
    ctx.fillStyle = lightMetalColor
    ctx.fillRect(x, y, width, blockSize)
    ctx.fillStyle = darkMetalColor
    ctx.fillRect(x, y + metalWidth - blockSize, width, blockSize)

    // 下边框
    ctx.fillStyle = darkMetalColor
    ctx.fillRect(x, y + height - metalWidth, width, blockSize)
    ctx.fillStyle = lightMetalColor
    ctx.fillRect(x, y + height - blockSize, width, blockSize)

    // 左边框
    ctx.fillStyle = lightMetalColor
    ctx.fillRect(x, y, blockSize, height)
    ctx.fillStyle = darkMetalColor
    ctx.fillRect(x + metalWidth - blockSize, y, blockSize, height)

    // 右边框
    ctx.fillStyle = darkMetalColor
    ctx.fillRect(x + width - metalWidth, y, blockSize, height)
    ctx.fillStyle = lightMetalColor
    ctx.fillRect(x + width - blockSize, y, blockSize, height)
  }

  /**
   * 绘制角落装饰
   */
  private drawCornerDecorations(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    borderWidth: number,
    blockSize: number
  ): void {
    const decorColor = '#FFD700' // 金色装饰
    const decorSize = blockSize * 3

    // 左上角
    this.drawCornerDecor(ctx, borderWidth / 2, borderWidth / 2, decorSize, decorColor)

    // 右上角
    this.drawCornerDecor(
      ctx,
      width - borderWidth / 2 - decorSize,
      borderWidth / 2,
      decorSize,
      decorColor
    )

    // 左下角
    this.drawCornerDecor(
      ctx,
      borderWidth / 2,
      height - borderWidth / 2 - decorSize,
      decorSize,
      decorColor
    )

    // 右下角
    this.drawCornerDecor(
      ctx,
      width - borderWidth / 2 - decorSize,
      height - borderWidth / 2 - decorSize,
      decorSize,
      decorColor
    )
  }

  /**
   * 绘制单个角落装饰
   */
  private drawCornerDecor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string
  ): void {
    const blockSize = this.pixelBlockSize

    // 绘制简单的菱形装饰
    ctx.fillStyle = color
    
    // 中心点
    const centerX = x + size / 2
    const centerY = y + size / 2

    // 绘制菱形（使用像素块）
    this.drawPixelBlock(ctx, centerX - blockSize, centerY - blockSize * 2, color, blockSize)
    this.drawPixelBlock(ctx, centerX, centerY - blockSize * 2, color, blockSize)
    
    this.drawPixelBlock(ctx, centerX - blockSize * 2, centerY - blockSize, color, blockSize)
    this.drawPixelBlock(ctx, centerX - blockSize, centerY - blockSize, color, blockSize)
    this.drawPixelBlock(ctx, centerX, centerY - blockSize, color, blockSize)
    this.drawPixelBlock(ctx, centerX + blockSize, centerY - blockSize, color, blockSize)
    
    this.drawPixelBlock(ctx, centerX - blockSize * 2, centerY, color, blockSize)
    this.drawPixelBlock(ctx, centerX - blockSize, centerY, color, blockSize)
    this.drawPixelBlock(ctx, centerX, centerY, color, blockSize)
    this.drawPixelBlock(ctx, centerX + blockSize, centerY, color, blockSize)
    
    this.drawPixelBlock(ctx, centerX - blockSize, centerY + blockSize, color, blockSize)
    this.drawPixelBlock(ctx, centerX, centerY + blockSize, color, blockSize)
  }

  /**
   * 渲染像素背景（带深度感和滚动效果）
   */
  renderPixelBackground(
    ctx: CanvasRenderingContext2D,
    stage: number,
    scrollOffset: number = 0
  ): void {
    const width = ctx.canvas.width
    const height = ctx.canvas.height

    // 根据关卡选择背景样式
    switch (stage) {
      case 1:
        this.renderStage1Background(ctx, width, height, scrollOffset)
        break
      case 2:
        this.renderStage2Background(ctx, width, height, scrollOffset)
        break
      case 3:
        this.renderStage3Background(ctx, width, height, scrollOffset)
        break
      default:
        this.renderStage1Background(ctx, width, height, scrollOffset)
    }
  }

  /**
   * 渲染第一关背景（家里 - 温馨风格）
   * 使用批量渲染优化性能
   */
  private renderStage1Background(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scrollOffset: number
  ): void {
    const blockSize = this.pixelBlockSize

    // 背景色（深蓝色夜空）
    ctx.fillStyle = '#001133'
    ctx.fillRect(0, 0, width, height)

    // 远景层：星星（慢速滚动）
    const starOffset = (scrollOffset * 0.2) % (height + blockSize * 10)
    this.drawStars(ctx, width, height, starOffset, '#FFFFFF', 30)

    // 中景层：云朵（中速滚动）
    const cloudOffset = (scrollOffset * 0.5) % (height + blockSize * 20)
    this.drawClouds(ctx, width, height, cloudOffset, '#334466', 5)

    // 近景层：建筑轮廓（快速滚动）
    const buildingOffset = (scrollOffset * 1.0) % (height + blockSize * 30)
    this.drawBuildings(ctx, width, height, buildingOffset, '#112244', 8)
    
    // 批量渲染所有收集的元素
    this.renderBatches(ctx)
  }

  /**
   * 渲染第二关背景（学校 - 明亮风格）
   * 使用批量渲染优化性能
   */
  private renderStage2Background(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scrollOffset: number
  ): void {
    const blockSize = this.pixelBlockSize

    // 背景色（浅蓝色天空）
    ctx.fillStyle = '#4488CC'
    ctx.fillRect(0, 0, width, height)

    // 远景层：太阳和云朵
    const sunOffset = (scrollOffset * 0.1) % (height + blockSize * 10)
    this.drawSun(ctx, width / 4, sunOffset - blockSize * 5, '#FFFF00')

    // 中景层：白云（中速滚动）
    const cloudOffset = (scrollOffset * 0.4) % (height + blockSize * 20)
    this.drawClouds(ctx, width, height, cloudOffset, '#FFFFFF', 8)

    // 近景层：树木（快速滚动）
    const treeOffset = (scrollOffset * 0.8) % (height + blockSize * 30)
    this.drawTrees(ctx, width, height, treeOffset, '#228844', 10)
    
    // 批量渲染所有收集的元素
    this.renderBatches(ctx)
  }

  /**
   * 渲染第三关背景（公司 - 科技风格）
   * 使用批量渲染优化性能
   */
  private renderStage3Background(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scrollOffset: number
  ): void {
    const blockSize = this.pixelBlockSize

    // 背景色（深紫色太空）
    ctx.fillStyle = '#110033'
    ctx.fillRect(0, 0, width, height)

    // 远景层：星云（慢速滚动）
    const nebulaOffset = (scrollOffset * 0.15) % (height + blockSize * 10)
    this.drawNebula(ctx, width, height, nebulaOffset)

    // 中景层：星星（中速滚动）
    const starOffset = (scrollOffset * 0.4) % (height + blockSize * 20)
    this.drawStars(ctx, width, height, starOffset, '#FFFFFF', 50)

    // 近景层：数据流（快速滚动）
    const dataOffset = (scrollOffset * 1.2) % (height + blockSize * 30)
    this.drawDataStreams(ctx, width, height, dataOffset)
    
    // 批量渲染所有收集的元素
    this.renderBatches(ctx)
  }

  /**
   * 绘制星星（使用批量渲染优化）
   */
  private drawStars(
    _ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offset: number,
    color: string,
    count: number
  ): void {
    const blockSize = this.pixelBlockSize
    
    // 收集所有星星到批次
    for (let i = 0; i < count; i++) {
      const x = ((i * 137) % width)
      const y = ((i * 197 + offset) % (height + blockSize * 10)) - blockSize * 10
      
      // 随机大小（1-2 像素块）
      const size = (i % 3 === 0) ? blockSize * 2 : blockSize
      
      this.addToBatch('stars', x, y, { color, size })
    }
  }

  /**
   * 绘制云朵（使用批量渲染优化）
   */
  private drawClouds(
    _ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offset: number,
    color: string,
    count: number
  ): void {
    const blockSize = this.pixelBlockSize
    
    // 收集所有云朵到批次
    for (let i = 0; i < count; i++) {
      const x = ((i * 211) % width)
      const y = ((i * 307 + offset) % (height + blockSize * 20)) - blockSize * 20
      const cloudWidth = blockSize * (4 + (i % 3))
      
      this.addToBatch('clouds', x, y, { color, width: cloudWidth })
    }
  }

  /**
   * 绘制建筑轮廓（使用批量渲染优化）
   */
  private drawBuildings(
    _ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offset: number,
    color: string,
    count: number
  ): void {
    const blockSize = this.pixelBlockSize
    
    // 收集所有建筑到批次
    for (let i = 0; i < count; i++) {
      const x = ((i * 173) % width)
      const y = ((i * 251 + offset) % (height + blockSize * 30)) - blockSize * 30
      const buildingHeight = blockSize * (3 + (i % 5))
      const buildingWidth = blockSize * (2 + (i % 3))
      
      this.addToBatch('buildings', x, y, { 
        color, 
        width: buildingWidth, 
        height: buildingHeight 
      })
    }
  }

  /**
   * 绘制太阳
   */
  private drawSun(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string
  ): void {
    const blockSize = this.pixelBlockSize
    const radius = blockSize * 4
    
    // 绘制圆形太阳
    this.drawPixelCircle(ctx, x, y, radius, color)
    
    // 绘制光芒
    const rayLength = blockSize * 2
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180
      const endX = x + Math.cos(rad) * (radius + rayLength)
      const endY = y + Math.sin(rad) * (radius + rayLength)
      
      this.drawPixelBlock(ctx, endX, endY, color, blockSize)
    }
  }

  /**
   * 绘制树木
   */
  private drawTrees(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offset: number,
    color: string,
    count: number
  ): void {
    const blockSize = this.pixelBlockSize
    
    for (let i = 0; i < count; i++) {
      const x = ((i * 193) % width)
      const y = ((i * 271 + offset) % (height + blockSize * 30)) - blockSize * 30
      const treeHeight = blockSize * (4 + (i % 3))
      
      // 树干
      const trunkColor = '#664422'
      this.drawPixelBlock(ctx, x, y + treeHeight - blockSize * 2, trunkColor, blockSize)
      this.drawPixelBlock(ctx, x, y + treeHeight - blockSize, trunkColor, blockSize)
      
      // 树冠
      for (let ty = 0; ty < treeHeight - 2; ty++) {
        const width = blockSize * (1 + (ty % 2))
        for (let tx = 0; tx < width; tx += blockSize) {
          this.drawPixelBlock(ctx, x - blockSize + tx, y + ty * blockSize, color, blockSize)
        }
      }
    }
  }

  /**
   * 绘制星云
   */
  private drawNebula(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offset: number
  ): void {
    const blockSize = this.pixelBlockSize
    const colors = ['#330066', '#660099', '#9900CC', '#CC00FF']
    
    for (let i = 0; i < 20; i++) {
      const x = ((i * 227) % width)
      const y = ((i * 331 + offset) % (height + blockSize * 10)) - blockSize * 10
      const color = colors[i % colors.length]
      const size = blockSize * (2 + (i % 3))
      
      // 绘制模糊的星云块
      for (let dy = 0; dy < size; dy += blockSize) {
        for (let dx = 0; dx < size; dx += blockSize) {
          if (Math.random() > 0.3) {
            this.drawPixelBlock(ctx, x + dx, y + dy, color, blockSize)
          }
        }
      }
    }
  }

  /**
   * 绘制数据流
   */
  private drawDataStreams(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offset: number
  ): void {
    const blockSize = this.pixelBlockSize
    const colors = ['#00FF00', '#00CC00', '#009900']
    
    for (let i = 0; i < 15; i++) {
      const x = ((i * 241) % width)
      const y = ((i * 349 + offset) % (height + blockSize * 30)) - blockSize * 30
      const streamLength = blockSize * (5 + (i % 5))
      
      // 绘制垂直数据流
      for (let sy = 0; sy < streamLength; sy += blockSize) {
        const color = colors[Math.floor((sy / blockSize) % colors.length)]
        this.drawPixelBlock(ctx, x, y + sy, color, blockSize)
      }
    }
  }
}
