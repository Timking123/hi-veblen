<template>
  <div class="cinematic-background" aria-hidden="true">
    <canvas ref="canvasRef" class="cinematic-background__canvas"></canvas>
    <div class="cinematic-background__nebula"></div>
    <div class="cinematic-background__grid"></div>
    <div class="cinematic-background__scanline"></div>
    <div class="cinematic-background__vignette"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  radius: number
  alpha: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId = 0
let particles: Particle[] = []
let pointerX = 0.5
let pointerY = 0.5
let reducedMotion = false

const createParticles = (width: number, height: number) => {
  const count = Math.min(180, Math.max(70, Math.floor((width * height) / 11000)))
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    z: Math.random(),
    vx: (Math.random() - 0.5) * 0.24,
    vy: (Math.random() - 0.5) * 0.24,
    radius: Math.random() * 1.9 + 0.35,
    alpha: Math.random() * 0.7 + 0.18,
  }))
}

const draw = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const { width, height } = canvas
  ctx.clearRect(0, 0, width, height)

  const gradient = ctx.createRadialGradient(
    width * pointerX,
    height * pointerY,
    0,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.7,
  )
  gradient.addColorStop(0, 'rgba(0, 229, 255, 0.13)')
  gradient.addColorStop(0.36, 'rgba(139, 92, 255, 0.08)')
  gradient.addColorStop(1, 'rgba(2, 3, 10, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  for (const particle of particles) {
    const pullX = (pointerX - 0.5) * particle.z * 0.18
    const pullY = (pointerY - 0.5) * particle.z * 0.18

    if (!reducedMotion) {
      particle.x += particle.vx + pullX
      particle.y += particle.vy + pullY
    }

    if (particle.x < -20) particle.x = width + 20
    if (particle.x > width + 20) particle.x = -20
    if (particle.y < -20) particle.y = height + 20
    if (particle.y > height + 20) particle.y = -20

    ctx.beginPath()
    ctx.fillStyle = `rgba(120, 240, 255, ${particle.alpha})`
    ctx.shadowBlur = 14 * particle.z
    ctx.shadowColor = 'rgba(0, 229, 255, 0.7)'
    ctx.arc(particle.x, particle.y, particle.radius * (0.7 + particle.z), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)'
  ctx.lineWidth = 1
  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i]
      const b = particles[j]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (distance < 115) {
        ctx.globalAlpha = (1 - distance / 115) * 0.42
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
  }
  ctx.globalAlpha = 1

  animationId = requestAnimationFrame(draw)
}

const resize = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(window.innerWidth * pixelRatio)
  canvas.height = Math.floor(window.innerHeight * pixelRatio)
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
  const ctx = canvas.getContext('2d')
  ctx?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  createParticles(window.innerWidth, window.innerHeight)
}

const handlePointerMove = (event: PointerEvent) => {
  pointerX = event.clientX / window.innerWidth
  pointerY = event.clientY / window.innerHeight
}

onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  resize()
  draw()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', handlePointerMove)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', handlePointerMove)
})
</script>
