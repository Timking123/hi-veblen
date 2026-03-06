<script setup lang="ts">
/**
 * 文件管理页面
 * 使用 Tab 组织简历、图片、音频、文件浏览器
 * 
 * 需求: 5.1.1-5.4.4
 */
import { ref, reactive, onMounted } from 'vue'
import {
  ElTabs,
  ElTabPane,
  ElMessage,
  ElMessageBox,
  ElButton,
  ElIcon,
  ElInput,
  ElDialog
} from 'element-plus'
import {
  Document,
  Picture,
  Headset,
  FolderOpened,
  Refresh,
  Upload
} from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import type { TabPaneName } from 'element-plus'
import {
  ResumeManager,
  ImageManager,
  AudioManager,
  FileTree,
  FileUploader
} from '@/components/file'
import {
  getDirectoryTree,
  downloadFile,
  deleteFile,
  renameFile
} from '@/api/file'

// 当前激活的标签页
const activeTab = ref('resume')

// ========== 文件浏览器状态 ==========

// 文件树数据
const fileTree = ref<FileInfo[]>([])
const fileTreeLoading = ref(false)

// 当前选中的节点
const selectedNode = ref<FileInfo | null>(null)

// 重命名对话框
const renameDialogVisible = ref(false)
const renameForm = reactive({
  oldPath: '',
  newName: ''
})
const renameLoading = ref(false)

// 上传对话框
const uploadDialogVisible = ref(false)
const uploadTargetPath = ref('')

/**
 * 加载文件树
 */
async function loadFileTree() {
  fileTreeLoading.value = true
  try {
    const res = await getDirectoryTree() as any
    fileTree.value = res.tree || []
  } catch (error) {
    console.error('加载文件树失败:', error)
    ElMessage.error('加载文件列表失败')
  } finally {
    fileTreeLoading.value = false
  }
}

/**
 * 处理节点选中
 */
function handleNodeSelect(node: FileInfo) {
  selectedNode.value = node
}

/**
 * 处理文件下载
 */
async function handleDownload(node: FileInfo) {
  try {
    const response = await downloadFile(node.path) as any
    
    // 创建下载链接
    const blob = new Blob([response])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = node.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载文件失败:', error)
    ElMessage.error('下载失败')
  }
}

/**
 * 处理文件删除
 */
async function handleDelete(node: FileInfo) {
  const typeText = node.type === 'directory' ? '目录' : '文件'
  
  try {
    await ElMessageBox.confirm(
      `确定要删除${typeText} "${node.name}" 吗？${node.type === 'directory' ? '目录下的所有文件也将被删除。' : ''}此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteFile(node.path)
    ElMessage.success('删除成功')
    
    // 清除选中状态
    if (selectedNode.value?.path === node.path) {
      selectedNode.value = null
    }
    
    // 刷新文件树
    await loadFileTree()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 打开重命名对话框
 */
function handleRename(node: FileInfo) {
  renameForm.oldPath = node.path
  renameForm.newName = node.name
  renameDialogVisible.value = true
}

/**
 * 确认重命名
 */
async function confirmRename() {
  if (!renameForm.newName.trim()) {
    ElMessage.warning('请输入新名称')
    return
  }
  
  // 构建新路径
  const pathParts = renameForm.oldPath.split('/')
  pathParts[pathParts.length - 1] = renameForm.newName.trim()
  const newPath = pathParts.join('/')
  
  if (newPath === renameForm.oldPath) {
    renameDialogVisible.value = false
    return
  }
  
  renameLoading.value = true
  try {
    await renameFile(renameForm.oldPath, newPath)
    ElMessage.success('重命名成功')
    renameDialogVisible.value = false
    
    // 刷新文件树
    await loadFileTree()
  } catch (error: any) {
    console.error('重命名失败:', error)
    ElMessage.error(error.message || '重命名失败')
  } finally {
    renameLoading.value = false
  }
}

/**
 * 打开上传对话框
 */
function handleUpload(node: FileInfo) {
  uploadTargetPath.value = node.type === 'directory' ? node.path : ''
  uploadDialogVisible.value = true
}

/**
 * 处理上传成功
 */
function handleUploadSuccess() {
  ElMessage.success('文件上传成功')
  loadFileTree()
}

/**
 * 处理上传失败
 */
function handleUploadError(_file: any, error: Error) {
  console.error('上传失败:', error)
  ElMessage.error('文件上传失败')
}

/**
 * 处理标签页切换
 */
function handleTabChange(tab: TabPaneName) {
  if (tab === 'browser') {
    loadFileTree()
  }
}

// 组件挂载时加载数据
onMounted(() => {
  // 默认不加载文件树，等用户切换到文件浏览器标签页时再加载
})
</script>

<template>
  <div class="file-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>文件管理</h2>
      <p class="page-desc">管理网站的所有文件资源</p>
    </div>
    
    <!-- 标签页 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 简历管理 -->
      <el-tab-pane name="resume">
        <template #label>
          <span class="tab-label">
            <el-icon><Document /></el-icon>
            简历管理
          </span>
        </template>
        <ResumeManager />
      </el-tab-pane>
      
      <!-- 图片管理 -->
      <el-tab-pane name="image">
        <template #label>
          <span class="tab-label">
            <el-icon><Picture /></el-icon>
            图片管理
          </span>
        </template>
        <ImageManager />
      </el-tab-pane>
      
      <!-- 音频管理 -->
      <el-tab-pane name="audio">
        <template #label>
          <span class="tab-label">
            <el-icon><Headset /></el-icon>
            音频管理
          </span>
        </template>
        <AudioManager />
      </el-tab-pane>
      
      <!-- 文件浏览器 -->
      <el-tab-pane name="browser">
        <template #label>
          <span class="tab-label">
            <el-icon><FolderOpened /></el-icon>
            文件浏览器
          </span>
        </template>
        
        <div class="browser-container">
          <!-- 工具栏 -->
          <div class="browser-toolbar">
            <el-button
              type="primary"
              @click="uploadDialogVisible = true; uploadTargetPath = ''"
            >
              <el-icon><Upload /></el-icon>
              上传文件
            </el-button>
            <el-button @click="loadFileTree">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
          
          <!-- 文件树 -->
          <div class="browser-content">
            <FileTree
              :data="fileTree"
              :loading="fileTreeLoading"
              :selected-path="selectedNode?.path"
              @select="handleNodeSelect"
              @download="handleDownload"
              @delete="handleDelete"
              @rename="handleRename"
              @upload="handleUpload"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 重命名对话框 -->
    <el-dialog
      v-model="renameDialogVisible"
      title="重命名"
      width="400px"
    >
      <el-input
        v-model="renameForm.newName"
        placeholder="请输入新名称"
        @keyup.enter="confirmRename"
      />
      <template #footer>
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="renameLoading"
          @click="confirmRename"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 上传对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传文件"
      width="500px"
    >
      <FileUploader
        :target-path="uploadTargetPath"
        @success="handleUploadSuccess"
        @error="handleUploadError"
      />
      <template #footer>
        <el-button @click="uploadDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.file-container {
  padding: 20px;
  background-color: var(--bg-color-page);
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 20px;
  
  h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .page-desc {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.browser-container {
  min-height: 400px;
}

.browser-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--bg-color-page);
  border-radius: 8px;
}

.browser-content {
  padding: 16px;
  background: var(--bg-color);
  border: 1px solid var(--border-color-lighter);
  border-radius: 8px;
}
</style>
