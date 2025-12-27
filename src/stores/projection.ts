/**
 * Projection Store
 *
 * Bounded Context: Projection selection and canvas configuration
 *
 * Responsibilities:
 * - Projection selection state (selectedProjection, compositeProjection)
 * - Canvas configuration (referenceScale, canvasDimensions)
 * - Projection parameter convenience wrappers
 * - Projection UI visibility rules (delegated to ProjectionUIService)
 *
 * Domain Model Integration:
 * - projectionSelection: ProjectionSelection value object for domain behavior
 *
 * This store owns all projection-related state previously in configStore.
 * Parameter storage is delegated to parameterStore (single source of truth).
 */

import type { ProjectionId } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ProjectionSelection } from '@/core/projections/projection-selection'
import { projectionRegistry } from '@/core/projections/registry'
import { useParameterStore } from '@/stores/parameters'
import { logger } from '@/utils/logger'

const debug = logger.store.config // Reuse existing logger namespace

export const useProjectionStore = defineStore('projection', () => {
  // ============================================
  // Dependencies
  // ============================================
  const parameterStore = useParameterStore()

  // ============================================
  // State
  // ============================================

  /**
   * Currently selected projection ID
   * Nullable until preset loads - no fallback values
   */
  const selectedProjection = ref<ProjectionId | null>(null)

  /**
   * Composite projection ID (for built-in composite projections)
   * Nullable until preset loads
   */
  const compositeProjection = ref<ProjectionId | null>(null)

  /**
   * Reference scale from preset
   * Used for consistent scaling across view modes
   */
  const referenceScale = ref<number | undefined>(undefined)

  /**
   * Canvas dimensions from preset
   * Defines the rendering area size
   */
  const canvasDimensions = ref<{ width: number, height: number } | undefined>(undefined)

  /**
   * Scale preservation mode
   * When true, maintains relative scale when switching projections
   */
  const scalePreservation = ref(true)

  /**
   * Rotate latitude lock state
   * When true, latitude rotation is locked to 0
   */
  const rotateLatitudeLocked = ref(true)

  /**
   * Auto fit domain state
   * When true, projection auto-fits to show all data (domain fitting)
   * When false, allows manual scale control via scaleMultiplier
   */
  const autoFitDomain = ref(true)

  // ============================================
  // Computed - Domain Model Integration
  // ============================================

  /**
   * ProjectionSelection value object (nullable)
   *
   * Provides domain behavior for the current projection:
   * - supportsRotation(): boolean
   * - usesParallels(): boolean
   * - isComposite(): boolean
   * - isFromFamily(family): boolean
   *
   * Returns null when no projection is selected.
   * Use this for domain logic instead of raw projection ID comparisons.
   */
  const projectionSelection = computed(() => {
    if (!selectedProjection.value) {
      return null
    }
    return ProjectionSelection.fromRegistry(selectedProjection.value, projectionRegistry)
  })

  // ============================================
  // Computed (UI Visibility - delegated to service)
  // ============================================

  // Note: These need viewMode from viewStore, but to avoid circular deps,
  // they're passed as parameters or accessed via composables

  // ============================================
  // Actions
  // ============================================

  /**
   * Set the selected projection
   */
  function setSelectedProjection(projection: ProjectionId): void {
    selectedProjection.value = projection
    debug('Projection selected: %s', projection)
  }

  /**
   * Set the composite projection
   */
  function setCompositeProjection(projection: ProjectionId): void {
    compositeProjection.value = projection
    debug('Composite projection set: %s', projection)
  }

  /**
   * Set scale preservation mode
   */
  function setScalePreservation(value: boolean): void {
    scalePreservation.value = value
  }

  /**
   * Set rotate latitude lock state
   */
  function setRotateLatitudeLocked(locked: boolean): void {
    rotateLatitudeLocked.value = locked
  }

  /**
   * Set auto fit domain state
   * When true, projection auto-fits to show all data
   * When false, allows manual scale control
   */
  function setAutoFitDomain(value: boolean): void {
    autoFitDomain.value = value
  }

  /**
   * Set reference scale
   */
  function setReferenceScale(scale: number | undefined): void {
    referenceScale.value = scale
  }

  /**
   * Set canvas dimensions
   */
  function setCanvasDimensions(dimensions: { width: number, height: number } | undefined): void {
    canvasDimensions.value = dimensions
  }

  // ============================================
  // Parameter Convenience Wrappers
  // These delegate to parameterStore but provide a cleaner API
  // ============================================

  /**
   * Set custom rotation (longitude, latitude)
   */
  function setCustomRotate(longitude: number | null, latitude: number | null): void {
    const rotateValue = longitude !== null || latitude !== null
      ? [longitude ?? 0, latitude ?? 0] as [number, number]
      : undefined
    parameterStore.setGlobalParameter('rotate', rotateValue)
  }

  /**
   * Set custom center (longitude, latitude)
   */
  function setCustomCenter(longitude: number | null, latitude: number | null): void {
    const centerValue = longitude !== null || latitude !== null
      ? [longitude ?? 0, latitude ?? 0] as [number, number]
      : undefined
    parameterStore.setGlobalParameter('center', centerValue)
  }

  /**
   * Set custom parallels (parallel1, parallel2)
   */
  function setCustomParallels(parallel1: number | null, parallel2: number | null): void {
    const parallelsValue = parallel1 !== null || parallel2 !== null
      ? [parallel1 ?? 30, parallel2 ?? 60] as [number, number]
      : undefined
    parameterStore.setGlobalParameter('parallels', parallelsValue)
  }

  /**
   * Set custom scale
   */
  function setCustomScale(scale: number | null): void {
    parameterStore.setGlobalParameter('scale', scale ?? undefined)
  }

  /**
   * Set custom rotate longitude only
   */
  function setCustomRotateLongitude(value: number | null): void {
    const currentLatitude = parameterStore.globalParameters.rotate?.[1] ?? null
    setCustomRotate(value, currentLatitude)
  }

  /**
   * Set custom rotate latitude only
   */
  function setCustomRotateLatitude(value: number | null): void {
    const currentLongitude = parameterStore.globalParameters.rotate?.[0] ?? null
    setCustomRotate(currentLongitude, value)
  }

  /**
   * Set custom center longitude only
   */
  function setCustomCenterLongitude(value: number | null): void {
    const currentLatitude = parameterStore.globalParameters.center?.[1] ?? null
    setCustomCenter(value, currentLatitude)
  }

  /**
   * Set custom center latitude only
   */
  function setCustomCenterLatitude(value: number | null): void {
    const currentLongitude = parameterStore.globalParameters.center?.[0] ?? null
    setCustomCenter(currentLongitude, value)
  }

  /**
   * Set custom parallel 1 only
   */
  function setCustomParallel1(value: number | null): void {
    const currentParallel2 = parameterStore.globalParameters.parallels?.[1] ?? null
    setCustomParallels(value, currentParallel2)
  }

  /**
   * Set custom parallel 2 only
   */
  function setCustomParallel2(value: number | null): void {
    const currentParallel1 = parameterStore.globalParameters.parallels?.[0] ?? null
    setCustomParallels(currentParallel1, value)
  }

  /**
   * Reset all projection parameters
   * Clears global overrides so atlas/preset defaults take effect
   * @param _currentViewPreset - Current view preset ID (unused, kept for API compatibility)
   */
  function resetProjectionParams(_currentViewPreset: string | null): void {
    // Clear ALL global parameters - atlas parameters will take effect automatically
    parameterStore.setGlobalParameter('rotate', undefined)
    parameterStore.setGlobalParameter('center', undefined)
    parameterStore.setGlobalParameter('parallels', undefined)
    parameterStore.setGlobalParameter('scale', undefined)

    // Clear canonical parameters too
    parameterStore.setGlobalParameter('focusLongitude', undefined)
    parameterStore.setGlobalParameter('focusLatitude', undefined)
    parameterStore.setGlobalParameter('rotateGamma', undefined)
    parameterStore.setGlobalParameter('scaleMultiplier', undefined)

    rotateLatitudeLocked.value = true
  }

  // ============================================
  // Computed Parameter Accessors
  // ============================================

  const customRotateLongitude = computed(() =>
    parameterStore.globalParameters.rotate?.[0] ?? null,
  )

  const customRotateLatitude = computed(() =>
    parameterStore.globalParameters.rotate?.[1] ?? null,
  )

  const customCenterLongitude = computed(() =>
    parameterStore.globalParameters.center?.[0] ?? null,
  )

  const customCenterLatitude = computed(() =>
    parameterStore.globalParameters.center?.[1] ?? null,
  )

  const customParallel1 = computed(() =>
    parameterStore.globalParameters.parallels?.[0] ?? null,
  )

  const customParallel2 = computed(() =>
    parameterStore.globalParameters.parallels?.[1] ?? null,
  )

  const customScale = computed(() =>
    parameterStore.globalParameters.scale ?? null,
  )

  // ============================================
  // Return Public API
  // ============================================

  return {
    // State
    selectedProjection,
    compositeProjection,
    referenceScale,
    canvasDimensions,
    scalePreservation,
    rotateLatitudeLocked,
    autoFitDomain,

    // Domain Model - Value Objects
    projectionSelection,

    // Parameter Accessors (computed)
    customRotateLongitude,
    customRotateLatitude,
    customCenterLongitude,
    customCenterLatitude,
    customParallel1,
    customParallel2,
    customScale,

    // Actions
    setSelectedProjection,
    setCompositeProjection,
    setScalePreservation,
    setRotateLatitudeLocked,
    setAutoFitDomain,
    setReferenceScale,
    setCanvasDimensions,

    // Parameter Convenience Wrappers
    setCustomRotate,
    setCustomCenter,
    setCustomParallels,
    setCustomScale,
    setCustomRotateLongitude,
    setCustomRotateLatitude,
    setCustomCenterLongitude,
    setCustomCenterLatitude,
    setCustomParallel1,
    setCustomParallel2,
    resetProjectionParams,
  }
})
