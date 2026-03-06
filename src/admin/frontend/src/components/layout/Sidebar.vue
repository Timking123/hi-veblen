<script setup lang="ts">
/**
 * 侧边栏导航组件
 * 包含六大功能板块入口
 * 支持折叠/展开
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DataLine,
  Document,
  ChatDotRound,
  Folder,
  Trophy,
  Search
} from '@element-plus/icons-vue'

// Props
interface Props {
  collapsed: boolean
}

const props = defineProps<Props>()

const route = useRoute()
const router = useRouter()

// 菜单项配置
const menuItems = [
  {
    path: '/dashboard',
    title: '数据看板',
    icon: DataLine
  },
  {
    path: '/content',
    title: '内容管理',
    icon: Document
  },
  {
    path: '/message',
    title: '留言管理',
    icon: ChatDotRound
  },
  {
    path: '/file',
    title: '文件管理',
    icon: Folder
  },
  {
    path: '/game',
    title: '游戏管理',
    icon: Trophy
  },
  {
    path: '/seo',
    title: 'SEO管理',
    icon: Search
  }
]

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 导航到指定路由
const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="sidebar-container">
    <!-- Logo 区域 -->
    <div class="sidebar-logo">
      <span v-if="!props.collapsed" class="logo-text">后台管理</span>
      <span v-else class="logo-icon">管</span>
    </div>
    
    <!-- 菜单列表 -->
    <el-menu
      :default-active="activeMenu"
      :collapse="props.collapsed"
      :collapse-transition="false"
      class="sidebar-menu"
    >
      <el-menu-item
        v-for="item in menuItems"
        :key="item.path"
        :index="item.path"
        @click="navigateTo(item.path)"
      >
        <el-icon>
          <component :is="item.icon" />
        </el-icon>
        <template #title>{{ item.title }}</template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<style lang="scss" scoped>
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sidebar-hover-bg);
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  
  .logo-text {
    letter-spacing: 2px;
  }
  
  .logo-icon {
    font-size: 24px;
  }
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
  
  &:not(.el-menu--collapse) {
    width: var(--sidebar-width);
  }
}

/* Element Plus 菜单样式覆盖 */
:deep(.el-menu) {
  background-color: var(--sidebar-bg) !important;
}

:deep(.el-menu-item) {
  color: var(--sidebar-text) !important;
  
  &:hover {
    background-color: var(--sidebar-hover-bg) !important;
  }
  
  &.is-active {
    background-color: var(--sidebar-active-bg) !important;
    color: var(--sidebar-active-text) !important;
  }
}

:deep(.el-menu--collapse) {
  .el-menu-item {
    padding: 0 20px !important;
    
    .el-icon {
      margin-right: 0;
    }
  }
}
</style>
