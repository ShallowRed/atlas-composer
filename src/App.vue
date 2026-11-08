<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import ToastNotification from '@/components/ui/export/ToastNotification.vue'
import AppFooter from '@/components/ui/layout/AppFooter.vue'
import AppHeader from '@/components/ui/layout/AppHeader.vue'
import { useErrorMessage } from '@/composables/useErrorMessage'
import { useGeoDataStore } from '@/stores/geoData'
import { useUIStore } from '@/stores/ui'

const geoDataStore = useGeoDataStore()
const uiStore = useUIStore()
const { errorMessage } = useErrorMessage()

const geoDataErrorMessage = computed(() => geoDataStore.error && errorMessage(geoDataStore.error))
</script>

<template>
  <div class="body__inner bg-base-200">
    <AppHeader class="h-[4.5rem]" />
    <main>
      <RouterView class="flex-1" />
    </main>
    <AppFooter />

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
  @apply min-h-[calc(100vh-4rem)] container mx-auto py-8 flex flex-col;
}
</style>
