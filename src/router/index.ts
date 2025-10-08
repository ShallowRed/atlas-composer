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
        title: 'Cartographies Responsives',
      },
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
      meta: {
        title: 'À propos - Cartographies Responsives',
      },
    },
  ],
})

// Update page title on navigation
router.beforeEach((to, _from, next) => {
  document.title = (to.meta.title as string) || 'Cartographies Responsives'
  next()
})

export default router
