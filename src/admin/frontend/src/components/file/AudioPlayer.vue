<script setup lang="ts">
/**
 * 音频播放器组件
 * 支持音频预览播放
 * 
 * 需求: 5.3.3 - 提供音频预览播放功能
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElIcon, ElSlider, ElButton } from 'element-plus'
import {
  VideoPlay,
  VideoPause,
  Mute,
  Microphone
} from '@element-plus/icons-vue'

// 定义 Props
interface Props {
  /** 音频源 URL */
  src: string
  /** 音频名称 */
  name?: string
  /** 是否自动播放 */
  autoplay?: boolean
  /** 是否循环播放 */
  loop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  name: '未知音频',
  autoplay: false,
  loop: false
})

// 定义 Emits
const emit = defineEmits<{
  /** 播放事件 */
  (e: 'play'): void
  /** 暂停事件 */
  (e: 'pause'): void
  /** 结束事件 */
  (e: 'ended'): void
  /** 错误事件 */
  (e: 'error', error: Error): void
}>()

// 音频元素引用
const audioRef = ref<HTMLAudioElement>()

// 播放状态
const isPlaying = ref(false)
const isMuted = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(80)

// 加载状态
const isLoading = ref(true)
const hasError = ref(false)

// 格式化时间
function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 计算进度百分比
const progress = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

// 格式化当前时间显示
const timeDisplay = computed(() => {
  return `${formatTime(currentTime.value)} / ${formatTime(duration.value)}`
})

/**
 * 播放/暂停切换
 */
function togglePlay() {
  const audio = audioRef.value
  if (!audio) return
  
  if (isPlaying.value) {
    audio.pause()
  } else {
    audio.play()
  }
}

/**
 * 静音切换
 */
function toggleMute() {
  const audio = audioRef.value
  if (!audio) return
  
  isMuted.value = !isMuted.value
  audio.muted = isMuted.value
}

/**
 * 处理进度条变化
 */
function handleProgressChange(value: number) {
  const audio = audioRef.value
  if (!audio || duration.value === 0) return
  
  const newTime = (value / 100) * duration.value
  audio.currentTime = newTime
  currentTime.value = newTime
}

/**
 * 处理音量变化
 */
function handleVolumeChange(value: number) {
  const audio = audioRef.value
  if (!audio) return
  
  volume.value = value
  audio.volume = value / 100
  
  if (value === 0) {
    isMuted.value = true
  } else if (isMuted.value) {
    isMuted.value = false
    audio.muted = false
  }
}

/**
 * 音频加载完成
 */
function handleLoadedMetadata() {
  const audio = audioRef.value
  if (!audio) return
  
  duration.value = audio.duration
  isLoading.value = false
  hasError.value = false
}

/**
 * 音频播放
 */
function handlePlay() {
  isPlaying.value = true
  emit('play')
}

/**
 * 音频暂停
 */
function handlePause() {
  isPlaying.value = false
  emit('pause')
}

/**
 * 音频结束
 */
function handleEnded() {
  isPlaying.value = false
  currentTime.value = 0
  emit('ended')
}

/**
 * 时间更新
 */
function handleTimeUpdate() {
  const audio = audioRef.value
  if (!audio) return
  
  currentTime.value = audio.currentTime
}

/**
 * 音频错误
 */
function handleError(e: Event) {
  hasError.value = true
  isLoading.value = false
  emit('error', new Error('音频加载失败'))
}

// 监听音频源变化
watch(() => props.src, () => {
  isLoading.value = true
  hasError.value = false
  currentTime.value = 0
  duration.value = 0
  isPlaying.value = false
})

// 组件卸载时停止播放
onUnmounted(() => {
  const audio = audioRef.value
  if (audio) {
    audio.pause()
    audio.src = ''
  }
})
</script>

<template>
  <div class="audio-player" :class="{ 'is-error': hasError }">
    <!-- 隐藏的音频元素 -->
    <audio
      ref="audioRef"
      :src="src"
      :autoplay="autoplay"
      :loop="loop"
      preload="metadata"
      @loadedmetadata="handleLoadedMetadata"
      @play="handlePlay"
      @pause="handlePause"
      @ended="handleEnded"
      @timeupdate="handleTimeUpdate"
      @error="handleError"
    />
    
    <!-- 播放器界面 -->
    <div class="player-content">
      <!-- 播放按钮 -->
      <el-button
        class="play-btn"
        :type="isPlaying ? 'primary' : 'default'"
        circle
        :disabled="isLoading || hasError"
        @click="togglePlay"
      >
        <el-icon :size="20">
          <VideoPause v-if="isPlaying" />
          <VideoPlay v-else />
        </el-icon>
      </el-button>
      
      <!-- 音频信息和进度 -->
      <div class="player-info">
        <div class="audio-name" :title="name">{{ name }}</div>
        
        <div class="progress-bar">
          <el-slider
            :model-value="progress"
            :disabled="isLoading || hasError"
            :show-tooltip="false"
            @input="handleProgressChange"
          />
        </div>
        
        <div class="time-display">
          <span v-if="hasError" class="error-text">加载失败</span>
          <span v-else-if="isLoading">加载中...</span>
          <span v-else>{{ timeDisplay }}</span>
        </div>
      </div>
      
      <!-- 音量控制 -->
      <div class="volume-control">
        <el-button
          class="mute-btn"
          text
          :disabled="isLoading || hasError"
          @click="toggleMute"
        >
          <el-icon :size="18">
            <Mute v-if="isMuted || volume === 0" />
            <Microphone v-else />
          </el-icon>
        </el-button>
        
        <el-slider
          v-model="volume"
          :disabled="isLoading || hasError"
          :show-tooltip="false"
          class="volume-slider"
          @input="handleVolumeChange"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.audio-player {
  padding: 12px 16px;
  background: var(--bg-color-page);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  
  &.is-error {
    background: #FEF0F0;
    border-color: #FBC4C4;
  }
}

.player-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.play-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.audio-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.progress-bar {
  :deep(.el-slider) {
    height: 20px;
    
    .el-slider__runway {
      height: 4px;
      margin: 8px 0;
    }
    
    .el-slider__bar {
      height: 4px;
    }
    
    .el-slider__button-wrapper {
      top: -14px;
    }
    
    .el-slider__button {
      width: 12px;
      height: 12px;
    }
  }
}

.time-display {
  font-size: 12px;
  color: var(--text-secondary);
  
  .error-text {
    color: #F56C6C;
  }
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mute-btn {
  padding: 4px;
  color: var(--text-regular);
  
  &:hover {
    color: var(--primary-color);
  }
}

.volume-slider {
  width: 80px;
  
  :deep(.el-slider__runway) {
    height: 4px;
    margin: 8px 0;
  }
  
  :deep(.el-slider__bar) {
    height: 4px;
  }
  
  :deep(.el-slider__button) {
    width: 10px;
    height: 10px;
  }
}
</style>
