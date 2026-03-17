<template>
  <div class="joystick-example">
    <div class="info-panel">
      <h3>虚拟摇杆演示</h3>
      <div class="status">
        <p>状态: {{ isActive ? '激活' : '未激活' }}</p>
        <p>方向 X: {{ direction.x.toFixed(2) }}</p>
        <p>方向 Y: {{ direction.y.toFixed(2) }}</p>
        <p>角度: {{ (direction.angle * 180 / Math.PI).toFixed(1) }}°</p>
        <p>距离: {{ direction.distance.toFixed(2) }}</p>
      </div>
      <div class="visual-indicator">
        <div 
          class="indicator-dot"
          :style="{
            transform: `translate(${direction.x * 50}px, ${direction.y * 50}px)`
          }"
        ></div>
      </div>
    </div>

    <!-- 虚拟摇杆 -->
    <VirtualJoystick
      :x="100"
      :y="150"
      :radius="60"
      :visible="true"
      :dead-zone="0.1"
      @move="handleMove"
      @release="handleRelease"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import VirtualJoystick from './VirtualJoystick.vue'

/**
 * 虚拟摇杆使用示例
 * 
 * 此组件演示如何使用虚拟摇杆组件
 */

const isActive = ref(false)
const direction = ref({
  x: 0,
  y: 0,
  angle: 0,
  distance: 0
})

function handleMove(dir: { x: number; y: number; angle: number; distance: number }) {
  isActive.value = true
  direction.value = dir
  
  console.log('摇杆移动:', {
    x: dir.x.toFixed(2),
    y: dir.y.toFixed(2),
    angle: (dir.angle * 180 / Math.PI).toFixed(1) + '°',
    distance: dir.distance.toFixed(2)
  })
}

function handleRelease() {
  isActive.value = false
  direction.value = {
    x: 0,
    y: 0,
    angle: 0,
    distance: 0
  }
  
  console.log('摇杆释放')
}
</script>

<style scoped>
.joystick-example {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #151932 100%);
  overflow: hidden;
}

.info-panel {
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(0, 217, 255, 0.5);
  border-radius: 8px;
  padding: 20px;
  color: #00d9ff;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  z-index: 999;
}

.info-panel h3 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #00ff00;
}

.status p {
  margin: 8px 0;
  line-height: 1.5;
}

.visual-indicator {
  margin-top: 20px;
  width: 120px;
  height: 120px;
  border: 2px solid rgba(0, 217, 255, 0.3);
  border-radius: 50%;
  position: relative;
  background: rgba(0, 217, 255, 0.05);
}

.indicator-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  background: #00d9ff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: transform 0.1s;
  box-shadow: 0 0 10px rgba(0, 217, 255, 0.8);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .info-panel {
    font-size: 10px;
    padding: 15px;
  }

  .info-panel h3 {
    font-size: 12px;
  }

  .visual-indicator {
    width: 100px;
    height: 100px;
  }
}
</style>
