<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import LanguageSelector from '@/components/ui/settings/LanguageSelector.vue'
import ThemeSelector from '@/components/ui/settings/ThemeSelector.vue'

const route = useRoute()
const { t } = useI18n()

const allowThemeSelection = true
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
            <ul class="menu menu-horizontal px-1 gap-2 items-center">
              <li
                :class="{ 'disabled pointer-events-none': route.path === '/' }"
              >
                <RouterLink
                  v-if="route.path !== '/'"
                  to="/"
                  class="flex items-center justify-center gap-2"
                >
                  <i class="ri-layout-line" />
                  {{ t('nav.map') }}
                </RouterLink>
                <span
                  v-else
                  class="text-primary font-semibold flex items-center gap-2 justify-center"
                >
                  <i class="ri-layout-line" />
                  {{ t('nav.map') }}
                </span>
              </li>
              <li :class="{ 'disabled pointer-events-none': route.path === '/about' }">
                <RouterLink
                  v-if="route.path !== '/about'"
                  to="/about"
                  class="flex items-center gap-2 justify-center"
                >
                  <i class="ri-information-line" />
                  {{ t('nav.about') }}
                </RouterLink>
                <span
                  v-else
                  class="text-primary font-semibold flex items-center gap-2 justify-center"
                >
                  <i class="ri-information-line" />
                  {{ t('nav.about') }}
                </span>
              </li>
              <li>
                <a
                  href="https://github.com/shallowred/atlas-composer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i class="ri-github-line" />
                  GitHub
                </a>
              </li>
              <li>
                <!-- Language Selector -->
                <LanguageSelector />
              </li>
              <li v-if="allowThemeSelection">
                <!-- Theme Selector -->
                <ThemeSelector />
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>
