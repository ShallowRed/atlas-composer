import type { Ref } from 'vue'
import type { ProjectionRecommendation } from '@/core/projections/types'

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

  function getRecommendation(projectionId: string): ProjectionRecommendation | undefined {
    return recommendationMap.value.get(projectionId)
  }

  function getBadge(projectionId: string): string {
    const rec = getRecommendation(projectionId)
    if (!rec)
      return ''

    switch (rec.level) {
      case 'excellent':
        return '+++'
      case 'good':
        return '++'
      case 'usable':
        return '+'
      default:
        return ''
    }
  }

  function getCssClass(projectionId: string): string {
    const rec = getRecommendation(projectionId)
    if (!rec)
      return ''

    switch (rec.level) {
      case 'excellent':
        return 'text-success'
      case 'good':
        return 'text-info'
      case 'not-recommended':
        return 'text-error opacity-60'
      default:
        return ''
    }
  }

  function getTooltip(projectionId: string): string {
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
