import type { Ref } from 'vue'
import type { ProjectionDefinition, ProjectionRecommendation } from '@/projections/types'

import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

export interface ValidationResult {
  isValid: boolean
  severity: 'error' | 'warning' | 'info'
  message: string
  alternatives?: ProjectionDefinition[]
  requiresConfirmation: boolean
}

export interface ValidationOptions {
  atlasId: string
  viewMode?: string
  territoryCode?: string
  recommendations?: ProjectionRecommendation[]
}

/**
 * Composable for validating projection selections and providing warnings
 */
export function useProjectionValidation() {
  const { t } = useI18n()
  const lastValidation = ref<ValidationResult | null>(null)

  /**
   * Validate a projection selection
   * @param projection - The projection definition to validate
   * @param options - Validation context options
   * @returns ValidationResult with severity and message
   */
  function validateProjection(
    projection: ProjectionDefinition,
    options: ValidationOptions,
  ): ValidationResult {
    const { recommendations = [] } = options

    // Find the recommendation for this projection
    const recommendation = recommendations.find(r => r.projection.id === projection.id)

    // Check if projection is prohibited (score < 0)
    if (recommendation && recommendation.score < 0) {
      const alternatives = recommendations
        .filter(r => r.score > 30) // Get excellent alternatives
        .slice(0, 3)
        .map(r => r.projection)

      const result: ValidationResult = {
        isValid: false,
        severity: 'error',
        message: t('projection.validation.prohibited', {
          projection: t(`projections.${projection.id}.name`),
          reason: recommendation.reason
            ? t(`projections.recommendations.${recommendation.reason}`)
            : t('projection.validation.notSuitable'),
        }),
        alternatives,
        requiresConfirmation: true,
      }
      lastValidation.value = result
      return result
    }

    // Check if projection has poor suitability (score < 15)
    if (recommendation && recommendation.score < 15) {
      const alternatives = recommendations
        .filter(r => r.score > 20)
        .slice(0, 3)
        .map(r => r.projection)

      const result: ValidationResult = {
        isValid: true,
        severity: 'warning',
        message: t('projection.validation.poorChoice', {
          projection: t(`projections.${projection.id}.name`),
        }),
        alternatives,
        requiresConfirmation: false,
      }
      lastValidation.value = result
      return result
    }

    // Check if projection has low suitability (score < 25)
    if (recommendation && recommendation.score < 25) {
      const alternatives = recommendations
        .filter(r => r.score > 30)
        .slice(0, 2)
        .map(r => r.projection)

      const result: ValidationResult = {
        isValid: true,
        severity: 'info',
        message: t('projection.validation.betterOptionsAvailable', {
          projection: t(`projections.${projection.id}.name`),
        }),
        alternatives,
        requiresConfirmation: false,
      }
      lastValidation.value = result
      return result
    }

    // Projection is suitable (score >= 25)
    const result: ValidationResult = {
      isValid: true,
      severity: 'info',
      message: '',
      alternatives: [],
      requiresConfirmation: false,
    }
    lastValidation.value = result
    return result
  }

  /**
   * Get a formatted message for displaying alternatives
   * @param alternatives - Array of alternative projections
   * @returns Formatted message string
   */
  function formatAlternatives(alternatives: ProjectionDefinition[]): string {
    if (alternatives.length === 0) return ''

    const names = alternatives.map(p => t(`projections.${p.id}.name`))
    return t('projection.validation.alternatives', {
      projections: names.join(', '),
    })
  }

  /**
   * Clear the last validation result
   */
  function clearValidation() {
    lastValidation.value = null
  }

  return {
    validateProjection,
    formatAlternatives,
    clearValidation,
    lastValidation: lastValidation as Readonly<Ref<ValidationResult | null>>,
  }
}
