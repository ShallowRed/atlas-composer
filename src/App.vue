<script setup lang="ts">
import { computed } from 'vue'
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

uiStore.initializeTheme()

const fillsViewport = computed(() => route.meta.fillViewport === true)

const geoDataErrorMessage = computed(() => geoDataStore.error && errorMessage(geoDataStore.error))
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

    <!-- Global error state from geoDataStore -->
    <ToastNotification
      :message="geoDataErrorMessage"
      type="error"
      @close="geoDataStore.clearError()"
    />

    <!-- Toast notifications from UI store -->
    <ToastNotification
      v-for="toast in uiStore.toasts"
      :key="toast.id"
      :message="'error' in toast ? errorMessage(toast.error) : toast.message"
      :type="toast.type"
      @close="uiStore.dismissToast(toast.id)"
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
