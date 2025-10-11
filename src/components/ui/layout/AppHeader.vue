<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import LanguageSelector from '@/components/ui/settings/LanguageSelector.vue'

const route = useRoute()
const { t } = useI18n()
</script>

<template>
  <header>
    <!-- Navigation Bar -->
    <div class="bg-base-100 shadow-sm">
      <div class="container max-w-auto m-auto">
        <nav class="navbar">
          <div class="flex-1">
            <div
              class="flex flex-col items-start justify-center px-4 py-2 gap-0 h-12 box-content size-auto"
            >
              <span class="text-lg font-bold flex items-center gap-2">
                <i class="ri-map-2-fill" />
                {{ t('app.title') }}
              </span>
              <span class="text-xs opacity-70 font-normal">
                {{ t('app.subtitle') }}
              </span>
            </div>
          </div>
          <div class="flex-none">
            <ul class="menu menu-horizontal px-1">
              <li :class="{ 'disabled pointer-events-none': route.path === '/' }">
                <RouterLink
                  v-if="route.path !== '/'"
                  to="/"
                >
                  <i class="ri-layout-line" />
                  {{ t('nav.map') }}
                </RouterLink>
                <span
                  v-else
                  class="text-primary font-semibold flex items-center gap-2"
                >
                  <i class="ri-layout-line" />
                  {{ t('nav.map') }}
                </span>
              </li>
              <li :class="{ 'disabled pointer-events-none': route.path === '/about' }">
                <RouterLink
                  v-if="route.path !== '/about'"
                  to="/about"
                >
                  <i class="ri-information-line" />
                  {{ t('nav.about') }}
                </RouterLink>
                <span
                  v-else
                  class="text-primary font-semibold flex items-center gap-2"
                >
                  <i class="ri-information-line" />
                  {{ t('nav.about') }}
                </span>
              </li>
            </ul>
            <LanguageSelector />
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>
