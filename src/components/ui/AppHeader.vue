<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import LanguageSelector from '@/components/ui/LanguageSelector.vue'

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
            <RouterLink
              v-if="route.path !== '/'"
              to="/"
              class="btn btn-ghost text-lg"
            >
              <i class="ri-map-2-fill" />
              {{ t('app.title') }}
            </RouterLink>
            <span
              v-else
              class="text-lg font-semibold flex items-center gap-2 px-4"
            >
              <i class="ri-map-2-fill" />
              {{ t('app.title') }}
            </span>
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
