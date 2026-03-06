/**
 * 路由配置
 * 定义所有页面路由和导航守卫
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/',
    component: () => import('@/components/layout/Layout.vue'),
    redirect: '/dashboard',
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: {
          title: '数据看板',
          icon: 'DataLine'
        }
      },
      {
        path: 'content',
        name: 'Content',
        component: () => import('@/views/Content.vue'),
        meta: {
          title: '内容管理',
          icon: 'Document'
        }
      },
      {
        path: 'message',
        name: 'Message',
        component: () => import('@/views/Message.vue'),
        meta: {
          title: '留言管理',
          icon: 'ChatDotRound'
        }
      },
      {
        path: 'file',
        name: 'File',
        component: () => import('@/views/File.vue'),
        meta: {
          title: '文件管理',
          icon: 'Folder'
        }
      },
      {
        path: 'game',
        name: 'Game',
        component: () => import('@/views/Game.vue'),
        meta: {
          title: '游戏管理',
          icon: 'GamePad'
        }
      },
      {
        path: 'seo',
        name: 'SEO',
        component: () => import('@/views/SEO.vue'),
        meta: {
          title: 'SEO管理',
          icon: 'Search'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面未找到',
      requiresAuth: false
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 检查登录状态
router.beforeEach((to, _from, next) => {
  // 设置页面标题
  const title = to.meta.title as string
  document.title = title ? `${title} - 后台管理系统` : '后台管理系统'
  
  // 检查是否需要认证
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)
  const token = localStorage.getItem('admin_token')
  
  if (requiresAuth && !token) {
    // 需要认证但未登录，跳转到登录页
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  } else if (to.path === '/login' && token) {
    // 已登录但访问登录页，跳转到首页
    next({ path: '/' })
  } else {
    next()
  }
})

export default router
