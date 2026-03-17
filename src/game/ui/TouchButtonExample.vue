<template>
  <div class="touch-button-example">
    <h2>触摸按钮组件示例</h2>
    
    <div class="demo-container">
      <!-- 开火按钮 -->
      <TouchButton
        :x="80"
        :y="120"
        :size="70"
        label="开火"
        color="#00D9FF"
        :visible="true"
        @press="handleFirePress"
        @release="handleFireRelease"
      />
      
      <!-- 导弹按钮 -->
      <TouchButton
        :x="80"
        :y="220"
        :size="70"
        label="导弹"
        color="#7B61FF"
        :visible="true"
        @press="handleMissilePress"
        @release="handleMissileRelease"
      />
      
      <!-- 核弹按钮 -->
      <TouchButton
        :x="80"
        :y="320"
        :size="70"
        label="核弹"
        color="#FF6B9D"
        :visible="true"
        @press="handleNukePress"
        @release="handleNukeRelease"
      />
    </div>
    
    <div class="event-log">
      <h3>事件日志</h3>
      <div class="log-content">
        <div v-for="(log, index) in eventLogs" :key="index" class="log-item">
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TouchButton from './TouchButton.vue'

/**
 * 触摸按钮组件使用示例
 * 展示如何使用 TouchButton 组件创建游戏控制按钮
 */

const eventLogs = ref<string[]>([])

function addLog(message: string): void {
  const timestamp = new Date().toLocaleTimeString()
  eventLogs.value.unshift(`[${timestamp}] ${message}`)
  
  // 限制日志数量
  if (eventLogs.value.length > 10) {
    eventLogs.value.pop()
  }
}

function handleFirePress(): void {
  addLog('🔫 开火按钮按下')
}

function handleFireRelease(): void {
  addLog('🔫 开火按钮释放')
}

function handleMissilePress(): void {
  addLog('🚀 导弹按钮按下')
}

function handleMissileRelease(): void {
  addLog('🚀 导弹按钮释放')
}

function handleNukePress(): void {
  addLog('💣 核弹按钮按下')
}

function handleNukeRelease(): void {
  addLog('💣 核弹按钮释放')
}
</script>

<style scoped>
.touch-button-example {
  padding: 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #ffffff;
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #00d9ff;
  font-size: 28px;
}

.demo-container {
  position: relative;
  width: 100%;
  height: 500px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  border: 2px solid rgba(0, 217, 255, 0.3);
  margin-bottom: 30px;
}

.event-log {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  padding: 20px;
  border: 2px solid rgba(0, 217, 255, 0.3);
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #00d9ff;
  font-size: 20px;
}

.log-content {
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  padding: 8px 12px;
  margin-bottom: 5px;
  background: rgba(0, 217, 255, 0.1);
  border-left: 3px solid #00d9ff;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

/* 滚动条样式 */
.log-content::-webkit-scrollbar {
  width: 8px;
}

.log-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.log-content::-webkit-scrollbar-thumb {
  background: rgba(0, 217, 255, 0.5);
  border-radius: 4px;
}

.log-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 217, 255, 0.7);
}
</style>
