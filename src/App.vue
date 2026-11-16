<script setup lang="ts">
import type { Toast } from '@/components/ui/export/ToastNotification.vue'
import { useTitle } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterView, useRoute } from 'vue-router'
import ToastNotification from '@/components/ui/export/ToastNotification.vue'
import AppFooter from '@/components/ui/layout/AppFooter.vue'
import AppHeader from '@/components/ui/layout/AppHeader.vue'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { useGeoDataStore } from '@/stores/geoData'
import { useUIStore } from '@/stores/ui'

const route = useRoute()
const geoDataStore = useGeoDataStore()
const uiStore = useUIStore()
const { errorMessage } = useErrorMessage()
const { t } = useI18n()

useTitle(computed(() => {
  const { titleKey } = route.meta
  return titleKey ? `${t(titleKey)} - ${t('app.title')}` : t('app.title')
}))

uiStore.initializeTheme()

const fillsViewport = computed(() => route.meta.fillViewport === true)

const GEO_DATA_TOAST_ID = 'geo-data-error'

const toasts = computed<Toast[]>(() => [
  ...(geoDataStore.error ? [{ id: GEO_DATA_TOAST_ID, message: errorMessage(geoDataStore.error), type: 'error' as const }] : []),
  ...uiStore.toasts.map(toast => ({
    id: toast.id,
    type: toast.type,
    message: 'error' in toast ? errorMessage(toast.error) : toast.message,
  })),
])

function closeToast(id: string) {
  if (id === GEO_DATA_TOAST_ID) {
    geoDataStore.clearError()
  }
  else {
    uiStore.dismissToast(id)
  }
}
</script>

<template>
  <div
    class="body__inner bg-base-200"
    :class="{ 'app-shell': fillsViewport }"
  >
    <AppHeader class="h-[4.5rem]" />
    <main :class="{ 'page-column': !fillsViewport }">
      <RouterView class="flex-1" />
    </main>
    <AppFooter v-if="!fillsViewport" />

    <ToastNotification
      :toasts="toasts"
      @close="closeToast"
    />
  </div>
</template>

<style scoped>
@reference "tailwindcss";
.body__inner main {
  @apply min-h-[calc(100vh-4rem)] py-8 flex flex-col;
}

.body__inner.app-shell {
  @apply lg:h-dvh lg:flex lg:flex-col lg:overflow-hidden;
}

.body__inner.app-shell main {
  @apply min-h-0 max-w-none p-2 sm:p-4 lg:flex-1;
}

/* From lg the shell has no page scrollbar, so a modal keeps no scrollbar gutter */
:global(:root:has(.app-shell):has(.modal-open)) {
  @apply lg:[scrollbar-gutter:auto];
}
</style>
