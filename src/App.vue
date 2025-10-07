<script setup lang="ts">
import { RouterView } from 'vue-router'
import HeroBanner from '@/components/ui/HeroBanner.vue'
import LoadingModal from '@/components/ui/LoadingModal.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { useGeoDataStore } from '@/stores/geoData'

const geoDataStore = useGeoDataStore()
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <HeroBanner />
    <RouterView />

    <!-- Global loading and error states -->
    <LoadingModal :is-loading="geoDataStore.isLoading" />
    <ToastNotification
      :message="geoDataStore.error"
      type="error"
      @close="geoDataStore.clearError()"
    />
  </div>
</template>
