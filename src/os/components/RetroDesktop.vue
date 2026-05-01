<template>
  <div class="retro-desktop" role="application" aria-label="复古终端桌面">
    <div class="retro-desktop__wallpaper">
      <div class="retro-desktop__topline">
        <p class="retro-desktop__boot">LEGACY_OS 9.7 / SAFE MODE / USER: GUEST</p>
        <p class="retro-desktop__hint">双击图标或点击打开窗口；拖拽标题栏移动；任务栏可恢复最小化窗口。</p>
      </div>

      <div class="retro-desktop__icons">
        <button
          v-for="app in apps"
          :key="app.id"
          class="retro-icon"
          :class="{ 'retro-icon--selected': selectedApp === app.id }"
          @click="selectApp(app.id)"
          @dblclick="openWindow(app)"
        >
          <span class="retro-icon__glyph">{{ app.icon }}</span>
          <span>{{ app.title }}</span>
        </button>
      </div>

      <article
        v-for="win in windows"
        :key="win.id"
        class="retro-window"
        :class="{ 'retro-window--minimized': win.minimized, 'retro-window--focused': activeWindow === win.id, 'retro-window--maximized': win.maximized }"
        :style="windowStyle(win)"
        @pointerdown="focusWindow(win.id)"
      >
        <header class="retro-window__titlebar" @dblclick="toggleMaximize(win.id)" @pointerdown.prevent="startDrag($event, win.id)">
          <span>{{ win.title }}</span>
          <div class="retro-window__actions">
            <button :aria-label="`最小化 ${win.title}`" @click.stop="win.minimized = true">_</button>
            <button :aria-label="`最大化 ${win.title}`" @click.stop="toggleMaximize(win.id)">□</button>
            <button :aria-label="`关闭 ${win.title}`" @click.stop="closeWindow(win.id)">×</button>
          </div>
        </header>
        <section class="retro-window__body">
          <template v-if="win.app === 'terminal'">
            <p>> welcome to legacy shell</p>
            <p>> commands: open resume | open projects | run game | exit</p>
            <div class="retro-terminal-input">
              <span>></span>
              <input v-model="command" aria-label="终端命令" placeholder="type: run game" @keydown.enter="runCommand" />
            </div>
            <p v-for="line in terminalLines" :key="line">{{ line }}</p>
          </template>
          <template v-else-if="win.app === 'game'">
            <p class="retro-window__notice">GAME.EXE 已挂载。当前版本提供系统级启动入口；完整 Canvas 游戏仍由全局彩蛋层承载。</p>
            <div class="retro-game-placeholder">
              PRESS START<br />
              <button type="button" @click="launchGameProtocol">LAUNCH GAME PROTOCOL</button>
            </div>
            <RouterLink to="/" class="retro-window__link">返回主世界</RouterLink>
          </template>
          <template v-else-if="win.app === 'resume'">
            <p>NAME: 黄彦杰</p>
            <p>ROLE: Frontend Developer / Requirement Analyst</p>
            <p>STACK: Vue 3 / TypeScript / ECharts / AI Research</p>
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer">OPEN PDF RESUME</a>
          </template>
          <template v-else>
            <p>PROJECT ARCHIVE DIRECTORY</p>
            <p>FILES: customer-service.sys / portfolio.next / dashboard.vis / aigc.lab</p>
            <RouterLink to="/projects" class="retro-window__link">OPEN CLASSIFIED ARCHIVE</RouterLink>
          </template>
        </section>
      </article>
    </div>

    <footer class="retro-taskbar">
      <button class="retro-taskbar__start" @click="startMenuOpen = !startMenuOpen">START</button>
      <div v-if="startMenuOpen" class="retro-start-menu">
        <button v-for="app in apps" :key="app.id" @click="openWindow(app); startMenuOpen = false">{{ app.title }}</button>
        <RouterLink to="/">EXIT TO MAIN WORLD</RouterLink>
      </div>
      <button
        v-for="win in windows"
        :key="win.id"
        class="retro-taskbar__item"
        :class="{ active: activeWindow === win.id && !win.minimized }"
        @click="restoreWindow(win.id)"
      >
        {{ win.title }}
      </button>
      <span class="retro-taskbar__clock">{{ clock }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useEasterEggStore } from '@/stores/easterEgg'

interface RetroApp {
  id: string
  title: string
  app: 'terminal' | 'game' | 'resume' | 'projects'
  icon: string
}

interface RetroWindow extends RetroApp {
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  minimized: boolean
  maximized: boolean
}

const apps: RetroApp[] = [
  { id: 'terminal', title: 'Terminal.app', app: 'terminal', icon: '▣' },
  { id: 'resume', title: 'Resume.exe', app: 'resume', icon: '▤' },
  { id: 'projects', title: 'Projects.dir', app: 'projects', icon: '▥' },
  { id: 'game', title: 'Game.exe', app: 'game', icon: '◆' },
]

const easterEggStore = useEasterEggStore()
const windows = reactive<RetroWindow[]>([])
const activeWindow = ref('')
const selectedApp = ref('')
const startMenuOpen = ref(false)
const command = ref('')
const terminalLines = reactive<string[]>(['> signal restored. cinematic website remains online.'])
const zIndex = ref(20)
const clock = ref('00:00')
let clockTimer = 0
let dragState: { id: string; offsetX: number; offsetY: number } | null = null

const windowStyle = computed(() => (win: RetroWindow) => ({
  left: `${win.x}px`,
  top: `${win.y}px`,
  width: `${win.width}px`,
  minHeight: `${win.height}px`,
  zIndex: win.zIndex,
}))

const selectApp = (id: string) => {
  if (selectedApp.value === id) {
    const app = apps.find((item) => item.id === id)
    if (app) openWindow(app)
    return
  }
  selectedApp.value = id
}

const openWindow = (app: RetroApp) => {
  const existing = windows.find((win) => win.id === app.id)
  if (existing) {
    existing.minimized = false
    focusWindow(existing.id)
    return
  }
  windows.push({
    ...app,
    x: 80 + windows.length * 36,
    y: 118 + windows.length * 28,
    width: app.app === 'game' ? 560 : 450,
    height: app.app === 'game' ? 330 : 250,
    zIndex: zIndex.value += 1,
    minimized: false,
    maximized: false,
  })
  focusWindow(app.id)
}

const focusWindow = (id: string) => {
  activeWindow.value = id
  const win = windows.find((item) => item.id === id)
  if (win) win.zIndex = zIndex.value += 1
}

const closeWindow = (id: string) => {
  const index = windows.findIndex((win) => win.id === id)
  if (index >= 0) windows.splice(index, 1)
}

const restoreWindow = (id: string) => {
  const win = windows.find((item) => item.id === id)
  if (!win) return
  win.minimized = false
  focusWindow(id)
}

const toggleMaximize = (id: string) => {
  const win = windows.find((item) => item.id === id)
  if (!win) return
  win.maximized = !win.maximized
  if (win.maximized) {
    win.x = 12
    win.y = 76
    win.width = Math.max(320, window.innerWidth - 24)
    win.height = Math.max(260, window.innerHeight - 138)
  } else {
    win.x = 90
    win.y = 118
    win.width = win.app === 'game' ? 560 : 450
    win.height = win.app === 'game' ? 330 : 250
  }
}

const startDrag = (event: PointerEvent, id: string) => {
  const win = windows.find((item) => item.id === id)
  if (!win || win.maximized) return
  dragState = { id, offsetX: event.clientX - win.x, offsetY: event.clientY - win.y }
}

const handleDrag = (event: PointerEvent) => {
  if (!dragState) return
  const win = windows.find((item) => item.id === dragState?.id)
  if (!win) return
  win.x = Math.min(Math.max(0, event.clientX - dragState.offsetX), window.innerWidth - 120)
  win.y = Math.min(Math.max(76, event.clientY - dragState.offsetY), window.innerHeight - 100)
}

const stopDrag = () => {
  dragState = null
}

const launchGameProtocol = () => {
  terminalLines.push('> launching legacy game protocol...')
  terminalLines.push('> switching phase: RULES -> PLAYING')
  easterEggStore.enterRules()
}

const runCommand = () => {
  const input = command.value.trim().toLowerCase()
  if (!input) return
  terminalLines.push(`> ${input}`)
  if (input.includes('game')) {
    openWindow(apps[3])
    launchGameProtocol()
  }
  else if (input.includes('resume')) openWindow(apps[1])
  else if (input.includes('project')) openWindow(apps[2])
  else if (input === 'exit') window.location.href = '/'
  else terminalLines.push('> unknown command. try: open resume | open projects | run game | exit')
  command.value = ''
}

const updateClock = () => {
  clock.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

onMounted(() => {
  openWindow(apps[0])
  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)
  window.addEventListener('pointermove', handleDrag)
  window.addEventListener('pointerup', stopDrag)
})

onUnmounted(() => {
  window.clearInterval(clockTimer)
  window.removeEventListener('pointermove', handleDrag)
  window.removeEventListener('pointerup', stopDrag)
})
</script>
