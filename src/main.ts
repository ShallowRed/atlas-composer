import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@/App.vue'
import { DEFAULT_ATLAS } from '@/core/atlases/registry'
import i18n from '@/i18n'
import router from '@/router'
import { useAtlasStore } from '@/stores/atlas'
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

useAtlasStore(pinia).loadAtlas(DEFAULT_ATLAS).then((result) => {
  debug('Default atlas preload: %O', result.ok ? 'done' : result.error)
  app.mount('#app')
}).catch((error) => {
  debug('Failed to preload default atlas: %O', error)
  app.mount('#app')
})
