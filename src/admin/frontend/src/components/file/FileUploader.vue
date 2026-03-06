<script setup lang="ts">
/**
 * 文件上传器组件
 * 支持拖拽上传和点击上传
 * 
 * 需求: 5.4.2 - 提供文件上传功能
 */
import { ref, computed } from 'vue'
import { ElUpload, ElButton, ElIcon, ElProgress, ElMessage } from 'element-plus'
import { Upload, Document, Close, Check } from '@element-plus/icons-vue'
import type { UploadFile, UploadRawFile } from 'element-plus'

// 定义 Props
interface Props {
  /** 目标上传目录 */
  targetPath?: string
  /** 允许的文件类型（MIME 类型或扩展名） */
  accept?: string
  /** 最大文件大小（MB） */
  maxSize?: number
  /** 是否支持多文件上传 */
  multiple?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 提示文字 */
  tip?: string
}

const props = withDefaults(defineProps<Props>(), {
  targetPath: '',
  accept: '',
  maxSize: 10,
  multiple: true,
  disabled: false,
  tip: ''
})

// 定义 Emits
const emit = defineEmits<{
  /** 文件上传成功 */
  (e: 'success', file: UploadFile, response: any): void
  /** 文件上传失败 */
  (e: 'error', file: UploadFile, error: Error): void
  /** 开始上传 */
  (e: 'start', file: UploadFile): void
  /** 上传进度 */
  (e: 'progress', file: UploadFile, percent: number): void
}>()

// 上传组件引用
const uploadRef = ref<InstanceType<typeof ElUpload>>()

// 文件列表
const fileList = ref<UploadFile[]>([])

// 是否正在上传
const uploading = ref(false)

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}

/**
 * 文件上传前的校验
 */
function beforeUpload(rawFile: UploadRawFile): boolean {
  // 检查文件大小
  const maxBytes = props.maxSize * 1024 * 1024
  if (rawFile.size > maxBytes) {
    ElMessage.error(`文件大小不能超过 ${props.maxSize}MB`)
    return false
  }
  
  return true
}

/**
 * 处理文件变化
 */
function handleChange(file: UploadFile, files: UploadFile[]) {
  fileList.value = files
}

/**
 * 处理文件移除
 */
function handleRemove(file: UploadFile) {
  const index = fileList.value.findIndex(f => f.uid === file.uid)
  if (index > -1) {
    fileList.value.splice(index, 1)
  }
}

/**
 * 处理上传成功
 */
function handleSuccess(response: any, file: UploadFile) {
  file.status = 'success'
  emit('success', file, response)
}

/**
 * 处理上传失败
 */
function handleError(error: Error, file: UploadFile) {
  file.status = 'fail'
  emit('error', file, error)
}

/**
 * 处理上传进度
 */
function handleProgress(event: { percent: number }, file: UploadFile) {
  file.percentage = event.percent
  emit('progress', file, event.percent)
}

/**
 * 清空文件列表
 */
function clearFiles() {
  fileList.value = []
  uploadRef.value?.clearFiles()
}

/**
 * 获取文件状态图标
 */
function getStatusIcon(status?: string) {
  switch (status) {
    case 'success':
      return Check
    case 'fail':
      return Close
    default:
      return Document
  }
}

/**
 * 获取文件状态颜色
 */
function getStatusColor(status?: string): string {
  switch (status) {
    case 'success':
      return '#67C23A'
    case 'fail':
      return '#F56C6C'
    default:
      return '#909399'
  }
}

// 暴露方法
defineExpose({
  clearFiles
})
</script>

<template>
  <div class="file-uploader">
    <el-upload
      ref="uploadRef"
      class="upload-area"
      drag
      :action="`/api/files/upload`"
      :data="{ path: targetPath }"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :on-change="handleChange"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-progress="handleProgress"
    >
      <div class="upload-content">
        <el-icon class="upload-icon" :size="48">
          <Upload />
        </el-icon>
        <div class="upload-text">
          <p class="main-text">将文件拖到此处，或<em>点击上传</em></p>
          <p v-if="tip" class="tip-text">{{ tip }}</p>
          <p v-else class="tip-text">
            支持单个或批量上传，单个文件不超过 {{ maxSize }}MB
          </p>
        </div>
      </div>
    </el-upload>
    
    <!-- 文件列表 -->
    <div v-if="fileList.length > 0" class="file-list">
      <div class="list-header">
        <span>待上传文件 ({{ fileList.length }})</span>
        <el-button type="primary" link size="small" @click="clearFiles">
          清空
        </el-button>
      </div>
      
      <div class="list-content">
        <div 
          v-for="file in fileList" 
          :key="file.uid" 
          class="file-item"
          :class="{ 'is-success': file.status === 'success', 'is-fail': file.status === 'fail' }"
        >
          <div class="file-info">
            <el-icon 
              class="file-icon" 
              :style="{ color: getStatusColor(file.status) }"
            >
              <component :is="getStatusIcon(file.status)" />
            </el-icon>
            <span class="file-name" :title="file.name">{{ file.name }}</span>
            <span class="file-size">{{ formatSize(file.size || 0) }}</span>
          </div>
          
          <!-- 上传进度 -->
          <el-progress
            v-if="file.status === 'uploading'"
            :percentage="file.percentage || 0"
            :stroke-width="4"
            :show-text="false"
          />
          
          <!-- 移除按钮 -->
          <el-icon 
            class="remove-btn" 
            @click.stop="handleRemove(file)"
          >
            <Close />
          </el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.file-uploader {
  width: 100%;
}

.upload-area {
  width: 100%;
  
  :deep(.el-upload) {
    width: 100%;
  }
  
  :deep(.el-upload-dragger) {
    width: 100%;
    height: auto;
    padding: 40px 20px;
    border-radius: 8px;
    
    &:hover {
      border-color: #409EFF;
    }
  }
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  color: #C0C4CC;
}

.upload-text {
  text-align: center;
  
  .main-text {
    margin: 0;
    font-size: 14px;
    color: #606266;
    
    em {
      color: #409EFF;
      font-style: normal;
    }
  }
  
  .tip-text {
    margin: 8px 0 0;
    font-size: 12px;
    color: #909399;
  }
}

.file-list {
  margin-top: 16px;
  border: 1px solid #EBEEF5;
  border-radius: 8px;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #F5F7FA;
  border-bottom: 1px solid #EBEEF5;
  font-size: 14px;
  color: #606266;
}

.list-content {
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #EBEEF5;
  transition: background-color 0.2s;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #F5F7FA;
    
    .remove-btn {
      opacity: 1;
    }
  }
  
  &.is-success {
    background: #F0F9EB;
  }
  
  &.is-fail {
    background: #FEF0F0;
  }
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #303133;
}

.file-size {
  flex-shrink: 0;
  font-size: 12px;
  color: #909399;
}

.remove-btn {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  cursor: pointer;
  color: #909399;
  transition: all 0.2s;
  
  &:hover {
    color: #F56C6C;
  }
}

.file-item {
  position: relative;
}
</style>
