import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@/App.vue'
import { preloadDefaultAtlas } from '@/core/atlases/registry'
import i18n from '@/i18n'
import router from '@/router'
import { logger } from '@/utils/logger'
import '@/styles.css'

// Enable debug logging based on environment variable
// This allows: VITE_DEBUG=ac:* pnpm dev
if (import.meta.env.VITE_DEBUG) {
  localStorage.debug = import.meta.env.VITE_DEBUG
  console.log(`🐛 Debug logging enabled: ${import.meta.env.VITE_DEBUG}`)
}

const debug = logger.atlas.loader

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Preload default atlas before mounting
preloadDefaultAtlas()
  .then(() => {
    debug('Default atlas preloaded, mounting app...')
    app.mount('#app')
  })
  .catch((error) => {
    debug('Failed to preload default atlas: %O', error)
    // Mount anyway to show error UI
    app.mount('#app')
  })
