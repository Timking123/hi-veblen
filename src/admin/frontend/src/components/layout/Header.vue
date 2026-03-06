<script setup lang="ts">
/**
 * 顶部栏组件
 * 显示面包屑导航、主题切换、用户信息、退出按钮
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  Fold,
  Expand,
  User,
  SwitchButton
} from '@element-plus/icons-vue'
import ThemeSwitcher from '@/components/common/ThemeSwitcher.vue'

// Props
interface Props {
  collapsed: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'toggle-sidebar'): void
}>()

const route = useRoute()
const router = useRouter()

// 面包屑数据
const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta?.title)
  return matched.map(item => ({
    path: item.path,
    title: item.meta?.title as string
  }))
})

// 切换侧边栏
const toggleSidebar = () => {
  emit('toggle-sidebar')
}

// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 清除 Token
    localStorage.removeItem('admin_token')
    
    ElMessage.success('已退出登录')
    
    // 跳转到登录页
    router.push('/login')
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="header-container">
    <!-- 左侧：折叠按钮和面包屑 -->
    <div class="header-left">
      <el-icon 
        class="collapse-btn" 
        @click="toggleSidebar"
      >
        <Fold v-if="!props.collapsed" />
        <Expand v-else />
      </el-icon>
      
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item 
          v-for="item in breadcrumbs" 
          :key="item.path"
        >
          {{ item.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    
    <!-- 右侧：主题切换、用户信息和操作 -->
    <div class="header-right">
      <ThemeSwitcher />
      
      <el-dropdown trigger="click">
        <div class="user-info">
          <el-icon><User /></el-icon>
          <span class="username">管理员</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.header-container {
  height: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .collapse-btn {
    font-size: 20px;
    cursor: pointer;
    color: var(--header-text);
    transition: color 0.2s;
    
    &:hover {
      color: var(--primary-color);
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 4px;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: var(--table-row-hover-bg);
    }
    
    .username {
      font-size: 14px;
      color: var(--header-text);
    }
  }
}

/* 响应式适配 */
@media screen and (max-width: 767px) {
  .header-container {
    padding: 0 12px;
  }
  
  .header-left {
    .el-breadcrumb {
      display: none;
    }
  }
  
  .header-right {
    .username {
      display: none;
    }
  }
}
</style>
