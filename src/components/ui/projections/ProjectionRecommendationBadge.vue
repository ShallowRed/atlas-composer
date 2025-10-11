<script setup lang="ts">
import type { ProjectionRecommendation } from '@/core/projections/types'

import { toRef } from 'vue'
import { useProjectionRecommendations } from '@/composables/useProjectionRecommendations'

interface Props {
  projectionId: string
  recommendations: ProjectionRecommendation[]
  showBadge?: boolean
  showTooltip?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBadge: true,
  showTooltip: true,
})

const { getRecommendation, getBadge, getCssClass, getTooltip } = useProjectionRecommendations(
  toRef(props, 'recommendations'),
)

const recommendation = () => getRecommendation(props.projectionId)
const badge = () => getBadge(props.projectionId)
const cssClass = () => getCssClass(props.projectionId)
const tooltip = () => getTooltip(props.projectionId)
</script>

<template>
  <span
    v-if="recommendation() && showBadge"
    :class="cssClass()"
    :title="showTooltip ? tooltip() : undefined"
  >
    {{ badge() }}
  </span>
</template>

<style scoped>
/* Enhance recommendation badges visibility */
.text-success {
  font-weight: 600;
}

.text-info {
  font-weight: 500;
}

.text-error {
  font-style: italic;
}
</style>
