<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import LanguageSelector from '@/components/ui/settings/LanguageSelector.vue'
import ThemeSelector from '@/components/ui/settings/ThemeSelector.vue'

const route = useRoute()
const { t } = useI18n()

const allowThemeSelection = true

const NAV_LINKS = [
  { path: '/', icon: 'ri-layout-line', labelKey: 'nav.map' },
  { path: '/atlas', icon: 'ri-earth-line', labelKey: 'nav.atlases' },
  { path: '/about', icon: 'ri-information-line', labelKey: 'nav.about' },
]
</script>

<template>
  <header>
    <!-- Navigation Bar -->
    <div class="bg-base-100 shadow-sm">
      <nav class="navbar px-1 sm:px-2">
        <div class="flex-1">
          <div class="flex flex-col items-start justify-center px-2 py-2 gap-0 h-12 box-content size-auto whitespace-nowrap">
            <span class="text-lg font-bold flex items-center gap-2">
              <i class="ri-map-2-fill" />
              {{ t('app.title') }}
            </span>
            <span class="text-xs opacity-70 font-normal hidden sm:inline">
              {{ t('app.subtitle') }}
            </span>
          </div>
        </div>
        <div class="flex-none">
          <ul class="menu menu-horizontal items-center gap-0 md:gap-2 flex-nowrap px-0 md:px-1 max-md:[&>li>*]:px-1.5">
            <li
              v-for="link in NAV_LINKS"
              :key="link.path"
              :class="{ 'disabled pointer-events-none': route.path === link.path }"
            >
              <RouterLink
                v-if="route.path !== link.path"
                :to="link.path"
                class="flex items-center justify-center gap-2"
              >
                <i :class="link.icon" />
                <span class="sr-only md:not-sr-only">{{ t(link.labelKey) }}</span>
              </RouterLink>
              <span
                v-else
                class="text-primary font-semibold flex items-center justify-center gap-2"
              >
                <i :class="link.icon" />
                <span class="sr-only md:not-sr-only">{{ t(link.labelKey) }}</span>
              </span>
            </li>
            <li>
              <a
                href="https://github.com/shallowred/atlas-composer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i class="ri-github-line" />
                <span class="sr-only md:not-sr-only">GitHub</span>
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
  </header>
</template>
