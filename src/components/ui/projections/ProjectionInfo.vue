<script setup lang="ts">
import type { ProjectionDefinition } from '@/core/projections/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCategoryIcon } from '@/utils/projection-icons'
import { getViewModeIcon } from '@/utils/view-mode-icons'

interface Props {
  projection: ProjectionDefinition
  showMetadata?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showMetadata: false,
  compact: false,
})

const { t } = useI18n()

const preserves = computed(() => {
  return props.projection.capabilities.preserves
    .map(prop => t(`projections.properties.${prop}`))
    .join(', ')
})

const distorts = computed(() => {
  if (!props.projection.capabilities.distorts?.length)
    return null
  return props.projection.capabilities.distorts
    .map(prop => t(`projections.properties.${prop}`))
    .join(', ')
})

const categoryLabel = computed(() => {
  return t(`projections.categories.${props.projection.category}`)
})

const categoryIcon = computed(() => getCategoryIcon(props.projection.category))
</script>

<template>
  <div
    class="projection-info"
    :class="{ compact }"
  >
    <div
      class="divider"
    />
    <div class="px-2">
      <!-- Header Section -->
      <div class="mb-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 flex flex-row items-center justify-between gap-3">
            <h3 class="text-2xl font-medium">
              {{ $t(projection.name) }}
            </h3>
            <div class="badge badge-outline gap-1.5">
              <i :class="categoryIcon" />
              {{ categoryLabel }}
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <p
        v-if="projection.description && !compact"
        class="text-lg leading-relaxed mb-4"
      >
        {{ $t(projection.description) }}
      </p>

      <!-- Capabilities Section -->
      <div
        v-if="!compact"
        class="flex flex-row gap-12 mb-4"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <i class="ri-check-line text-success text-lg" />
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm mb-1">
              {{ t('projections.info.preserves') }}
            </div>
            <div class="text-sm opacity-80">
              {{ preserves }}
            </div>
          </div>
        </div>

        <div
          v-if="distorts"
          class="flex items-start gap-3"
        >
          <div class="flex-shrink-0">
            <i class="ri-close-line text-error text-lg" />
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm mb-1">
              {{ t('projections.info.distorts') }}
            </div>
            <div class="text-sm opacity-80">
              {{ distorts }}
            </div>
          </div>
        </div>
      </div>

      <!-- View Mode Compatibility Section -->
      <div
        v-if="!compact"
        class="mb-8 mt-8"
      >
        <div class="font-medium text-sm mb-3">
          {{ t('projections.info.compatibility') }}
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-if="projection.capabilities.supportsComposite"
            class="badge badge-soft"
          >
            <i :class="getViewModeIcon('composite-custom')" />
            {{ t('mode.compositeCustom') }}
          </span>
          <span
            v-if="projection.capabilities.supportsSplit"
            class="badge badge-soft"
          >
            <i :class="getViewModeIcon('split')" />
            {{ t('mode.split') }}
          </span>
          <span
            v-if="projection.capabilities.supportsUnified"
            class="badge badge-soft"
          >
            <i :class="getViewModeIcon('unified')" />
            {{ t('mode.unified') }}
          </span>
        </div>
      </div>

      <!-- Metadata Footer -->
      <div
        v-if="showMetadata && (projection.creator || projection.year) && !compact"
        class="mt-auto pt-4"
      >
        <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-70">
          <div
            v-if="projection.creator"
            class="flex items-center gap-2"
          >
            <i class="ri-user-line" />
            <span>{{ projection.creator }}</span>
          </div>
          <div
            v-if="projection.year"
            class="flex items-center gap-2"
          >
            <i class="ri-calendar-line" />
            <span>{{ projection.year }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div
      v-if="!compact"
      class="divider my-4"
    />
  </div>
</template>
