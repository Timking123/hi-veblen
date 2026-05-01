<template>
  <canvas ref="canvasRef" class="shader-background" data-testid="shader-background" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let animationId = 0
let startTime = 0
let pointerX = 0.5
let pointerY = 0.5

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const fragmentShaderSource = `
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 centered = uv - 0.5;
  centered.x *= u_resolution.x / u_resolution.y;
  vec2 pointer = u_pointer - 0.5;
  pointer.x *= u_resolution.x / u_resolution.y;

  float dist = length(centered - pointer * 0.35);
  float nebula = fbm(centered * 3.0 + vec2(u_time * 0.035, -u_time * 0.02));
  float vortex = sin((atan(centered.y, centered.x) + u_time * 0.22) * 4.0 + dist * 16.0);
  float glow = smoothstep(0.9, 0.05, dist) * 0.35;

  vec3 deep = vec3(0.006, 0.011, 0.035);
  vec3 cyan = vec3(0.0, 0.78, 1.0);
  vec3 violet = vec3(0.45, 0.24, 1.0);
  vec3 magenta = vec3(1.0, 0.15, 0.72);

  vec3 color = deep;
  color += cyan * nebula * 0.16;
  color += violet * smoothstep(0.28, 0.9, nebula) * 0.22;
  color += magenta * max(vortex, 0.0) * 0.045;
  color += cyan * glow;
  color *= 1.0 - smoothstep(0.45, 1.18, length(centered));

  gl_FragColor = vec4(color, 0.72);
}
`

const compileShader = (type: number, source: string) => {
  if (!gl) return null
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const createProgram = () => {
  if (!gl) return null
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource)
  if (!vertexShader || !fragmentShader) return null
  const nextProgram = gl.createProgram()
  if (!nextProgram) return null
  gl.attachShader(nextProgram, vertexShader)
  gl.attachShader(nextProgram, fragmentShader)
  gl.linkProgram(nextProgram)
  if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) return null
  return nextProgram
}

const resize = () => {
  const canvas = canvasRef.value
  if (!canvas || !gl) return
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(window.innerWidth * ratio)
  canvas.height = Math.floor(window.innerHeight * ratio)
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
  gl.viewport(0, 0, canvas.width, canvas.height)
}

const render = (time: number) => {
  const canvas = canvasRef.value
  if (!gl || !program || !canvas) return
  gl.useProgram(program)
  gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height)
  gl.uniform2f(gl.getUniformLocation(program, 'u_pointer'), pointerX, 1 - pointerY)
  gl.uniform1f(gl.getUniformLocation(program, 'u_time'), (time - startTime) / 1000)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
  animationId = requestAnimationFrame(render)
}

const handlePointer = (event: PointerEvent) => {
  pointerX = event.clientX / window.innerWidth
  pointerY = event.clientY / window.innerHeight
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gl = canvas.getContext('webgl', { alpha: true, antialias: false })
  if (!gl) return
  program = createProgram()
  if (!program) return
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  resize()
  startTime = performance.now()
  animationId = requestAnimationFrame(render)
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', handlePointer, { passive: true })
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', handlePointer)
})
</script>
