import { createRouter, createWebHistory } from 'vue-router'
import AboutView from '@/views/AboutView.vue'
import AtlasesView from '@/views/AtlasesView.vue'
import ExamplesView from '@/views/ExamplesView.vue'
import MapView from '@/views/MapView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Translation key of the page name shown before the application name in the document title */
    titleKey?: string
    nav?: { labelKey: string, icon: string }
    fillViewport?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'map',
      component: MapView,
      meta: {
        nav: { labelKey: 'nav.map', icon: 'ri-layout-line' },
        fillViewport: true,
      },
    },
    {
      path: '/atlas',
      name: 'atlases',
      component: AtlasesView,
      meta: {
        titleKey: 'nav.atlases',
        nav: { labelKey: 'nav.atlases', icon: 'ri-earth-line' },
      },
    },
    {
      path: '/examples',
      name: 'examples',
      component: ExamplesView,
      meta: {
        titleKey: 'nav.examples',
        nav: { labelKey: 'nav.examples', icon: 'ri-gallery-line' },
      },
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
      meta: {
        titleKey: 'nav.about',
        nav: { labelKey: 'nav.about', icon: 'ri-information-line' },
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: {
        titleKey: 'notFound.title',
      },
    },
  ],
})

export default router
