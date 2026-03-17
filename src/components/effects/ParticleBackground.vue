<template>
  <div class="particle-background">
    <!-- Gradient flowing background -->
    <div class="gradient-background"></div>
    
    <!-- Canvas for particle effects -->
    <canvas
      ref="canvasRef"
      class="particle-canvas"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

interface ParticleConfig {
  count?: number
  color?: string
  speed?: number
  size?: number
  connectionDistance?: number
  theme?: 'dark' | 'light'
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  originalX: number
  originalY: number
}

const props = withDefaults(defineProps<ParticleConfig>(), {
  count: 80,
  color: '#00D9FF',
  speed: 0.5,
  size: 2,
  connectionDistance: 150
})

// 使用主题 composable
const { resolvedTheme } = useTheme()

// 根据主题计算粒子颜色
const particleColor = computed(() => {
  // 如果 props 中指定了颜色，优先使用 props 的颜色
  if (props.color !== '#00D9FF') {
    return props.color
  }
  
  // 否则根据主题动态调整
  // 深色主题：使用青色 #00d9ff
  // 亮色主题：使用相同颜色但降低透明度
  return resolvedTheme.value === 'dark' ? '#00d9ff' : '#00d9ff'
})

// 根据主题计算粒子透明度
const particleOpacity = computed(() => {
  return resolvedTheme.value === 'dark' ? 1.0 : 0.6
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

let particles: Particle[] = []
let animationFrameId: number | null = null
let ctx: CanvasRenderingContext2D | null = null
let canvasWidth = 0
let canvasHeight = 0

// Mouse interaction state
let mouseX = -1000
let mouseY = -1000
let isMouseDown = false
let attractionRadius = 200
let attractionStrength = 0.5

// Initialize particles
const initParticles = () => {
  particles = []
  for (let i = 0; i < props.count; i++) {
    const x = Math.random() * canvasWidth
    const y = Math.random() * canvasHeight
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * props.speed,
      vy: (Math.random() - 0.5) * props.speed,
      size: Math.random() * props.size + 1,
      originalX: x,
      originalY: y
    })
  }
}

// Update particle positions
const updateParticles = () => {
  particles.forEach((particle) => {
    // Calculate distance to mouse
    const dx = mouseX - particle.x
    const dy = mouseY - particle.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Mouse attraction effect
    if (isMouseDown && distance < attractionRadius) {
      // Closer particles move faster (inverse distance)
      const force = (1 - distance / attractionRadius) * attractionStrength
      particle.vx += (dx / distance) * force
      particle.vy += (dy / distance) * force
    } else {
      // Return to original position when mouse is released
      const returnDx = particle.originalX - particle.x
      const returnDy = particle.originalY - particle.y
      const returnDistance = Math.sqrt(returnDx * returnDx + returnDy * returnDy)
      
      if (returnDistance > 1) {
        // Farther particles return faster (proportional to distance)
        const returnForce = Math.min(returnDistance / 500, 0.5)
        particle.vx += (returnDx / returnDistance) * returnForce * 0.1
        particle.vy += (returnDy / returnDistance) * returnForce * 0.1
      }
    }

    // Apply velocity with damping
    particle.x += particle.vx
    particle.y += particle.vy
    particle.vx *= 0.95
    particle.vy *= 0.95

    // Bounce off edges
    if (particle.x < 0 || particle.x > canvasWidth) {
      particle.vx *= -1
    }
    if (particle.y < 0 || particle.y > canvasHeight) {
      particle.vy *= -1
    }

    // Keep particles within bounds
    particle.x = Math.max(0, Math.min(canvasWidth, particle.x))
    particle.y = Math.max(0, Math.min(canvasHeight, particle.y))
  })
}

// Draw particles and connections
const drawParticles = () => {
  if (!ctx) return

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // 获取当前主题的颜色和透明度
  const color = particleColor.value
  const opacity = particleOpacity.value

  // Draw connections between nearby particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < props.connectionDistance) {
        const lineOpacity = (1 - distance / props.connectionDistance) * 0.3 * opacity
        ctx.strokeStyle = `${color}${Math.floor(lineOpacity * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.stroke()
      }
    }
  }

  // Draw particles
  particles.forEach((particle) => {
    // 应用主题透明度
    ctx!.fillStyle = `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`
    ctx!.beginPath()
    ctx!.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx!.fill()
  })
}

// Animation loop using requestAnimationFrame
const animate = () => {
  updateParticles()
  drawParticles()
  animationFrameId = requestAnimationFrame(animate)
}

// Handle window resize
const handleResize = () => {
  if (!canvasRef.value) return

  canvasWidth = window.innerWidth
  canvasHeight = window.innerHeight
  canvasRef.value.width = canvasWidth
  canvasRef.value.height = canvasHeight

  initParticles()
}

// Mouse event handlers
const handleMouseDown = (e: MouseEvent) => {
  isMouseDown = true
  mouseX = e.clientX
  mouseY = e.clientY
}

const handleMouseUp = () => {
  isMouseDown = false
}

const handleMouseMove = (e: MouseEvent) => {
  mouseX = e.clientX
  mouseY = e.clientY
}

const handleMouseLeave = () => {
  isMouseDown = false
  mouseX = -1000
  mouseY = -1000
}

onMounted(() => {
  if (!canvasRef.value) return

  ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  handleResize()
  animate()

  window.addEventListener('resize', handleResize)
  window.addEventListener('mousedown', handleMouseDown)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseleave', handleMouseLeave)
})

// 监听主题变化，实时更新粒子颜色
watch(resolvedTheme, () => {
  // 主题变化时重绘粒子
  // 由于使用了 computed 属性，下一帧会自动使用新的颜色
  if (ctx) {
    drawParticles()
  }
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mousedown', handleMouseDown)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseleave', handleMouseLeave)
})
</script>

<style scoped>
.particle-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
}

.gradient-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    #0a0e27 0%,
    #151932 25%,
    #1a1f3a 50%,
    #151932 75%,
    #0a0e27 100%
  );
  background-size: 400% 400%;
  animation: gradientFlow 15s ease infinite;
  pointer-events: none;
  transition: background 0.3s ease;
}

/* 亮色主题的背景渐变 */
[data-theme='light'] .gradient-background {
  background: linear-gradient(
    135deg,
    #e8f4f8 0%,
    #f0f8fc 25%,
    #f5fafd 50%,
    #f0f8fc 75%,
    #e8f4f8 100%
  );
  background-size: 400% 400%;
}

@keyframes gradientFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.particle-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

/* Reduce animation complexity on low-performance devices */
@media (prefers-reduced-motion: reduce) {
  .gradient-background {
    animation: none;
  }
  
  .particle-canvas {
    display: none;
  }
}
</style>
