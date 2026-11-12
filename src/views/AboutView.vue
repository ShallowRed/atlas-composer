<script setup lang="ts">
import type { ViewMode } from '@/types'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useAtlasGroups } from '@/composables/useAtlasGroups'
import { getViewModeIcon, getViewModeLabelKey, VIEW_MODES } from '@/utils/view-modes'

const { t } = useI18n()

const viewModeDescriptions: Record<ViewMode, string> = {
  'composite-custom': 'about.features.compositeCustom',
  'split': 'about.features.split',
  'built-in-composite': 'about.features.compositeExisting',
  'unified': 'about.features.unified',
}

const { atlasGroups } = useAtlasGroups()
</script>

<template>
  <div class="flex flex-col gap-12">
    <header class="flex flex-col gap-4">
      <h1 class="text-3xl font-bold">
        {{ t('about.title') }}
      </h1>
      <p class="text-lg text-base-content/80">
        {{ t('about.intro') }}
      </p>
      <div class="flex flex-wrap gap-3">
        <RouterLink
          to="/"
          class="btn btn-primary"
        >
          {{ t('nav.openApp') }}
          <i class="ri-arrow-right-line" />
        </RouterLink>
        <a
          href="https://github.com/shallowred/atlas-composer"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-outline"
        >
          <i class="ri-github-line" />
          GitHub
        </a>
      </div>
    </header>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold">
        {{ t('about.why.title') }}
      </h2>
      <p>
        {{ t('about.why.description') }}
      </p>
      <a
        href="https://observablehq.com/@shallowred/atlas-composer"
        target="_blank"
        rel="noopener noreferrer"
        class="link link-primary inline-flex items-center gap-2 self-start"
      >
        <i class="ri-line-chart-line" />
        {{ t('export.observableNotebook') }}
        <i class="ri-external-link-line" />
      </a>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-semibold">
        {{ t('about.features.title') }}
      </h2>
      <ul class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <li
          v-for="mode in VIEW_MODES"
          :key="mode"
          class="flex gap-3"
        >
          <i
            class="text-lg leading-6 text-primary"
            :class="getViewModeIcon(mode)"
          />
          <div>
            <h3 class="font-medium">
              {{ t(getViewModeLabelKey(mode)) }}
            </h3>
            <p class="text-sm text-base-content/80">
              {{ t(viewModeDescriptions[mode]) }}
            </p>
          </div>
        </li>
        <li class="flex gap-3">
          <i class="ri-download-line text-lg leading-6 text-primary" />
          <div>
            <h3 class="font-medium">
              {{ t('about.features.exportTitle') }}
            </h3>
            <p class="text-sm text-base-content/80">
              {{ t('about.features.export') }}
            </p>
          </div>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-semibold">
        {{ t('about.atlases.title') }}
      </h2>
      <div
        v-for="group in atlasGroups"
        :key="group.id"
        class="flex flex-col gap-2"
      >
        <h3 class="text-sm font-medium text-base-content/70">
          {{ group.label }}
        </h3>
        <ul class="flex flex-wrap gap-2">
          <li
            v-for="atlas in group.options"
            :key="atlas.value"
          >
            <RouterLink
              :to="{ path: '/atlas', query: { atlas: atlas.value } }"
              class="btn btn-sm"
            >
              <span aria-hidden="true">{{ atlas.icon }}</span>
              {{ atlas.label }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
