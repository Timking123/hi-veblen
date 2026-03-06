<template>
  <div v-if="isAnimating" class="collapse-animation">
    <canvas ref="canvasRef" class="collapse-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'
import { useEasterEggStore } from '@/stores/easterEgg'
import { GamePhase } from '@/game/types'

const easterEggStore = useEasterEggStore()

interface TextFragment {
  element: HTMLElement
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  text: string
  fontSize: number
  color: string
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isAnimating = ref(false)
const animationPhase = ref<'text-break' | 'melt' | 'tear' | 'fill' | 'complete'>('text-break')

let ctx: CanvasRenderingContext2D | null = null
let animationFrameId: number | null = null
let fragments: TextFragment[] = []
let tearProgress = 0
let fillProgress = 0

// 监听游戏阶段变化
watch(() => easterEggStore.phase, (newPhase) => {
  if (newPhase === GamePhase.COLLAPSE_ANIMATION) {
    startAnimation()
  }
})

/**
 * 开始崩塌动画
 */
async function startAnimation() {
  console.log('[崩塌] ========== 开始动画 ==========')
  isAnimating.value = true
  
  // 检测 prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  if (prefersReducedMotion) {
    console.log('[崩塌] 检测到 prefers-reduced-motion，使用简化动画')
    await simpleFadeOut()
    easterEggStore.enterCMDWindow()
    return
  }
  
  // 步骤 1：滚动到页面顶部，确保所有元素都在视口内
  console.log('[崩塌] 步骤 1：滚动到页面顶部')
  window.scrollTo({ top: 0, behavior: 'instant' })
  await new Promise((resolve) => setTimeout(resolve, 100))
  
  // 步骤 2：移除所有滚动动画类，而不仅仅是设置样式
  console.log('[崩塌] 步骤 2：移除滚动动画类')
  const animatedElements = document.querySelectorAll('[class*="animate-"]')
  console.log(`[崩塌] 找到 ${animatedElements.length} 个带动画类的元素`)
  animatedElements.forEach((el) => {
    const element = el as HTMLElement
    // 移除所有 animate- 开头的类
    const classes = Array.from(element.classList)
    classes.forEach(className => {
      if (className.startsWith('animate-')) {
        element.classList.remove(className)
      }
    })
  })
  
  // 步骤 3：强制显示所有隐藏的元素
  console.log('[崩塌] 步骤 3：强制显示所有隐藏元素')
  const hiddenElements = document.querySelectorAll('[style*="opacity: 0"], [style*="opacity:0"]')
  console.log(`[崩塌] 找到 ${hiddenElements.length} 个隐藏元素`)
  Array.from(hiddenElements).forEach((el) => {
    const element = el as HTMLElement
    element.style.setProperty('opacity', '1', 'important')
    element.style.setProperty('transform', 'none', 'important')
    element.style.setProperty('visibility', 'visible', 'important')
  })
  
  // 步骤 4：特别处理简介和技能标签
  console.log('[崩塌] 步骤 4：特别处理关键元素')
  const summaryElement = document.querySelector('.hero-summary') as HTMLElement
  const skillsCloud = document.querySelector('.skills-cloud') as HTMLElement
  const skillTags = document.querySelectorAll('.skill-tag')
  
  if (summaryElement) {
    summaryElement.style.setProperty('opacity', '1', 'important')
    summaryElement.style.setProperty('transform', 'none', 'important')
    summaryElement.style.setProperty('visibility', 'visible', 'important')
    summaryElement.style.setProperty('display', 'block', 'important')
    console.log('[崩塌] 强制显示简介元素')
  } else {
    console.warn('[崩塌] 警告：未找到简介元素 .hero-summary')
  }
  
  if (skillsCloud) {
    skillsCloud.style.setProperty('opacity', '1', 'important')
    skillsCloud.style.setProperty('transform', 'none', 'important')
    skillsCloud.style.setProperty('visibility', 'visible', 'important')
    skillsCloud.style.setProperty('display', 'flex', 'important')
    console.log('[崩塌] 强制显示技能云容器')
  }
  
  skillTags.forEach((tag) => {
    const element = tag as HTMLElement
    element.style.setProperty('opacity', '1', 'important')
    element.style.setProperty('transform', 'none', 'important')
    element.style.setProperty('visibility', 'visible', 'important')
    element.style.setProperty('display', 'flex', 'important')
  })
  console.log(`[崩塌] 强制显示 ${skillTags.length} 个技能标签`)
  
  // 步骤 5：强制触发浏览器重排
  console.log('[崩塌] 步骤 5：强制触发浏览器重排')
  if (summaryElement) {
    void summaryElement.offsetHeight
  }
  skillTags.forEach(tag => {
    void (tag as HTMLElement).offsetHeight
  })
  
  // 步骤 6：等待浏览器完成渲染（增加到 500ms）
  console.log('[崩塌] 步骤 6：等待浏览器渲染（500ms）')
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  // 步骤 7：验证关键元素是否可见
  console.log('[崩塌] 步骤 7：验证关键元素')
  if (summaryElement) {
    const rect = summaryElement.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(summaryElement)
    console.log('[崩塌] 简介元素状态:', {
      rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
      opacity: computedStyle.opacity,
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      textContent: summaryElement.textContent?.substring(0, 50)
    })
  }
  
  skillTags.forEach((tag, index) => {
    if (index < 3) {
      const rect = (tag as HTMLElement).getBoundingClientRect()
      const computedStyle = window.getComputedStyle(tag as HTMLElement)
      console.log(`[崩塌] 技能标签 ${index} 状态:`, {
        rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
        opacity: computedStyle.opacity,
        display: computedStyle.display,
        textContent: (tag as HTMLElement).textContent
      })
    }
  })
  
  if (!canvasRef.value) {
    console.error('[崩塌] 错误：Canvas 元素不存在')
    return
  }
  
  ctx = canvasRef.value.getContext('2d')
  if (!ctx) {
    console.error('[崩塌] 错误：无法获取 Canvas 上下文')
    return
  }
  
  // 设置 canvas 尺寸
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
  console.log('[崩塌] Canvas 尺寸:', { width: canvasRef.value.width, height: canvasRef.value.height })
  
  // 执行动画序列
  console.log('[崩塌] ========== 开始执行动画序列 ==========')
  await fragmentText()
  await applyMeltEffect()
  await createTearEffect()
  await fillWithBlack()
  
  // 动画完成，进入CMD窗口
  console.log('[崩塌] ========== 动画完成 ==========')
  animationPhase.value = 'complete'
  isAnimating.value = false
  easterEggStore.enterCMDWindow()
}

/**
 * 简化的淡出动画（用于 prefers-reduced-motion）
 * 直接黑屏过渡，不使用复杂的碎片化、融化、撕裂效果
 */
async function simpleFadeOut() {
  console.log('[崩塌] 执行简化淡出动画')
  
  if (!canvasRef.value) {
    console.error('[崩塌] 错误：Canvas 元素不存在')
    return
  }
  
  ctx = canvasRef.value.getContext('2d')
  if (!ctx) {
    console.error('[崩塌] 错误：无法获取 Canvas 上下文')
    return
  }
  
  // 设置 canvas 尺寸
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
  
  // 简单的黑屏淡入效果（800ms）
  const duration = 800
  const startTime = Date.now()
  
  return new Promise<void>((resolve) => {
    const animate = () => {
      if (!ctx || !canvasRef.value) {
        resolve()
        return
      }
      
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 线性淡入黑色
      ctx.fillStyle = `rgba(0, 0, 0, ${progress})`
      ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height)
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        console.log('[崩塌] 简化淡出动画完成')
        isAnimating.value = false
        resolve()
      }
    }
    
    animate()
  })
}

/**
 * 文字碎片化效果
 */
async function fragmentText() {
  console.log('[崩塌] ========== 开始文字碎片化 ==========')
  animationPhase.value = 'text-break'
  
  // 收集所有需要隐藏的元素
  const elementsToHide = new Set<HTMLElement>()
  
  // 获取页面上的所有文本节点 - 使用TreeWalker遍历所有文本节点
  const textNodes: { node: Text; parent: HTMLElement }[] = []
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // 跳过script、style等标签内的文本
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        const tagName = parent.tagName.toLowerCase()
        if (['script', 'style', 'noscript', 'canvas'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT
        }
        // 只接受有实际内容的文本节点
        const text = node.textContent || ''
        if (text.trim().length === 0) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )
  
  let currentNode = walker.nextNode()
  while (currentNode) {
    textNodes.push({
      node: currentNode as Text,
      parent: currentNode.parentElement as HTMLElement
    })
    currentNode = walker.nextNode()
  }
  
  console.log(`[崩塌] TreeWalker 找到 ${textNodes.length} 个文本节点`)
  
  // 为每个文本节点创建碎片
  let fragmentCount = 0
  let skippedCount = 0
  
  textNodes.forEach(({ node, parent }, index) => {
    const text = node.textContent || ''
    if (text.trim().length === 0) return
    
    // 获取父元素的位置和样式
    const rect = parent.getBoundingClientRect()
    
    // 调试：输出前10个元素的信息
    if (index < 10) {
      console.log(`[崩塌] 节点 ${index}: "${text.substring(0, 30)}..."`, {
        className: parent.className,
        rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left }
      })
    }
    
    // 只处理真实可见的元素（宽高都大于 0）
    if (rect.width === 0 || rect.height === 0) {
      skippedCount++
      if (index < 10) {
        console.log(`[崩塌] 跳过不可见元素: "${text.substring(0, 20)}..."`)
      }
      return
    }
    
    const computedStyle = window.getComputedStyle(parent)
    const fontSize = parseInt(computedStyle.fontSize) || 16
    const color = computedStyle.color || '#ffffff'
    
    // 为每个字符创建碎片
    const chars = text.split('')
    const charWidth = rect.width / Math.max(chars.length, 1)
    
    chars.forEach((char, i) => {
      // 保留所有字符，包括空格
      if (char.trim().length === 0 && Math.random() > 0.3) return
      
      const fragment: TextFragment = {
        element: parent,
        x: rect.left + (i * charWidth),
        y: rect.top + rect.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * 5 - 2,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.5,
        text: char,
        fontSize: fontSize,
        color: color
      }
      
      fragments.push(fragment)
      fragmentCount++
    })
    
    // 记录需要隐藏的元素
    elementsToHide.add(parent)
  })
  
  console.log(`[崩塌] TreeWalker 处理结果: 创建 ${fragmentCount} 个碎片, 跳过 ${skippedCount} 个不可见元素`)
  
  console.log(`[崩塌] ========== 最终统计 ==========`)
  console.log(`[崩塌] 总碎片数: ${fragments.length}`)
  console.log(`[崩塌] 需要隐藏的元素数: ${elementsToHide.size}`)
  
  // 验证简介和技能标签是否被捕获
  const summaryElement = document.querySelector('.hero-summary') as HTMLElement
  const skillTags = document.querySelectorAll('.skill-tag')
  
  let summaryCaptured = false
  let skillTagsCaptured = 0
  
  elementsToHide.forEach(el => {
    if (el === summaryElement) {
      summaryCaptured = true
    }
    if (el.classList.contains('skill-tag')) {
      skillTagsCaptured++
    }
  })
  
  console.log(`[崩塌] 验证结果:`)
  console.log(`[崩塌] - 简介元素已捕获: ${summaryCaptured}`)
  console.log(`[崩塌] - 技能标签已捕获: ${skillTagsCaptured}/${skillTags.length}`)
  
  if (!summaryCaptured && summaryElement) {
    console.warn('[崩塌] 警告：简介元素未被 TreeWalker 捕获，检查元素状态')
    const rect = summaryElement.getBoundingClientRect()
    console.warn('[崩塌] 简介元素 rect:', rect)
  }
  
  if (skillTagsCaptured < skillTags.length) {
    console.warn(`[崩塌] 警告：只捕获了 ${skillTagsCaptured}/${skillTags.length} 个技能标签`)
    skillTags.forEach((tag, index) => {
      const captured = Array.from(elementsToHide).includes(tag as HTMLElement)
      if (!captured) {
        const rect = (tag as HTMLElement).getBoundingClientRect()
        console.warn(`[崩塌] 未捕获的技能标签 ${index}:`, {
          text: (tag as HTMLElement).textContent,
          rect
        })
      }
    })
  }
  
  // 特殊处理：确保技能标签的文字被捕获
  console.log('[崩塌] ========== 特殊处理技能标签文字 ==========')
  let skillNameFragments = 0
  skillTags.forEach((tag, tagIndex) => {
    const element = tag as HTMLElement
    const rect = element.getBoundingClientRect()
    
    // 跳过不可见的标签
    if (rect.width === 0 || rect.height === 0) {
      console.warn(`[崩塌] 跳过不可见的技能标签 ${tagIndex}`)
      return
    }
    
    // 获取标签内的所有直接文本节点（不包括子元素内的文本）
    const childNodes = Array.from(element.childNodes)
    childNodes.forEach((child) => {
      // 只处理文本节点
      if (child.nodeType === Node.TEXT_NODE) {
        const text = (child.textContent || '').trim()
        if (text.length === 0) return
        
        console.log(`[崩塌] 技能标签 ${tagIndex} 的文本节点: "${text}"`)
        
        // 使用 Range API 获取文本节点的精确位置
        const range = document.createRange()
        range.selectNodeContents(child as Node)
        const textRect = range.getBoundingClientRect()
        
        if (tagIndex < 3) {
          console.log(`[崩塌] 技能标签 ${tagIndex} 位置信息:`, {
            text: text,
            textRect: { 
              width: textRect.width, 
              height: textRect.height, 
              top: textRect.top, 
              left: textRect.left 
            },
            elementRect: { 
              width: rect.width, 
              height: rect.height, 
              top: rect.top, 
              left: rect.left 
            }
          })
        }
        
        const computedStyle = window.getComputedStyle(element)
        const fontSize = parseInt(computedStyle.fontSize) || 14
        const color = computedStyle.color || '#ffffff'
        
        // 为技能名称创建碎片
        const chars = text.split('')
        const charWidth = textRect.width / Math.max(chars.length, 1)
        
        chars.forEach((char, i) => {
          if (char.trim().length === 0 && Math.random() > 0.3) return
          
          const fragmentX = textRect.left + (i * charWidth)
          const fragmentY = textRect.top + textRect.height / 2
          
          // 调试：输出前 3 个标签的前 2 个字符的位置
          if (tagIndex < 3 && i < 2) {
            console.log(`[崩塌] 技能标签 ${tagIndex} 碎片 ${i} ("${char}"):`, {
              x: fragmentX,
              y: fragmentY,
              fontSize: fontSize,
              color: color
            })
          }
          
          fragments.push({
            element: element,
            x: fragmentX,
            y: fragmentY,
            vx: (Math.random() - 0.5) * 12,
            vy: Math.random() * 5 - 2,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.5,
            text: char,
            fontSize: fontSize,
            color: color
          })
          skillNameFragments++
          fragmentCount++
        })
        
        elementsToHide.add(element)
      }
    })
  })
  
  console.log(`[崩塌] 技能标签文字特殊处理: 创建 ${skillNameFragments} 个碎片`)
  console.log(`[崩塌] 更新后总碎片数: ${fragments.length}`)
  
  // 特殊处理：隐藏技能标签的文本节点（但保留子元素可见）
  console.log('[崩塌] 隐藏技能标签的文本节点')
  skillTags.forEach((tag) => {
    const element = tag as HTMLElement
    // 设置 font-size: 0 来隐藏直接文本节点，但不影响子元素
    element.style.fontSize = '0'
    // 确保子元素的字体大小正常
    const children = element.querySelectorAll('.skill-icon, .skill-level')
    children.forEach((child) => {
      (child as HTMLElement).style.fontSize = '14px'
    })
  })
  
  // 隐藏所有包含文本的元素
  elementsToHide.forEach(el => {
    el.style.opacity = '0'
  })
  
  console.log('[崩塌] ========== 开始碎片下落动画 ==========')
  
  // 动画碎片下落 - 优化：缩短持续时间从 2000ms 到 1500ms
  const duration = 1500
  const startTime = Date.now()
  let frameCount = 0
  
  return new Promise<void>((resolve) => {
    const animate = () => {
      frameCount++
      
      if (!ctx || !canvasRef.value) {
        console.error(`[崩塌] 动画停止：ctx=${!!ctx}, canvas=${!!canvasRef.value}, 帧数=${frameCount}`)
        resolve()
        return
      }
      
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 每 60 帧输出一次进度
      if (frameCount % 60 === 0) {
        console.log(`[崩塌] 动画进度: ${(progress * 100).toFixed(1)}%, 帧数: ${frameCount}, 碎片数: ${fragments.length}`)
      }
      
      // 优化：使用 clearRect 而不是重新绘制整个画布
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
      
      // 优化：批量处理碎片以提高性能
      ctx.save()
      fragments.forEach(fragment => {
        // 应用重力
        fragment.vy += 0.6
        fragment.x += fragment.vx
        fragment.y += fragment.vy
        fragment.rotation += fragment.rotationSpeed
        
        // 优化：跳过屏幕外的碎片渲染
        if (fragment.y > canvasRef.value!.height + 100) return
        
        // 渲染碎片
        ctx!.save()
        ctx!.translate(fragment.x, fragment.y)
        ctx!.rotate(fragment.rotation)
        ctx!.font = `${fragment.fontSize}px sans-serif`
        ctx!.fillStyle = fragment.color
        ctx!.fillText(fragment.text, 0, 0)
        ctx!.restore()
      })
      ctx.restore()
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        console.log(`[崩塌] 碎片下落动画完成，总帧数: ${frameCount}`)
        resolve()
      }
    }
    
    animate()
  })
}

/**
 * 融化效果 - 优化：缩短持续时间并与撕裂效果并行
 */
async function applyMeltEffect() {
  console.log('[崩塌] 应用融化效果')
  animationPhase.value = 'melt'
  
  // 更全面的元素选择器 - 包括所有卡片、按钮、图片等
  const elements = document.querySelectorAll(
    '.hero-avatar, .skill-tag, .btn, .highlight-card, .stat-card, ' +
    '.interest-card, .quick-link-card, img, .avatar-glow, .scroll-indicator'
  )
  
  console.log(`[崩塌] 融化 ${elements.length} 个元素`)
  
  elements.forEach(el => {
    (el as HTMLElement).style.transition = 'opacity 0.5s, transform 0.5s'
    ;(el as HTMLElement).style.opacity = '0'
    ;(el as HTMLElement).style.transform = 'translateY(50px) scale(0.8)'
  })
  
  // 优化：缩短等待时间从 1000ms 到 300ms，让撕裂效果更快开始
  await new Promise(resolve => setTimeout(resolve, 300))
}

/**
 * 背景撕裂效果 - 优化：缩短持续时间从 1500ms 到 1000ms
 */
async function createTearEffect() {
  console.log('[崩塌] 创建撕裂效果')
  animationPhase.value = 'tear'
  
  if (!ctx || !canvasRef.value) return
  
  const duration = 1000
  const startTime = Date.now()
  
  return new Promise<void>((resolve) => {
    const animate = () => {
      if (!ctx || !canvasRef.value) return
      
      const elapsed = Date.now() - startTime
      tearProgress = Math.min(elapsed / duration, 1)
      
      const centerX = canvasRef.value.width / 2
      const centerY = canvasRef.value.height / 2
      const maxRadius = Math.max(canvasRef.value.width, canvasRef.value.height)
      
      // 优化：使用 easing 函数使动画更流畅
      const easedProgress = 1 - Math.pow(1 - tearProgress, 3) // ease-out cubic
      const easedRadius = easedProgress * maxRadius
      
      // 绘制撕裂效果
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(centerX, centerY, easedRadius, 0, Math.PI * 2)
      ctx.fill()
      
      if (tearProgress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        resolve()
      }
    }
    
    animate()
  })
}

/**
 * 黑色填充 - 优化：缩短持续时间从 500ms 到 300ms
 */
async function fillWithBlack() {
  console.log('[崩塌] 黑色填充')
  animationPhase.value = 'fill'
  
  if (!ctx || !canvasRef.value) return
  
  const duration = 300
  const startTime = Date.now()
  
  return new Promise<void>((resolve) => {
    const animate = () => {
      if (!ctx || !canvasRef.value) return
      
      const elapsed = Date.now() - startTime
      fillProgress = Math.min(elapsed / duration, 1)
      
      // 优化：使用 easing 函数使填充更流畅
      const easedProgress = fillProgress * fillProgress // ease-in quadratic
      
      ctx.fillStyle = `rgba(0, 0, 0, ${easedProgress})`
      ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height)
      
      if (fillProgress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        resolve()
      }
    }
    
    animate()
  })
}

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
.collapse-animation {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  pointer-events: none;
}

.collapse-canvas {
  width: 100%;
  height: 100%;
}
</style>
