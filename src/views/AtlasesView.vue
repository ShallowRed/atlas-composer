<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import { useAtlasList } from '@/composables/useAtlasList'
import { DEFAULT_ATLAS } from '@/core/atlases/registry'

const { t } = useI18n()
const route = useRoute()
const { atlasList } = useAtlasList()

const atlases = computed(() => atlasList.value.flatMap(group => group.options))
const chosenAtlas = computed(() =>
  atlases.value.find(atlas => atlas.value === route.query.atlas)
  ?? atlases.value.find(atlas => atlas.value === DEFAULT_ATLAS)
  ?? atlases.value[0],
)
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-3xl font-bold">
      {{ t('nav.atlases') }}
    </h1>

    <div class="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
      <nav
        class="flex flex-col gap-4"
        :aria-label="t('nav.atlases')"
      >
        <div
          v-for="group in atlasList"
          :key="group.id"
        >
          <h2 class="mb-1 px-3 text-sm font-medium text-base-content/70">
            {{ group.label }}
          </h2>
          <ul class="menu w-full p-0">
            <li
              v-for="atlas in group.options"
              :key="atlas.value"
            >
              <RouterLink
                :to="{ query: { atlas: atlas.value } }"
                replace
                :class="{ 'bg-base-300 font-medium': chosenAtlas?.value === atlas.value }"
                :aria-current="chosenAtlas?.value === atlas.value ? 'page' : undefined"
              >
                <span aria-hidden="true">{{ atlas.icon }}</span>
                {{ atlas.label }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>

      <section
        v-if="chosenAtlas"
        class="flex flex-col gap-6"
      >
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="text-4xl leading-none"
            aria-hidden="true"
          >{{ chosenAtlas.icon }}</span>
          <h2 class="flex-1 text-2xl font-semibold">
            {{ chosenAtlas.label }}
          </h2>
          <RouterLink
            :to="{ path: '/', query: { atlas: chosenAtlas.value } }"
            class="btn btn-primary"
          >
            {{ t('atlases.open') }}
            <i class="ri-arrow-right-line" />
          </RouterLink>
        </div>
        <div
          v-for="view in chosenAtlas.views"
          :key="view.mode"
          class="flex flex-col gap-2"
        >
          <div class="flex items-center gap-2">
            <h3 class="flex flex-1 items-center gap-2 font-medium">
              <i
                class="text-primary"
                :class="view.icon"
              />
              {{ view.label }}
            </h3>
            <RouterLink
              :to="{ path: '/', query: { atlas: chosenAtlas.value, view: view.mode } }"
              class="btn btn-ghost btn-sm"
            >
              {{ t('atlases.openView') }}
              <i class="ri-arrow-right-line" />
            </RouterLink>
          </div>
          <ul class="flex flex-col divide-y divide-base-300 rounded-box border border-base-300 bg-base-100">
            <li
              v-for="preset in view.presets"
              :key="preset.id"
              class="px-4 py-3"
            >
              <p class="text-sm font-medium">
                {{ preset.name }}
              </p>
              <p
                v-if="preset.description"
                class="text-sm text-base-content/70"
              >
                {{ preset.description }}
              </p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>
