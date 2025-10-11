import { createRouter, createWebHistory } from 'vue-router'
import AboutView from '@/views/AboutView.vue'
import MapView from '@/views/MapView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'map',
      component: MapView,
      meta: {
        title: 'Atlas composer',
      },
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
      meta: {
        title: 'À propos - Atlas composer',
      },
    },
  ],
})

// Update page title on navigation
router.beforeEach((to, _from, next) => {
  document.title = (to.meta.title as string) || 'Atlas composer'
  next()
})

export default router
