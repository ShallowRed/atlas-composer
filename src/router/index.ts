import { createRouter, createWebHistory } from 'vue-router'
import AboutView from '@/views/AboutView.vue'
import MapView from '@/views/MapView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'map',
      component: MapView,
      meta: {
        title: 'Atlas composer',
        fillViewport: true,
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
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: {
        title: 'Page introuvable - Atlas composer',
      },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  document.title = (to.meta.title as string) || 'Atlas composer'
  next()
})

export default router
