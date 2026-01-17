import type { ProjectionId } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ProjectionSelection } from '@/core/projections/projection-selection'
import { projectionRegistry } from '@/core/projections/registry'
import { useParameterStore } from '@/stores/parameters'
import { logger } from '@/utils/logger'

const debug = logger.store.config

export const useProjectionStore = defineStore('projection', () => {
  const parameterStore = useParameterStore()

  const selectedProjection = ref<ProjectionId | null>(null)

  const compositeProjection = ref<ProjectionId | null>(null)

  const referenceScale = ref<number | undefined>(undefined)

  const canvasDimensions = ref<{ width: number, height: number } | undefined>(undefined)

  const scalePreservation = ref(true)

  const rotateLatitudeLocked = ref(true)

  const autoFitDomain = ref(true)

  const projectionSelection = computed(() => {
    if (!selectedProjection.value) {
      return null
    }
    return ProjectionSelection.fromRegistry(selectedProjection.value, projectionRegistry)
  })

  function setSelectedProjection(projection: ProjectionId): void {
    selectedProjection.value = projection
    debug('Projection selected: %s', projection)
  }

  function setCompositeProjection(projection: ProjectionId): void {
    compositeProjection.value = projection
    debug('Composite projection set: %s', projection)
  }

  function setScalePreservation(value: boolean): void {
    scalePreservation.value = value
  }

  function setRotateLatitudeLocked(locked: boolean): void {
    rotateLatitudeLocked.value = locked
  }

  function setAutoFitDomain(value: boolean): void {
    autoFitDomain.value = value
  }

  function setReferenceScale(scale: number | undefined): void {
    referenceScale.value = scale
  }

  function setCanvasDimensions(dimensions: { width: number, height: number } | undefined): void {
    canvasDimensions.value = dimensions
  }

  function setCustomRotate(longitude: number | null, latitude: number | null): void {
    const rotateValue = longitude !== null || latitude !== null
      ? [longitude ?? 0, latitude ?? 0] as [number, number]
      : undefined
    parameterStore.setGlobalParameter('rotate', rotateValue)
  }

  function setCustomCenter(longitude: number | null, latitude: number | null): void {
    const centerValue = longitude !== null || latitude !== null
      ? [longitude ?? 0, latitude ?? 0] as [number, number]
      : undefined
    parameterStore.setGlobalParameter('center', centerValue)
  }

  function setCustomParallels(parallel1: number | null, parallel2: number | null): void {
    const parallelsValue = parallel1 !== null || parallel2 !== null
      ? [parallel1 ?? 30, parallel2 ?? 60] as [number, number]
      : undefined
    parameterStore.setGlobalParameter('parallels', parallelsValue)
  }

  function setCustomScale(scale: number | null): void {
    parameterStore.setGlobalParameter('scale', scale ?? undefined)
  }

  function setCustomRotateLongitude(value: number | null): void {
    const currentLatitude = parameterStore.globalParameters.rotate?.[1] ?? null
    setCustomRotate(value, currentLatitude)
  }

  function setCustomRotateLatitude(value: number | null): void {
    const currentLongitude = parameterStore.globalParameters.rotate?.[0] ?? null
    setCustomRotate(currentLongitude, value)
  }

  function setCustomCenterLongitude(value: number | null): void {
    const currentLatitude = parameterStore.globalParameters.center?.[1] ?? null
    setCustomCenter(value, currentLatitude)
  }

  function setCustomCenterLatitude(value: number | null): void {
    const currentLongitude = parameterStore.globalParameters.center?.[0] ?? null
    setCustomCenter(currentLongitude, value)
  }

  function setCustomParallel1(value: number | null): void {
    const currentParallel2 = parameterStore.globalParameters.parallels?.[1] ?? null
    setCustomParallels(value, currentParallel2)
  }

  function setCustomParallel2(value: number | null): void {
    const currentParallel1 = parameterStore.globalParameters.parallels?.[0] ?? null
    setCustomParallels(currentParallel1, value)
  }

  function resetProjectionParams(_currentViewPreset: string | null): void {
    parameterStore.setGlobalParameter('rotate', undefined)
    parameterStore.setGlobalParameter('center', undefined)
    parameterStore.setGlobalParameter('parallels', undefined)
    parameterStore.setGlobalParameter('scale', undefined)

    parameterStore.setGlobalParameter('focusLongitude', undefined)
    parameterStore.setGlobalParameter('focusLatitude', undefined)
    parameterStore.setGlobalParameter('rotateGamma', undefined)
    parameterStore.setGlobalParameter('scaleMultiplier', undefined)

    rotateLatitudeLocked.value = true
  }

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

  return {
    selectedProjection,
    compositeProjection,
    referenceScale,
    canvasDimensions,
    scalePreservation,
    rotateLatitudeLocked,
    autoFitDomain,

    projectionSelection,

    customRotateLongitude,
    customRotateLatitude,
    customCenterLongitude,
    customCenterLatitude,
    customParallel1,
    customParallel2,
    customScale,

    setSelectedProjection,
    setCompositeProjection,
    setScalePreservation,
    setRotateLatitudeLocked,
    setAutoFitDomain,
    setReferenceScale,
    setCanvasDimensions,

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
