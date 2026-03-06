<script setup lang="ts">
/**
 * 简历管理器组件
 * 管理简历版本、上传和下载
 * 
 * 需求: 5.1.1 - 提供简历上传功能（仅支持 PDF 格式）
 * 需求: 5.1.2 - 保留简历版本历史（最多5个版本）
 * 需求: 5.1.3 - 提供设置当前使用简历的功能
 * 需求: 5.1.4 - 显示简历下载统计
 */
import { ref, computed, onMounted } from 'vue'
import {
  ElTable,
  ElTableColumn,
  ElButton,
  ElTag,
  ElUpload,
  ElMessage,
  ElMessageBox,
  ElIcon,
  ElEmpty
} from 'element-plus'
import {
  Upload,
  Download,
  Check,
  Document,
  DataAnalysis
} from '@element-plus/icons-vue'
import type { UploadRawFile } from 'element-plus'
import type { ResumeVersion } from '@/types'
import {
  getResumeList,
  uploadResume,
  setActiveResume,
  downloadResume
} from '@/api/file'
import { formatBeijingTime } from '@/utils/time'

// 简历列表
const resumeList = ref<ResumeVersion[]>([])

// 加载状态
const loading = ref(false)
const uploading = ref(false)

// 计算总下载次数
const totalDownloads = computed(() => {
  return resumeList.value.reduce((sum, item) => sum + item.downloadCount, 0)
})

// 当前使用的简历
const activeResume = computed(() => {
  return resumeList.value.find(item => item.isActive)
})

/**
 * 加载简历列表
 */
async function loadResumeList() {
  loading.value = true
  try {
    const res = await getResumeList() as any
    resumeList.value = res.data || []
  } catch (error) {
    console.error('加载简历列表失败:', error)
    ElMessage.error('加载简历列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '-'
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
function formatTime(dateStr: string): string {
  return formatBeijingTime(dateStr, 'YYYY-MM-DD HH:mm')
}

/**
 * 解码文件名
 * 处理可能被 URL 编码的中文文件名
 * 需求: 12.1, 12.2
 */
function decodeFilename(filename: string): string {
  if (!filename) return '-'
  try {
    // 尝试解码 URL 编码的文件名
    return decodeURIComponent(filename)
  } catch {
    // 如果解码失败，返回原始文件名
    return filename
  }
}

/**
 * 上传前校验
 */
function beforeUpload(rawFile: UploadRawFile): boolean {
  // 检查文件类型
  if (rawFile.type !== 'application/pdf') {
    ElMessage.error('仅支持 PDF 格式的简历文件')
    return false
  }
  
  // 检查文件大小（最大 10MB）
  const maxSize = 10 * 1024 * 1024
  if (rawFile.size > maxSize) {
    ElMessage.error('文件大小不能超过 10MB')
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
    const res = await uploadResume(options.file) as any
    ElMessage.success(`简历上传成功，版本号: ${res.version}`)
    await loadResumeList()
  } catch (error: any) {
    console.error('上传简历失败:', error)
    ElMessage.error(error.message || '上传简历失败')
  } finally {
    uploading.value = false
  }
}

/**
 * 设置当前简历
 */
async function handleSetActive(row: ResumeVersion) {
  if (row.isActive) return
  
  try {
    await ElMessageBox.confirm(
      `确定要将版本 ${row.version} 设置为当前使用的简历吗？`,
      '设置当前简历',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    await setActiveResume(row.version)
    ElMessage.success('设置成功')
    await loadResumeList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('设置当前简历失败:', error)
      ElMessage.error('设置失败')
    }
  }
}

/**
 * 下载简历
 * 需求: 13.1 - 下载当前设置为"使用中"的简历版本
 */
async function handleDownload(row: ResumeVersion) {
  try {
    const response = await downloadResume(row.version) as any
    
    // 创建下载链接
    const blob = new Blob([response], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // 使用解码后的文件名
    link.download = decodeFilename(row.filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    // 刷新列表以更新下载次数
    await loadResumeList()
  } catch (error) {
    console.error('下载简历失败:', error)
    ElMessage.error('下载失败')
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadResumeList()
})
</script>

<template>
  <div class="resume-manager">
    <!-- 统计信息 -->
    <div class="stats-row">
      <div class="stat-card">
        <el-icon class="stat-icon" :size="32" color="#409EFF">
          <Document />
        </el-icon>
        <div class="stat-content">
          <div class="stat-value">{{ resumeList.length }}</div>
          <div class="stat-label">简历版本数</div>
        </div>
      </div>
      
      <div class="stat-card">
        <el-icon class="stat-icon" :size="32" color="#67C23A">
          <DataAnalysis />
        </el-icon>
        <div class="stat-content">
          <div class="stat-value">{{ totalDownloads }}</div>
          <div class="stat-label">总下载次数</div>
        </div>
      </div>
      
      <div class="stat-card current-resume">
        <el-icon class="stat-icon" :size="32" color="#E6A23C">
          <Check />
        </el-icon>
        <div class="stat-content">
          <div class="stat-value">
            {{ activeResume ? `v${activeResume.version}` : '未设置' }}
          </div>
          <div class="stat-label">当前使用版本</div>
        </div>
      </div>
    </div>
    
    <!-- 上传区域 -->
    <div class="upload-section">
      <el-upload
        class="resume-upload"
        :show-file-list="false"
        :before-upload="beforeUpload"
        :http-request="handleUpload"
        accept=".pdf"
        :disabled="uploading"
      >
        <el-button type="primary" :loading="uploading">
          <el-icon v-if="!uploading"><Upload /></el-icon>
          {{ uploading ? '上传中...' : '上传新简历' }}
        </el-button>
      </el-upload>
      <span class="upload-tip">仅支持 PDF 格式，最多保留 5 个版本</span>
    </div>
    
    <!-- 简历列表 -->
    <el-table
      :data="resumeList"
      v-loading="loading"
      stripe
      style="width: 100%"
    >
      <el-table-column label="版本" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.isActive" type="success" effect="dark">
            v{{ row.version }}
          </el-tag>
          <span v-else>v{{ row.version }}</span>
        </template>
      </el-table-column>
      
      <el-table-column label="文件名" prop="filename" min-width="200">
        <template #default="{ row }">
          <div class="filename-cell">
            <el-icon color="#F56C6C"><Document /></el-icon>
            <span>{{ decodeFilename(row.filename) }}</span>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="文件大小" width="120" align="center">
        <template #default="{ row }">
          {{ formatSize(row.fileSize) }}
        </template>
      </el-table-column>
      
      <el-table-column label="下载次数" width="100" align="center">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ row.downloadCount }}</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="上传时间" width="180" align="center">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="!row.isActive"
            type="primary"
            link
            size="small"
            @click="handleSetActive(row)"
          >
            设为当前
          </el-button>
          <el-tag v-else type="success" size="small" effect="plain">
            当前使用
          </el-tag>
          
          <el-button
            type="primary"
            link
            size="small"
            @click="handleDownload(row)"
          >
            <el-icon><Download /></el-icon>
            下载
          </el-button>
        </template>
      </el-table-column>
      
      <!-- 空状态 -->
      <template #empty>
        <el-empty description="暂无简历，请上传" />
      </template>
    </el-table>
  </div>
</template>

<style lang="scss" scoped>
.resume-manager {
  padding: 0;
}

.stats-row {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  
  &.current-resume {
    background: linear-gradient(135deg, var(--el-color-warning-light-9) 0%, var(--el-color-warning-light-8) 100%);
    border-color: var(--el-color-warning-light-5);
  }
}

.stat-icon {
  flex-shrink: 0;
}

.stat-content {
  .stat-value {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.2;
  }
  
  .stat-label {
    font-size: 14px;
    color: var(--text-secondary);
    margin-top: 4px;
  }
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

.filename-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
