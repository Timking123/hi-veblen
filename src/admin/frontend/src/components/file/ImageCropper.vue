<script setup lang="ts">
/**
 * 图片裁剪组件
 * 支持头像裁剪（1:1 比例）
 * 
 * 需求: 5.2.2 - 提供头像裁剪功能（1:1 比例）
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  ElDialog,
  ElButton,
  ElSlider,
  ElIcon,
  ElMessage
} from 'element-plus'
import { ZoomIn, ZoomOut, RefreshLeft, Check, Close } from '@element-plus/icons-vue'

// 定义 Props
interface Props {
  /** 是否显示对话框 */
  visible: boolean
  /** 图片源（File 对象或 URL） */
  imageSource?: File | string
  /** 裁剪比例（默认 1:1） */
  aspectRatio?: number
  /** 输出尺寸 */
  outputSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  aspectRatio: 1,
  outputSize: 256
})

// 定义 Emits
const emit = defineEmits<{
  /** 更新显示状态 */
  (e: 'update:visible', value: boolean): void
  /** 裁剪完成 */
  (e: 'crop', data: { file: File; cropOptions: CropOptions }): void
  /** 取消裁剪 */
  (e: 'cancel'): void
}>()

// 裁剪参数接口
interface CropOptions {
  x: number
  y: number
  width: number
  height: number
}

// Canvas 引用
const canvasRef = ref<HTMLCanvasElement>()
const previewRef = ref<HTMLCanvasElement>()

// 图片对象
const image = ref<HTMLImageElement | null>(null)

// 裁剪状态
const scale = ref(1)
const rotation = ref(0)
const offsetX = ref(0)
const offsetY = ref(0)

// 拖拽状态
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartOffsetX = ref(0)
const dragStartOffsetY = ref(0)

// 裁剪框尺寸
const cropSize = ref(200)

// 计算裁剪框位置（居中）
const cropBoxStyle = computed(() => {
  const size = cropSize.value
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `calc(50% - ${size / 2}px)`,
    top: `calc(50% - ${size / 2}px)`
  }
})

/**
 * 加载图片
 */
async function loadImage() {
  if (!props.imageSource) return
  
  const img = new Image()
  
  if (props.imageSource instanceof File) {
    img.src = URL.createObjectURL(props.imageSource)
  } else {
    img.src = props.imageSource
  }
  
  img.onload = () => {
    image.value = img
    
    // 计算初始缩放，使图片适应裁剪区域
    const containerSize = 400
    const minDimension = Math.min(img.width, img.height)
    scale.value = containerSize / minDimension
    
    // 重置偏移
    offsetX.value = 0
    offsetY.value = 0
    rotation.value = 0
    
    drawCanvas()
  }
  
  img.onerror = () => {
    ElMessage.error('图片加载失败')
  }
}

/**
 * 绘制画布
 */
function drawCanvas() {
  const canvas = canvasRef.value
  const preview = previewRef.value
  if (!canvas || !preview || !image.value) return
  
  const ctx = canvas.getContext('2d')
  const previewCtx = preview.getContext('2d')
  if (!ctx || !previewCtx) return
  
  const img = image.value
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 保存状态
  ctx.save()
  
  // 移动到画布中心
  ctx.translate(canvas.width / 2, canvas.height / 2)
  
  // 应用旋转
  ctx.rotate((rotation.value * Math.PI) / 180)
  
  // 应用缩放和偏移
  const drawWidth = img.width * scale.value
  const drawHeight = img.height * scale.value
  
  ctx.drawImage(
    img,
    -drawWidth / 2 + offsetX.value,
    -drawHeight / 2 + offsetY.value,
    drawWidth,
    drawHeight
  )
  
  // 恢复状态
  ctx.restore()
  
  // 绘制预览
  drawPreview(previewCtx)
}

/**
 * 绘制预览
 */
function drawPreview(ctx: CanvasRenderingContext2D) {
  const canvas = canvasRef.value
  const preview = previewRef.value
  if (!canvas || !preview) return
  
  // 计算裁剪区域在画布上的位置
  const canvasRect = canvas.getBoundingClientRect()
  const cropX = (canvasRect.width - cropSize.value) / 2
  const cropY = (canvasRect.height - cropSize.value) / 2
  
  // 清空预览画布
  ctx.clearRect(0, 0, preview.width, preview.height)
  
  // 从主画布复制裁剪区域到预览
  ctx.drawImage(
    canvas,
    cropX,
    cropY,
    cropSize.value,
    cropSize.value,
    0,
    0,
    preview.width,
    preview.height
  )
}

/**
 * 处理缩放
 */
function handleZoom(delta: number) {
  const newScale = scale.value + delta
  if (newScale >= 0.1 && newScale <= 5) {
    scale.value = newScale
    drawCanvas()
  }
}

/**
 * 处理旋转
 */
function handleRotate() {
  rotation.value = (rotation.value + 90) % 360
  drawCanvas()
}

/**
 * 处理鼠标按下
 */
function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  dragStartOffsetX.value = offsetX.value
  dragStartOffsetY.value = offsetY.value
}

/**
 * 处理鼠标移动
 */
function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  
  const deltaX = e.clientX - dragStartX.value
  const deltaY = e.clientY - dragStartY.value
  
  offsetX.value = dragStartOffsetX.value + deltaX
  offsetY.value = dragStartOffsetY.value + deltaY
  
  drawCanvas()
}

/**
 * 处理鼠标释放
 */
function handleMouseUp() {
  isDragging.value = false
}

/**
 * 处理滚轮缩放
 */
function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  handleZoom(delta)
}

/**
 * 确认裁剪
 */
async function handleConfirm() {
  const canvas = canvasRef.value
  if (!canvas || !image.value || !props.imageSource) return
  
  // 创建输出画布
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = props.outputSize
  outputCanvas.height = props.outputSize
  const outputCtx = outputCanvas.getContext('2d')
  if (!outputCtx) return
  
  // 计算裁剪区域
  const canvasRect = canvas.getBoundingClientRect()
  const cropX = (canvasRect.width - cropSize.value) / 2
  const cropY = (canvasRect.height - cropSize.value) / 2
  
  // 从主画布复制裁剪区域
  outputCtx.drawImage(
    canvas,
    cropX,
    cropY,
    cropSize.value,
    cropSize.value,
    0,
    0,
    props.outputSize,
    props.outputSize
  )
  
  // 转换为 Blob
  outputCanvas.toBlob((blob) => {
    if (!blob) {
      ElMessage.error('裁剪失败')
      return
    }
    
    // 创建 File 对象
    const fileName = props.imageSource instanceof File 
      ? props.imageSource.name 
      : 'cropped-image.png'
    const file = new File([blob], fileName, { type: 'image/png' })
    
    // 计算原始图片上的裁剪坐标
    const img = image.value!
    const scaleRatio = 1 / scale.value
    const centerX = img.width / 2
    const centerY = img.height / 2
    
    const cropOptions: CropOptions = {
      x: Math.max(0, (centerX - offsetX.value * scaleRatio) - (cropSize.value * scaleRatio / 2)),
      y: Math.max(0, (centerY - offsetY.value * scaleRatio) - (cropSize.value * scaleRatio / 2)),
      width: cropSize.value * scaleRatio,
      height: cropSize.value * scaleRatio
    }
    
    emit('crop', { file, cropOptions })
    emit('update:visible', false)
  }, 'image/png')
}

/**
 * 取消裁剪
 */
function handleCancel() {
  emit('cancel')
  emit('update:visible', false)
}

// 监听图片源变化
watch(() => props.imageSource, () => {
  if (props.visible && props.imageSource) {
    loadImage()
  }
})

// 监听显示状态
watch(() => props.visible, (visible) => {
  if (visible && props.imageSource) {
    loadImage()
  }
})

// 组件挂载
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

// 组件卸载
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  
  // 清理图片 URL
  if (image.value && props.imageSource instanceof File) {
    URL.revokeObjectURL(image.value.src)
  }
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="裁剪图片"
    width="600px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="cropper-container">
      <!-- 裁剪区域 -->
      <div class="crop-area">
        <canvas
          ref="canvasRef"
          width="400"
          height="400"
          class="crop-canvas"
          :class="{ dragging: isDragging }"
          @mousedown="handleMouseDown"
          @wheel="handleWheel"
        />
        
        <!-- 裁剪框 -->
        <div class="crop-box" :style="cropBoxStyle">
          <div class="crop-border"></div>
        </div>
        
        <!-- 遮罩 -->
        <div class="crop-mask"></div>
      </div>
      
      <!-- 预览 -->
      <div class="preview-area">
        <p class="preview-label">预览</p>
        <canvas
          ref="previewRef"
          :width="outputSize"
          :height="outputSize"
          class="preview-canvas"
        />
      </div>
    </div>
    
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="zoom-controls">
        <el-button circle size="small" @click="handleZoom(-0.1)">
          <el-icon><ZoomOut /></el-icon>
        </el-button>
        <el-slider
          v-model="scale"
          :min="0.1"
          :max="5"
          :step="0.1"
          :show-tooltip="false"
          style="width: 150px"
          @input="drawCanvas"
        />
        <el-button circle size="small" @click="handleZoom(0.1)">
          <el-icon><ZoomIn /></el-icon>
        </el-button>
      </div>
      
      <el-button circle size="small" @click="handleRotate">
        <el-icon><RefreshLeft /></el-icon>
      </el-button>
    </div>
    
    <template #footer>
      <el-button @click="handleCancel">
        <el-icon><Close /></el-icon>
        取消
      </el-button>
      <el-button type="primary" @click="handleConfirm">
        <el-icon><Check /></el-icon>
        确认裁剪
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.cropper-container {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.crop-area {
  position: relative;
  width: 400px;
  height: 400px;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

.crop-canvas {
  position: relative;
  z-index: 1;
  cursor: grab;
  
  &.dragging {
    cursor: grabbing;
  }
}

.crop-box {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  
  .crop-border {
    width: 100%;
    height: 100%;
    border: 2px dashed #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  }
}

.crop-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;
}

.preview-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview-label {
  margin: 0;
  font-size: 14px;
  color: #606266;
}

.preview-canvas {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 2px solid #DCDFE6;
  background: #F5F7FA;
}

.toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #EBEEF5;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
