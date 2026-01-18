import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@/App.vue'
import { preloadDefaultAtlas } from '@/core/atlases/registry'
import i18n from '@/i18n'
import router from '@/router'
import { logger } from '@/utils/logger'
import '@/styles.css'

if (import.meta.env.VITE_DEBUG) {
  localStorage.removeItem('debug')
  localStorage.debug = import.meta.env.VITE_DEBUG
  console.log(`🐛 Debug logging enabled: ${import.meta.env.VITE_DEBUG}`)
  console.log(`   To disable: localStorage.removeItem('debug')`)
}
else if (localStorage.debug) {
  console.log(`🐛 Debug logging from localStorage: ${localStorage.debug}`)
  console.log(`   To disable: localStorage.removeItem('debug')`)
}

const debug = logger.atlas.loader

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

preloadDefaultAtlas()
  .then(() => {
    debug('Default atlas preloaded, mounting app...')
    app.mount('#app')
  })
  .catch((error) => {
    debug('Failed to preload default atlas: %O', error)
    app.mount('#app')
  })
