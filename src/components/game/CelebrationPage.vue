<template>
  <div v-if="isVisible" class="celebration-page">
    <!-- 背景 -->
    <div class="celebration-bg"></div>

    <!-- 横幅 -->
    <div class="banner" :class="{ 'banner-wave': bannerWaving }" @click="handleBannerClick">
      <div class="banner-text">🎉 恭喜通关 🎉</div>
    </div>

    <!-- 气球（左侧） -->
    <div class="balloons-left">
      <div
        v-for="(balloon, index) in balloonsLeft"
        :key="`left-${index}`"
        class="balloon"
        :class="{ 'balloon-popped': balloon.popped }"
        :style="{ animationDelay: `${index * 0.2}s`, backgroundColor: balloon.color }"
        @click="popBalloon(balloon)"
      >
        <div v-if="balloon.popped" class="confetti-container">
          <div v-for="i in 10" :key="i" class="confetti" :style="getConfettiStyle()"></div>
        </div>
      </div>
    </div>

    <!-- 气球（右侧） -->
    <div class="balloons-right">
      <div
        v-for="(balloon, index) in balloonsRight"
        :key="`right-${index}`"
        class="balloon"
        :class="{ 'balloon-popped': balloon.popped }"
        :style="{ animationDelay: `${index * 0.2}s`, backgroundColor: balloon.color }"
        @click="popBalloon(balloon)"
      >
        <div v-if="balloon.popped" class="confetti-container">
          <div v-for="i in 10" :key="i" class="confetti" :style="getConfettiStyle()"></div>
        </div>
      </div>
    </div>

    <!-- 礼花（左侧） -->
    <div class="fireworks-left">
      <div
        v-for="(firework, index) in fireworksLeft"
        :key="`fw-left-${index}`"
        class="firework"
        :class="{ 'firework-launched': firework.launched }"
        :style="{ animationDelay: `${index * 0.3}s` }"
        @click="launchFirework(firework)"
      >
        🎆
      </div>
    </div>

    <!-- 礼花（右侧） -->
    <div class="fireworks-right">
      <div
        v-for="(firework, index) in fireworksRight"
        :key="`fw-right-${index}`"
        class="firework"
        :class="{ 'firework-launched': firework.launched }"
        :style="{ animationDelay: `${index * 0.3}s` }"
        @click="launchFirework(firework)"
      >
        🎆
      </div>
    </div>

    <!-- 红毯 -->
    <div class="carpet" :class="{ 'carpet-unrolled': carpetUnrolled }" @click="unrollCarpet">
      <div class="carpet-rolled"></div>
      <div class="carpet-path"></div>
    </div>

    <!-- 蛋糕 -->
    <div class="cake-container">
      <div class="cake" @click="handleCakeClick">
        <!-- 蛋糕层 -->
        <div class="cake-layer cake-layer-3"></div>
        <div class="cake-layer cake-layer-2"></div>
        <div class="cake-layer cake-layer-1"></div>

        <!-- 蜡烛 -->
        <div class="candles">
          <div
            v-for="i in 3"
            :key="i"
            class="candle"
            :class="{ 'candle-lit': candlesLit }"
          >
            <div class="candle-stick"></div>
            <div class="candle-flame"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 贺卡弹窗 -->
    <div v-if="showCard" class="card-modal" @click.self="closeCard">
      <div class="card">
        <div class="card-header">🎊 恭喜通关 🎊</div>
        <div class="card-body">
          <p>感谢你完成了这段旅程！</p>
          <p>从家里到学校，再到公司</p>
          <p>你经历了人生的三个重要阶段</p>
          <p>希望你在现实中也能勇往直前！</p>
        </div>
        <button class="card-button" @click="returnToHome">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useEasterEggStore } from '@/stores/easterEgg'
import { GamePhase } from '@/game/types'
import { AudioSystem, SoundEffect } from '@/game/AudioSystem'

const easterEggStore = useEasterEggStore()

// 组件可见性
const isVisible = computed(() => easterEggStore.phase === GamePhase.CELEBRATION)

// 音频系统
let audioSystem: AudioSystem | null = null

// 气球数据
interface Balloon {
  color: string
  popped: boolean
}

const balloonsLeft = ref<Balloon[]>([
  { color: '#FF6B6B', popped: false },
  { color: '#4ECDC4', popped: false },
  { color: '#FFE66D', popped: false },
  { color: '#95E1D3', popped: false }
])

const balloonsRight = ref<Balloon[]>([
  { color: '#A8E6CF', popped: false },
  { color: '#FFD3B6', popped: false },
  { color: '#FFAAA5', popped: false },
  { color: '#FF8B94', popped: false }
])

// 礼花数据
interface Firework {
  launched: boolean
}

const fireworksLeft = ref<Firework[]>([
  { launched: false },
  { launched: false },
  { launched: false }
])

const fireworksRight = ref<Firework[]>([
  { launched: false },
  { launched: false },
  { launched: false }
])

// 蛋糕状态
const candlesLit = ref(false)
const cakeClickCount = ref(0)
const candleLitTime = ref(0)

// 横幅状态
const bannerWaving = ref(false)

// 红毯状态
const carpetUnrolled = ref(false)

// 贺卡状态
const showCard = ref(false)

/**
 * 气球爆炸
 */
const popBalloon = (balloon: Balloon): void => {
  if (!balloon.popped) {
    balloon.popped = true
    
    // 需求 18.1: 气球点击时播放音效
    if (audioSystem) {
      audioSystem.playSoundEffect(SoundEffect.BALLOON_POP)
    }
    
    console.log('[庆祝页面] 气球爆炸')
  }
}

/**
 * 获取彩片样式
 */
const getConfettiStyle = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#A8E6CF']
  return {
    backgroundColor: colors[Math.floor(Math.random() * colors.length)],
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 0.5}s`,
    animationDuration: `${0.5 + Math.random() * 0.5}s`
  }
}

/**
 * 发射礼花
 */
const launchFirework = (firework: Firework): void => {
  if (!firework.launched) {
    firework.launched = true
    
    // 需求 18.5: 礼花点击时播放音效
    if (audioSystem) {
      audioSystem.playSoundEffect(SoundEffect.FIREWORK_LAUNCH)
    }
    
    console.log('[庆祝页面] 礼花发射')
  }
}

/**
 * 横幅点击
 */
const handleBannerClick = (): void => {
  bannerWaving.value = true
  setTimeout(() => {
    bannerWaving.value = false
  }, 1000)
  
  // 需求 18.2: 横幅点击时播放音效
  if (audioSystem) {
    audioSystem.playSoundEffect(SoundEffect.BANNER_SHAKE)
  }
  
  console.log('[庆祝页面] 横幅晃动')
}

/**
 * 铺开红毯
 */
const unrollCarpet = (): void => {
  if (!carpetUnrolled.value) {
    carpetUnrolled.value = true
    
    // 需求 18.4: 红毯点击时播放音效
    if (audioSystem) {
      audioSystem.playSoundEffect(SoundEffect.CARPET_ROLL)
    }
    
    console.log('[庆祝页面] 红毯铺开')
  }
}

/**
 * 蛋糕点击
 */
const handleCakeClick = (): void => {
  cakeClickCount.value++

  if (cakeClickCount.value === 1) {
    // 首次点击：点亮蜡烛
    candlesLit.value = true
    candleLitTime.value = Date.now()
    
    // 需求 18.3: 蛋糕点击时播放音效
    if (audioSystem) {
      audioSystem.playSoundEffect(SoundEffect.CAKE_LIGHT)
    }
    
    console.log('[庆祝页面] 蜡烛点亮')
  } else if (cakeClickCount.value >= 2 && Date.now() - candleLitTime.value >= 1000) {
    // 第二次点击（蜡烛点亮1秒后）：显示贺卡
    showCard.value = true
    console.log('[庆祝页面] 显示贺卡')
  }
}

/**
 * 关闭贺卡
 */
const closeCard = (): void => {
  showCard.value = false
}

/**
 * 返回首页
 */
const returnToHome = (): void => {
  console.log('[庆祝页面] 返回首页')
  easterEggStore.reset()
  // 刷新页面返回首页（恢复崩塌后的页面）
  window.location.href = '/'
}

// 组件挂载
onMounted(async () => {
  console.log('[庆祝页面] 组件已挂载')
  
  // 初始化音频系统
  try {
    audioSystem = new AudioSystem()
    await audioSystem.initialize()
    await audioSystem.resumeAudioContext()
    console.log('[庆祝页面] 音频系统初始化成功')
  } catch (error) {
    console.error('[庆祝页面] 音频系统初始化失败:', error)
  }
})

// 组件卸载
onUnmounted(() => {
  // 清理音频系统
  if (audioSystem) {
    audioSystem.cleanup()
    audioSystem = null
    console.log('[庆祝页面] 音频系统已清理')
  }
})
</script>

<style scoped>
.celebration-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: 10000;
}

.celebration-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  animation: bgShift 10s ease-in-out infinite;
}

@keyframes bgShift {
  0%, 100% {
    filter: hue-rotate(0deg);
  }
  50% {
    filter: hue-rotate(30deg);
  }
}

/* 横幅 */
.banner {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
  padding: 20px 60px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.3s;
  z-index: 10;
  animation: bannerAppear 1s ease-out;
}

@keyframes bannerAppear {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.banner:hover {
  transform: translateX(-50%) scale(1.05);
}

.banner-wave {
  animation: wave 1s ease-in-out;
}

@keyframes wave {
  0%, 100% {
    transform: translateX(-50%) rotate(0deg);
  }
  25% {
    transform: translateX(-50%) rotate(-5deg);
  }
  75% {
    transform: translateX(-50%) rotate(5deg);
  }
}

.banner-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 24px;
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

/* 气球 */
.balloons-left,
.balloons-right {
  position: absolute;
  top: 150px;
  display: flex;
  flex-direction: column;
  gap: 30px;
  z-index: 5;
}

.balloons-left {
  left: 50px;
}

.balloons-right {
  right: 50px;
}

.balloon {
  width: 60px;
  height: 80px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  cursor: pointer;
  position: relative;
  animation: balloonFloat 3s ease-in-out infinite, balloonAppear 0.5s ease-out;
  opacity: 0;
  animation-fill-mode: forwards;
  box-shadow: inset -10px -10px 20px rgba(0, 0, 0, 0.2),
              0 5px 15px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s;
}

.balloon:hover {
  transform: scale(1.1);
}

@keyframes balloonAppear {
  to {
    opacity: 1;
  }
}

@keyframes balloonFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.balloon::after {
  content: '';
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 20px;
  background: #666;
}

.balloon-popped {
  animation: balloonPop 0.3s ease-out forwards;
}

@keyframes balloonPop {
  to {
    transform: scale(0);
    opacity: 0;
  }
}

.confetti-container {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.confetti {
  position: absolute;
  width: 8px;
  height: 8px;
  animation: confettiFall 1s ease-out forwards;
}

@keyframes confettiFall {
  to {
    transform: translate(
      calc(var(--random-x, 0) * 100px),
      calc(var(--random-y, 100) * 1px)
    ) rotate(720deg);
    opacity: 0;
  }
}

/* 礼花 */
.fireworks-left,
.fireworks-right {
  position: absolute;
  top: 200px;
  display: flex;
  flex-direction: column;
  gap: 50px;
  z-index: 5;
}

.fireworks-left {
  left: 150px;
}

.fireworks-right {
  right: 150px;
}

.firework {
  font-size: 40px;
  cursor: pointer;
  animation: fireworkAppear 0.5s ease-out;
  opacity: 0;
  animation-fill-mode: forwards;
  transition: transform 0.3s;
}

.firework:hover {
  transform: scale(1.2);
}

@keyframes fireworkAppear {
  to {
    opacity: 1;
  }
}

.firework-launched {
  animation: fireworkLaunch 1s ease-out forwards;
}

@keyframes fireworkLaunch {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-100px) scale(1.5);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-200px) scale(2);
    opacity: 0;
  }
}

/* 红毯 */
.carpet {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 300px;
  cursor: pointer;
  z-index: 1;
}

.carpet-rolled {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 30px;
  background: linear-gradient(90deg, #8B0000, #DC143C, #8B0000);
  border-radius: 50% 50% 0 0;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
  transition: all 1s ease-out;
}

.carpet-path {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 0;
  background: linear-gradient(180deg, #DC143C, #8B0000);
  border-left: 10px solid #FFD700;
  border-right: 10px solid #FFD700;
  transition: height 1s ease-out;
}

.carpet-unrolled .carpet-rolled {
  height: 20px;
}

.carpet-unrolled .carpet-path {
  height: 280px;
}

/* 蛋糕 */
.cake-container {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  animation: cakeAppear 1s ease-out 0.5s;
  opacity: 0;
  animation-fill-mode: forwards;
}

@keyframes cakeAppear {
  to {
    opacity: 1;
  }
}

.cake {
  cursor: pointer;
  transition: transform 0.3s;
}

.cake:hover {
  transform: scale(1.05);
}

.cake-layer {
  margin: 0 auto;
  border-radius: 10px;
  position: relative;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.cake-layer-1 {
  width: 120px;
  height: 40px;
  background: linear-gradient(180deg, #FFB6C1, #FF69B4);
  border: 3px solid #FF1493;
}

.cake-layer-2 {
  width: 100px;
  height: 35px;
  background: linear-gradient(180deg, #FFD700, #FFA500);
  border: 3px solid #FF8C00;
  margin-top: -5px;
}

.cake-layer-3 {
  width: 80px;
  height: 30px;
  background: linear-gradient(180deg, #98FB98, #00FA9A);
  border: 3px solid #00FF7F;
  margin-top: -5px;
}

.candles {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
}

.candle {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.candle-stick {
  width: 8px;
  height: 30px;
  background: linear-gradient(90deg, #FFF, #FFE4B5, #FFF);
  border-radius: 2px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.candle-flame {
  width: 12px;
  height: 15px;
  background: radial-gradient(circle, #FFD700, #FF4500);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  margin-top: -5px;
  opacity: 0;
  transition: opacity 0.5s;
}

.candle-lit .candle-flame {
  opacity: 1;
  animation: flameFlicker 0.5s ease-in-out infinite;
}

@keyframes flameFlicker {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 贺卡弹窗 */
.card-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 20;
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.card {
  background: linear-gradient(135deg, #FFF 0%, #FFE4E1 100%);
  border: 5px solid #FFD700;
  border-radius: 20px;
  padding: 40px;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: cardAppear 0.5s ease-out;
}

@keyframes cardAppear {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.card-header {
  font-family: 'Press Start 2P', monospace;
  font-size: 24px;
  color: #FF1493;
  text-align: center;
  margin-bottom: 30px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.card-body {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: #333;
  line-height: 2;
  text-align: center;
  margin-bottom: 30px;
}

.card-body p {
  margin: 10px 0;
}

.card-button {
  display: block;
  margin: 0 auto;
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  padding: 15px 30px;
  background: linear-gradient(90deg, #FF1493, #FF69B4);
  color: #FFF;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(255, 20, 147, 0.4);
  transition: all 0.3s;
}

.card-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 20, 147, 0.6);
}

.card-button:active {
  transform: translateY(0);
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  /* 禁用背景色相变化 */
  .celebration-bg {
    animation: none;
  }

  /* 禁用气球浮动动画 */
  .balloon {
    animation: balloonAppear 0.5s ease-out forwards;
  }

  /* 禁用蜡烛闪烁 */
  .candle-lit .candle-flame {
    animation: none;
  }

  /* 禁用横幅晃动 */
  .banner-wave {
    animation: none;
  }

  /* 简化其他动画 */
  .banner,
  .cake-container,
  .firework {
    animation: none;
    opacity: 1;
  }

  /* 禁用悬停缩放效果 */
  .banner:hover,
  .balloon:hover,
  .firework:hover,
  .cake:hover {
    transform: none;
  }

  .banner:hover {
    transform: translateX(-50%);
  }
}
</style>
