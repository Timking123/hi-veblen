<script setup lang="ts">
/**
 * 文件树组件
 * 以树形结构展示文件目录
 * 
 * 需求: 5.4.1 - 以树形结构展示文件目录
 * 需求: 5.4.4 - 显示文件大小和修改时间
 */
import { ref, computed, watch } from 'vue'
import { ElTree, ElIcon, ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus'
import {
  Folder,
  Document,
  FolderOpened,
  Download,
  Delete,
  Edit,
  MoreFilled
} from '@element-plus/icons-vue'
import type { FileInfo } from '@/types'
import { formatBeijingTime } from '@/utils/time'

// 定义 Props
interface Props {
  /** 文件树数据 */
  data: FileInfo[]
  /** 是否加载中 */
  loading?: boolean
  /** 当前选中的节点路径 */
  selectedPath?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  selectedPath: ''
})

// 定义 Emits
const emit = defineEmits<{
  /** 选中节点 */
  (e: 'select', node: FileInfo): void
  /** 下载文件 */
  (e: 'download', node: FileInfo): void
  /** 删除文件/目录 */
  (e: 'delete', node: FileInfo): void
  /** 重命名文件/目录 */
  (e: 'rename', node: FileInfo): void
  /** 上传到目录 */
  (e: 'upload', node: FileInfo): void
  /** 打开/预览文件 - 需求 11.1 */
  (e: 'open', node: FileInfo): void
  /** 定位到文件 - 需求 11.2 */
  (e: 'locate', node: FileInfo): void
}>()

// 树组件引用
const treeRef = ref<InstanceType<typeof ElTree>>()

// 展开的节点
const expandedKeys = ref<string[]>([])

// 树节点配置
const treeProps = {
  children: 'children',
  label: 'name',
  isLeaf: (data: FileInfo) => data.type === 'file'
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
 * 格式化修改时间
 * 使用北京时间格式化 - 需求 14.1
 */
function formatTime(dateStr?: string): string {
  if (!dateStr) return '-'
  return formatBeijingTime(dateStr, 'YYYY-MM-DD HH:mm')
}

/**
 * 获取文件图标
 */
function getFileIcon(node: FileInfo) {
  if (node.type === 'directory') {
    return expandedKeys.value.includes(node.path) ? FolderOpened : Folder
  }
  return Document
}

/**
 * 获取文件图标颜色
 */
function getIconColor(node: FileInfo): string {
  if (node.type === 'directory') {
    return '#E6A23C'
  }
  
  // 根据扩展名返回不同颜色
  const ext = node.name.split('.').pop()?.toLowerCase()
  const colorMap: Record<string, string> = {
    pdf: '#F56C6C',
    doc: '#409EFF',
    docx: '#409EFF',
    xls: '#67C23A',
    xlsx: '#67C23A',
    jpg: '#E6A23C',
    jpeg: '#E6A23C',
    png: '#E6A23C',
    gif: '#E6A23C',
    webp: '#E6A23C',
    mp3: '#909399',
    ogg: '#909399',
    mp4: '#909399',
    ts: '#3178C6',
    js: '#F7DF1E',
    vue: '#42B883',
    json: '#909399',
    md: '#083FA1'
  }
  
  return colorMap[ext || ''] || '#909399'
}

/**
 * 处理节点点击
 */
function handleNodeClick(data: FileInfo) {
  emit('select', data)
}

/**
 * 处理节点展开
 */
function handleNodeExpand(data: FileInfo) {
  if (!expandedKeys.value.includes(data.path)) {
    expandedKeys.value.push(data.path)
  }
}

/**
 * 处理节点收起
 */
function handleNodeCollapse(data: FileInfo) {
  const index = expandedKeys.value.indexOf(data.path)
  if (index > -1) {
    expandedKeys.value.splice(index, 1)
  }
}

/**
 * 处理下载
 */
function handleDownload(node: FileInfo) {
  emit('download', node)
}

/**
 * 处理删除
 */
function handleDelete(node: FileInfo) {
  emit('delete', node)
}

/**
 * 处理重命名
 */
function handleRename(node: FileInfo) {
  emit('rename', node)
}

/**
 * 处理上传到目录
 */
function handleUpload(node: FileInfo) {
  emit('upload', node)
}

/**
 * 处理打开/预览文件 - 需求 11.1
 */
function handleOpen(node: FileInfo) {
  emit('open', node)
}

/**
 * 处理定位到文件 - 需求 11.2
 */
function handleLocate(node: FileInfo) {
  emit('locate', node)
}

/**
 * 判断文件是否可预览
 */
function isPreviewable(node: FileInfo): boolean {
  if (node.type !== 'file') return false
  
  const ext = node.name.split('.').pop()?.toLowerCase()
  const previewableExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'md', 'json']
  return previewableExts.includes(ext || '')
}

// 监听数据变化，自动展开第一层
watch(() => props.data, (newData) => {
  if (newData.length > 0) {
    // 自动展开第一层目录
    newData.forEach(item => {
      if (item.type === 'directory' && !expandedKeys.value.includes(item.path)) {
        expandedKeys.value.push(item.path)
      }
    })
  }
}, { immediate: true })
</script>

<template>
  <div class="file-tree" v-loading="loading">
    <el-tree
      ref="treeRef"
      :data="data"
      :props="treeProps"
      :expand-on-click-node="false"
      :default-expanded-keys="expandedKeys"
      node-key="path"
      highlight-current
      @node-click="handleNodeClick"
      @node-expand="handleNodeExpand"
      @node-collapse="handleNodeCollapse"
    >
      <template #default="{ node, data: nodeData }">
        <div class="tree-node">
          <!-- 图标和名称 -->
          <div class="node-content">
            <el-icon 
              class="node-icon" 
              :style="{ color: getIconColor(nodeData) }"
            >
              <component :is="getFileIcon(nodeData)" />
            </el-icon>
            <span class="node-name">{{ nodeData.name }}</span>
          </div>
          
          <!-- 文件信息 -->
          <div class="node-info">
            <span v-if="nodeData.type === 'file'" class="node-size">
              {{ formatSize(nodeData.size) }}
            </span>
            <span class="node-time">
              {{ formatTime(nodeData.modifiedAt) }}
            </span>
          </div>
          
          <!-- 操作菜单 -->
          <div class="node-actions" @click.stop>
            <el-dropdown trigger="click" size="small">
              <el-icon class="action-trigger">
                <MoreFilled />
              </el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <!-- 目录操作 -->
                  <template v-if="nodeData.type === 'directory'">
                    <el-dropdown-item @click="handleUpload(nodeData)">
                      <el-icon><Document /></el-icon>
                      上传文件
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleLocate(nodeData)">
                      <el-icon><Folder /></el-icon>
                      在资源管理器中打开
                    </el-dropdown-item>
                  </template>
                  
                  <!-- 文件操作 -->
                  <template v-if="nodeData.type === 'file'">
                    <el-dropdown-item 
                      v-if="isPreviewable(nodeData)"
                      @click="handleOpen(nodeData)"
                    >
                      <el-icon><Document /></el-icon>
                      预览
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleDownload(nodeData)">
                      <el-icon><Download /></el-icon>
                      下载
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleLocate(nodeData)">
                      <el-icon><Folder /></el-icon>
                      定位文件
                    </el-dropdown-item>
                  </template>
                  
                  <!-- 通用操作 -->
                  <el-dropdown-item @click="handleRename(nodeData)">
                    <el-icon><Edit /></el-icon>
                    重命名
                  </el-dropdown-item>
                  <el-dropdown-item 
                    @click="handleDelete(nodeData)"
                    divided
                    style="color: #F56C6C"
                  >
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </template>
    </el-tree>
    
    <!-- 空状态 -->
    <div v-if="!loading && data.length === 0" class="empty-state">
      <el-icon :size="48" color="#C0C4CC"><Folder /></el-icon>
      <p>暂无文件</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.file-tree {
  min-height: 300px;
  
  :deep(.el-tree-node__content) {
    height: auto;
    padding: 8px 0;
  }
  
  :deep(.el-tree-node__expand-icon) {
    padding: 6px;
  }
}

.tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
  font-size: 14px;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.node-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.node-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--text-secondary);
  font-size: 12px;
  flex-shrink: 0;
  margin-right: 8px;
}

.node-size {
  min-width: 70px;
  text-align: right;
}

.node-time {
  min-width: 120px;
}

.node-actions {
  opacity: 0;
  transition: opacity 0.2s;
  
  .tree-node:hover & {
    opacity: 1;
  }
}

.action-trigger {
  padding: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  
  &:hover {
    color: var(--primary-color);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  
  p {
    margin-top: 16px;
    font-size: 14px;
  }
}
</style>
