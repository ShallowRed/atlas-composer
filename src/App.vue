<script setup lang="ts">
import { RouterView } from 'vue-router'
import ToastNotification from '@/components/ui/export/ToastNotification.vue'
import AppFooter from '@/components/ui/layout/AppFooter.vue'
import AppHeader from '@/components/ui/layout/AppHeader.vue'
import { useGeoDataStore } from '@/stores/geoData'

const geoDataStore = useGeoDataStore()
</script>

<template>
  <div class="bg-base-200">
    <AppHeader class="h-[4rem]" />
    <main class="min-h-[calc(100vh-4rem)] container mx-auto py-8 flex flex-col">
      <RouterView class="flex-1" />
    </main>
    <AppFooter />

    <!-- Global error state -->
    <ToastNotification
      :message="geoDataStore.error"
      type="error"
      @close="geoDataStore.clearError()"
    />
  </div>
</template>
