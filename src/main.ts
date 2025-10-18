import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@/App.vue'
import { preloadDefaultAtlas } from '@/core/atlases/registry'
import i18n from '@/i18n'
import router from '@/router'
import '@/styles.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Preload default atlas before mounting
preloadDefaultAtlas()
  .then(() => {
    console.info('[App] Default atlas preloaded, mounting app...')
    app.mount('#app')
  })
  .catch((error) => {
    console.error('[App] Failed to preload default atlas:', error)
    // Mount anyway to show error UI
    app.mount('#app')
  })
