<script setup lang="ts">
/**
 * 图片管理组件
 * 支持图片分类浏览和上传
 * 
 * 需求: 5.2.2 - 提供头像裁剪功能（1:1 比例）
 * 需求: 5.2.4 - 按分类组织图片（头像、项目截图、其他）
 */
import { ref, computed, onMounted } from 'vue'
import {
  ElTabs,
  ElTabPane,
  ElButton,
  ElUpload,
  ElImage,
  ElEmpty,
  ElMessage,
  ElMessageBox,
  ElIcon,
  ElCard
} from 'element-plus'
import { Upload, Delete, ZoomIn, Picture } from '@element-plus/icons-vue'
import type { UploadRawFile } from 'element-plus'
import type { FileInfo } from '@/types'
import { getDirectoryTree, uploadImage, uploadAvatar, deleteFile, type ImageCategory } from '@/api/file'
import ImageCropper from './ImageCropper.vue'

// 当前选中的分类
const activeCategory = ref<ImageCategory>('avatar')

// 图片列表（按分类）
const imagesByCategory = ref<Record<ImageCategory, FileInfo[]>>({
  avatar: [],
  screenshot: [],
  other: []
})

// 加载状态
const loading = ref(false)
const uploading = ref(false)

// 裁剪器状态
const cropperVisible = ref(false)
const cropperImage = ref<File | null>(null)

// 预览状态
const previewVisible = ref(false)
const previewUrl = ref('')

// 分类配置
const categories: { value: ImageCategory; label: string; tip: string }[] = [
  { value: 'avatar', label: '头像', tip: '支持 JPG/PNG/WebP，将自动裁剪为 1:1 比例' },
  { value: 'screenshot', label: '项目截图', tip: '支持 JPG/PNG/WebP，自动压缩至最大宽度 1920px' },
  { value: 'other', label: '其他图片', tip: '支持 JPG/PNG/WebP，自动压缩至最大宽度 1920px' }
]

// 当前分类的图片列表
const currentImages = computed(() => {
  return imagesByCategory.value[activeCategory.value] || []
})

// 当前分类配置
const currentCategory = computed(() => {
  return categories.find(c => c.value === activeCategory.value)
})

/**
 * 加载图片列表
 */
async function loadImages() {
  loading.value = true
  try {
    const res = await getDirectoryTree('images') as any
    const tree = res.tree || []
    
    // 解析目录树，按分类整理图片
    const newImages: Record<ImageCategory, FileInfo[]> = {
      avatar: [],
      screenshot: [],
      other: []
    }
    
    for (const node of tree) {
      if (node.type === 'directory') {
        const category = node.name as ImageCategory
        if (category in newImages && node.children) {
          // 过滤出图片文件（排除 thumbnails 目录）
          newImages[category] = node.children.filter((child: FileInfo) => 
            child.type === 'file' && 
            !child.path.includes('thumbnails')
          )
        }
      }
    }
    
    imagesByCategory.value = newImages
  } catch (error) {
    console.error('加载图片列表失败:', error)
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
 * 获取图片 URL
 * 使用公共路由，无需认证（用于 <img> 元素直接访问）
 */
function getImageUrl(path: string): string {
  // path 格式为 "images/avatar/photo.jpg"，需要提取 "images/" 后面的部分
  const imagePath = path.replace(/^images\//, '')
  return `/api/files/public/image/${imagePath}`
}

/**
 * 上传前校验
 */
function beforeUpload(rawFile: UploadRawFile): boolean {
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(rawFile.type)) {
    ElMessage.error('仅支持 JPG/PNG/WebP 格式的图片')
    return false
  }
  
  // 检查文件大小（最大 10MB）
  const maxSize = 10 * 1024 * 1024
  if (rawFile.size > maxSize) {
    ElMessage.error('图片大小不能超过 10MB')
    return false
  }
  
  // 如果是头像，打开裁剪器
  if (activeCategory.value === 'avatar') {
    cropperImage.value = rawFile
    cropperVisible.value = true
    return false // 阻止默认上传
  }
  
  return true
}

/**
 * 处理普通图片上传
 */
async function handleUpload(options: { file: File }) {
  uploading.value = true
  try {
    await uploadImage(options.file, activeCategory.value)
    ElMessage.success('图片上传成功')
    await loadImages()
  } catch (error: any) {
    console.error('上传图片失败:', error)
    ElMessage.error(error.message || '上传图片失败')
  } finally {
    uploading.value = false
  }
}

/**
 * 处理头像裁剪完成
 */
async function handleCropComplete(data: { file: File; cropOptions: any }) {
  uploading.value = true
  try {
    await uploadAvatar(data.file, data.cropOptions)
    ElMessage.success('头像上传成功')
    await loadImages()
  } catch (error: any) {
    console.error('上传头像失败:', error)
    ElMessage.error(error.message || '上传头像失败')
  } finally {
    uploading.value = false
    cropperVisible.value = false
    cropperImage.value = null
  }
}

/**
 * 预览图片
 */
function handlePreview(image: FileInfo) {
  previewUrl.value = getImageUrl(image.path)
  previewVisible.value = true
}

/**
 * 删除图片
 */
async function handleDelete(image: FileInfo) {
  try {
    await ElMessageBox.confirm(
      `确定要删除图片 "${image.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteFile(image.path)
    ElMessage.success('删除成功')
    await loadImages()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除图片失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadImages()
})
</script>

<template>
  <div class="image-manager">
    <!-- 分类标签页 -->
    <el-tabs v-model="activeCategory" @tab-change="loadImages">
      <el-tab-pane
        v-for="cat in categories"
        :key="cat.value"
        :label="cat.label"
        :name="cat.value"
      />
    </el-tabs>
    
    <!-- 上传区域 -->
    <div class="upload-section">
      <el-upload
        class="image-upload"
        :show-file-list="false"
        :before-upload="beforeUpload"
        :http-request="handleUpload"
        accept=".jpg,.jpeg,.png,.webp"
        :disabled="uploading"
      >
        <el-button type="primary" :loading="uploading">
          <el-icon v-if="!uploading"><Upload /></el-icon>
          {{ uploading ? '上传中...' : '上传图片' }}
        </el-button>
      </el-upload>
      <span class="upload-tip">{{ currentCategory?.tip }}</span>
    </div>
    
    <!-- 图片列表 -->
    <div v-loading="loading" class="image-grid">
      <template v-if="currentImages.length > 0">
        <el-card
          v-for="image in currentImages"
          :key="image.path"
          class="image-card"
          :body-style="{ padding: '0' }"
          shadow="hover"
        >
          <div class="image-wrapper">
            <el-image
              :src="getImageUrl(image.path)"
              fit="cover"
              class="image-preview"
              :preview-src-list="[]"
              @click="handlePreview(image)"
            >
              <template #error>
                <div class="image-error">
                  <el-icon :size="32"><Picture /></el-icon>
                </div>
              </template>
            </el-image>
            
            <!-- 操作遮罩 -->
            <div class="image-overlay">
              <el-button
                type="primary"
                circle
                size="small"
                @click="handlePreview(image)"
              >
                <el-icon><ZoomIn /></el-icon>
              </el-button>
              <el-button
                type="danger"
                circle
                size="small"
                @click="handleDelete(image)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          
          <div class="image-info">
            <div class="image-name" :title="image.name">{{ image.name }}</div>
            <div class="image-size">{{ formatSize(image.size) }}</div>
          </div>
        </el-card>
      </template>
      
      <!-- 空状态 -->
      <el-empty v-else description="暂无图片" />
    </div>
    
    <!-- 图片裁剪器 -->
    <ImageCropper
      v-model:visible="cropperVisible"
      :image-source="cropperImage || undefined"
      :aspect-ratio="1"
      :output-size="256"
      @crop="handleCropComplete"
      @cancel="cropperImage = null"
    />
    
    <!-- 图片预览 -->
    <el-image
      v-show="false"
      :src="previewUrl"
      :preview-src-list="[previewUrl]"
      :initial-index="0"
      ref="previewImageRef"
    />
    <teleport to="body">
      <div
        v-if="previewVisible"
        class="image-preview-mask"
        @click="previewVisible = false"
      >
        <img :src="previewUrl" class="preview-image" @click.stop />
        <el-button
          class="close-btn"
          type="info"
          circle
          @click="previewVisible = false"
        >
          ✕
        </el-button>
      </div>
    </teleport>
  </div>
</template>

<style lang="scss" scoped>
.image-manager {
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

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.image-card {
  border-radius: 8px;
  overflow: hidden;
}

.image-wrapper {
  position: relative;
  width: 100%;
  padding-top: 100%; // 1:1 比例
  background: var(--bg-color-page);
}

.image-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-placeholder);
  background: var(--bg-color-page);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.2s;
  
  .image-wrapper:hover & {
    opacity: 1;
  }
}

.image-info {
  padding: 12px;
}

.image-name {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-size {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.image-preview-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
}

.preview-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
}
</style>
