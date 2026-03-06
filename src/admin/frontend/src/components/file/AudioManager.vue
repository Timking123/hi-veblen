<script setup lang="ts">
/**
 * 音频管理组件
 * 支持音频分类浏览和上传
 * 
 * 需求: 5.3.2 - 按类型分类音频（背景音乐、音效）
 * 需求: 5.3.3 - 提供音频预览播放功能
 */
import { ref, computed, onMounted } from 'vue'
import {
  ElTabs,
  ElTabPane,
  ElButton,
  ElUpload,
  ElEmpty,
  ElMessage,
  ElMessageBox,
  ElIcon,
  ElTag
} from 'element-plus'
import { Upload, Delete, Headset } from '@element-plus/icons-vue'
import type { UploadRawFile } from 'element-plus'
import type { FileInfo } from '@/types'
import { getDirectoryTree, uploadAudio, deleteFile, type AudioType } from '@/api/file'
import { formatBeijingTime } from '@/utils/time'
import AudioPlayer from './AudioPlayer.vue'

// 当前选中的类型
const activeType = ref<AudioType>('bgm')

// 音频列表（按类型）
const audioByType = ref<Record<AudioType, FileInfo[]>>({
  bgm: [],
  sfx: []
})

// 加载状态
const loading = ref(false)
const uploading = ref(false)

// 当前播放的音频
const currentPlaying = ref<string | null>(null)

// 类型配置
const audioTypes: { value: AudioType; label: string; tip: string }[] = [
  { value: 'bgm', label: '背景音乐', tip: '支持 MP3/OGG 格式，用于游戏背景音乐' },
  { value: 'sfx', label: '音效', tip: '支持 MP3/OGG 格式，用于游戏音效' }
]

// 当前类型的音频列表
const currentAudioList = computed(() => {
  return audioByType.value[activeType.value] || []
})

// 当前类型配置
const currentType = computed(() => {
  return audioTypes.find(t => t.value === activeType.value)
})

/**
 * 加载音频列表
 */
async function loadAudioList() {
  loading.value = true
  try {
    const res = await getDirectoryTree('audio') as any
    const tree = res.tree || []
    
    // 解析目录树，按类型整理音频
    const newAudio: Record<AudioType, FileInfo[]> = {
      bgm: [],
      sfx: []
    }
    
    for (const node of tree) {
      if (node.type === 'directory') {
        const type = node.name as AudioType
        if (type in newAudio && node.children) {
          newAudio[type] = node.children.filter((child: FileInfo) => 
            child.type === 'file'
          )
        }
      }
    }
    
    audioByType.value = newAudio
  } catch (error) {
    console.error('加载音频列表失败:', error)
    // 不显示错误消息，可能是目录不存在
  } finally {
    loading.value = false
  }
}

/**
 * 格式化文件大小
 */
function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '-'
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}

/**
 * 格式化时间
 * 使用北京时间格式化 - 需求 14.1
 */
function formatTime(dateStr?: string): string {
  if (!dateStr) return '-'
  return formatBeijingTime(dateStr, 'YYYY-MM-DD HH:mm')
}

/**
 * 获取音频 URL
 * 使用公共路由，无需认证（用于 <audio> 元素直接访问）
 */
function getAudioUrl(path: string): string {
  // path 格式为 "audio/bgm/music.mp3"，需要提取 "audio/" 后面的部分
  const audioPath = path.replace(/^audio\//, '')
  return `/api/files/public/audio/${audioPath}`
}

/**
 * 上传前校验
 */
function beforeUpload(rawFile: UploadRawFile): boolean {
  // 检查文件类型
  const allowedTypes = ['audio/mpeg', 'audio/ogg']
  const allowedExtensions = ['.mp3', '.ogg']
  const ext = rawFile.name.toLowerCase().slice(rawFile.name.lastIndexOf('.'))
  
  if (!allowedTypes.includes(rawFile.type) && !allowedExtensions.includes(ext)) {
    ElMessage.error('仅支持 MP3/OGG 格式的音频文件')
    return false
  }
  
  // 检查文件大小（最大 10MB）
  const maxSize = 10 * 1024 * 1024
  if (rawFile.size > maxSize) {
    ElMessage.error('音频文件大小不能超过 10MB')
    return false
  }
  
  return true
}

/**
 * 处理上传
 */
async function handleUpload(options: { file: File }) {
  uploading.value = true
  try {
    await uploadAudio(options.file, activeType.value)
    ElMessage.success('音频上传成功')
    await loadAudioList()
  } catch (error: any) {
    console.error('上传音频失败:', error)
    ElMessage.error(error.message || '上传音频失败')
  } finally {
    uploading.value = false
  }
}

/**
 * 删除音频
 */
async function handleDelete(audio: FileInfo) {
  try {
    await ElMessageBox.confirm(
      `确定要删除音频 "${audio.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 如果正在播放，先停止
    if (currentPlaying.value === audio.path) {
      currentPlaying.value = null
    }
    
    await deleteFile(audio.path)
    ElMessage.success('删除成功')
    await loadAudioList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除音频失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 处理播放状态变化
 */
function handlePlay(path: string) {
  currentPlaying.value = path
}

/**
 * 处理暂停
 */
function handlePause() {
  // 可以在这里处理暂停逻辑
}

// 组件挂载时加载数据
onMounted(() => {
  loadAudioList()
})
</script>

<template>
  <div class="audio-manager">
    <!-- 类型标签页 -->
    <el-tabs v-model="activeType" @tab-change="loadAudioList">
      <el-tab-pane
        v-for="type in audioTypes"
        :key="type.value"
        :label="type.label"
        :name="type.value"
      />
    </el-tabs>
    
    <!-- 上传区域 -->
    <div class="upload-section">
      <el-upload
        class="audio-upload"
        :show-file-list="false"
        :before-upload="beforeUpload"
        :http-request="handleUpload"
        accept=".mp3,.ogg"
        :disabled="uploading"
      >
        <el-button type="primary" :loading="uploading">
          <el-icon v-if="!uploading"><Upload /></el-icon>
          {{ uploading ? '上传中...' : '上传音频' }}
        </el-button>
      </el-upload>
      <span class="upload-tip">{{ currentType?.tip }}</span>
    </div>
    
    <!-- 音频列表 -->
    <div v-loading="loading" class="audio-list">
      <template v-if="currentAudioList.length > 0">
        <div
          v-for="audio in currentAudioList"
          :key="audio.path"
          class="audio-item"
        >
          <div class="audio-player-wrapper">
            <AudioPlayer
              :src="getAudioUrl(audio.path)"
              :name="audio.name"
              @play="handlePlay(audio.path)"
              @pause="handlePause"
            />
          </div>
          
          <div class="audio-meta">
            <el-tag size="small" type="info">{{ formatSize(audio.size) }}</el-tag>
            <span class="audio-time">{{ formatTime(audio.modifiedAt) }}</span>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDelete(audio)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 空状态 -->
      <el-empty v-else :description="`暂无${currentType?.label || '音频'}`">
        <template #image>
          <el-icon :size="64" color="#C0C4CC"><Headset /></el-icon>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.audio-manager {
  padding: 0;
}

.upload-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-color-page);
  border-radius: 8px;
}

.upload-tip {
  font-size: 13px;
  color: var(--text-secondary);
}

.audio-list {
  min-height: 200px;
}

.audio-item {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.audio-player-wrapper {
  margin-bottom: 12px;
}

.audio-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 56px; // 与播放按钮对齐
}

.audio-time {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
