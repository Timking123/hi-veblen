import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAppStore } from '@/stores/app'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
  },
  {
    path: '/education',
    name: 'Education',
    component: () => import('@/views/Education.vue'),
  },
  {
    path: '/experience',
    name: 'Experience',
    component: () => import('@/views/Experience.vue'),
  },
  {
    path: '/skills',
    name: 'Skills',
    component: () => import('@/views/Skills.vue'),
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/views/Projects.vue'),
    meta: {
      title: '项目展示',
    },
  },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('@/views/Contact.vue'),
  },
  {
    path: '/projects/:id',
    name: 'ProjectDetail',
    component: () => import('@/views/ProjectDetail.vue'),
    meta: {
      title: '项目详情',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

// 路由守卫：管理路由历史和方向
router.beforeEach((to, from) => {
  const appStore = useAppStore()
  
  // Skip history management for initial navigation (when from.path is empty or undefined)
  if (!from.name && !from.path) {
    appStore.setCurrentRoute(to.path)
    appStore.setRouteDirection('forward')
    return
  }
  
  // 获取当前历史记录
  const history = appStore.getRouteHistory()
  
  // 检查是否是后退操作：目标路由是历史栈中的最后一项
  const isBackward = history.length > 0 && history[history.length - 1] === to.path
  
  if (isBackward) {
    // 后退：从历史记录中移除
    appStore.popRouteHistory()
    appStore.setRouteDirection('backward')
  } else {
    // 前进：添加到历史记录
    if (from.path && from.path !== to.path) {
      appStore.pushRouteHistory(from.path)
    }
    appStore.setRouteDirection('forward')
  }
  
  appStore.setCurrentRoute(to.path)
})

export default router
