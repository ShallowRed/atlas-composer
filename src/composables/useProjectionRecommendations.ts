import type { Ref } from 'vue'
import type { ProjectionRecommendation } from '@/core/projections/types'
import type { ProjectionId } from '@/types/branded'

import { computed, toValue } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Composable for managing projection recommendations
 * Provides helpers for getting recommendation badges, CSS classes, and tooltips
 */
export function useProjectionRecommendations(
  recommendations: Ref<ProjectionRecommendation[] | undefined> | ProjectionRecommendation[] | undefined,
) {
  const { t } = useI18n()

  const recommendationMap = computed(() => {
    const recs = toValue(recommendations)
    if (!recs)
      return new Map<string, ProjectionRecommendation>()

    return new Map(
      recs.map(rec => [rec.projection.id, rec]),
    )
  })

  function getRecommendation(projectionId: ProjectionId): ProjectionRecommendation | undefined {
    return recommendationMap.value.get(projectionId)
  }

  function getBadge(projectionId: ProjectionId): string {
    const rec = getRecommendation(projectionId)
    if (!rec)
      return ''

    switch (rec.level) {
      case 'excellent':
        return 'ri-star-fill'
      case 'good':
        return 'ri-star-line'
      case 'usable':
        return 'ri-star-half-line'
      default:
        return ''
    }
  }

  function getCssClass(projectionId: ProjectionId): string {
    const rec = getRecommendation(projectionId)
    if (!rec)
      return ''

    switch (rec.level) {
      case 'excellent':
        return 'text-success'
      case 'good':
        return 'text-info'
      case 'usable':
        return 'text-base-content opacity-60'
      default:
        return ''
    }
  }

  function getTooltip(projectionId: ProjectionId): string {
    const rec = getRecommendation(projectionId)
    if (!rec)
      return ''
    return t(rec.reason)
  }

  return {
    recommendationMap,
    getRecommendation,
    getBadge,
    getCssClass,
    getTooltip,
  }
}
