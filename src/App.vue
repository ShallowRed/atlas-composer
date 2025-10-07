<script setup lang="ts">
import AppHeader from '#src/components/ui/AppHeader.vue'
import { RouterView } from 'vue-router'
import AppFooter from '@/components/ui/AppFooter.vue'
import LoadingModal from '@/components/ui/LoadingModal.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { useGeoDataStore } from '@/stores/geoData'

const geoDataStore = useGeoDataStore()
</script>

<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <AppHeader />
    <RouterView class="flex-1" />
    <AppFooter />

    <!-- Global loading and error states -->
    <LoadingModal :is-loading="geoDataStore.isLoading" />
    <ToastNotification
      :message="geoDataStore.error"
      type="error"
      @close="geoDataStore.clearError()"
    />
  </div>
</template>
