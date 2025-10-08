<script setup lang="ts">
import type { ProjectionDefinition } from '@/projections/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

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

// Format capabilities for display
const preserves = computed(() => {
  return props.projection.capabilities.preserves
    .map(prop => t(`projections.properties.${prop}`))
    .join(', ')
})

const distorts = computed(() => {
  if (!props.projection.capabilities.distorts?.length) return null
  return props.projection.capabilities.distorts
    .map(prop => t(`projections.properties.${prop}`))
    .join(', ')
})

// Get category translation
const categoryLabel = computed(() => {
  return t(`projections.categories.${props.projection.category}`)
})

// Get projection properties badges
const propertyBadges = computed(() => {
  const badges: Array<{ label: string, icon: string, class: string }> = []
  
  if (props.projection.capabilities.preserves.includes('area')) {
    badges.push({
      label: t('projections.properties.area'),
      icon: 'ri-shape-line',
      class: 'badge-success',
    })
  }
  
  if (props.projection.capabilities.preserves.includes('angle')) {
    badges.push({
      label: t('projections.properties.angle'),
      icon: 'ri-compass-3-line',
      class: 'badge-info',
    })
  }
  
  if (props.projection.capabilities.isInterrupted) {
    badges.push({
      label: t('projections.properties.interrupted'),
      icon: 'ri-scissors-cut-line',
      class: 'badge-warning',
    })
  }
  
  return badges
})
</script>

<template>
  <div class="projection-info" :class="{ compact }">
    <!-- Header -->
    <div class="flex items-start justify-between gap-2 mb-2">
      <div class="flex-1">
        <h3 class="font-semibold text-base">
          {{ $t(projection.name) }}
        </h3>
        <p class="text-xs opacity-70">
          {{ categoryLabel }}
        </p>
      </div>
    </div>

    <!-- Description -->
    <p v-if="projection.description && !compact" class="text-sm opacity-80 mb-3">
      {{ $t(projection.description) }}
    </p>

    <!-- Property Badges -->
    <div v-if="propertyBadges.length > 0" class="flex flex-wrap gap-1 mb-3">
      <span
        v-for="badge in propertyBadges"
        :key="badge.label"
        class="badge badge-sm gap-1"
        :class="badge.class"
      >
        <i :class="badge.icon" />
        {{ badge.label }}
      </span>
    </div>

    <!-- Capabilities -->
    <div v-if="!compact" class="text-sm space-y-1">
      <div class="flex items-start gap-2">
        <i class="ri-check-line text-success mt-0.5" />
        <span>
          <strong>{{ t('projections.info.preserves') }}:</strong> {{ preserves }}
        </span>
      </div>
      <div v-if="distorts" class="flex items-start gap-2">
        <i class="ri-close-line text-error mt-0.5" />
        <span>
          <strong>{{ t('projections.info.distorts') }}:</strong> {{ distorts }}
        </span>
      </div>
    </div>

    <!-- View Mode Compatibility -->
    <div v-if="!compact" class="mt-3 text-sm">
      <div class="font-medium mb-1">
        {{ t('projections.info.compatibility') }}:
      </div>
      <div class="flex flex-wrap gap-1">
        <span
          v-if="projection.capabilities.supportsComposite"
          class="badge badge-sm badge-outline"
        >
          {{ t('mode.compositeCustom') }}
        </span>
        <span
          v-if="projection.capabilities.supportsSplit"
          class="badge badge-sm badge-outline"
        >
          {{ t('mode.split') }}
        </span>
        <span
          v-if="projection.capabilities.supportsUnified"
          class="badge badge-sm badge-outline"
        >
          {{ t('mode.unified') }}
        </span>
      </div>
    </div>

    <!-- Metadata -->
    <div v-if="showMetadata && (projection.creator || projection.year)" class="mt-3 pt-3 border-t border-base-300 text-xs opacity-70">
      <div v-if="projection.creator">
        <strong>{{ t('projections.info.creator') }}:</strong> {{ projection.creator }}
      </div>
      <div v-if="projection.year">
        <strong>{{ t('projections.info.year') }}:</strong> {{ projection.year }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.projection-info.compact {
  @apply space-y-1;
}
</style>
