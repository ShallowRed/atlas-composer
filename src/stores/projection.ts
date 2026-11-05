import type { D3Rotate } from '@/core/positioning'
import type { ProjectionId } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getDisplayedRotate } from '@/core/positioning'
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

  function setCustomRotate(rotate: Partial<Record<'longitude' | 'latitude' | 'gamma', number>>): void {
    const [longitude, latitude, gamma] = getDisplayedRotate(parameterStore.globalEffectiveParameters, 'global')
    parameterStore.setGlobalParameters({
      rotate: [rotate.longitude ?? longitude, rotate.latitude ?? latitude, rotate.gamma ?? gamma],
      center: undefined,
    })
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

  function setCustomParallel1(value: number | null): void {
    const currentParallel2 = parameterStore.globalParameters.parallels?.[1] ?? null
    setCustomParallels(value, currentParallel2)
  }

  function setCustomParallel2(value: number | null): void {
    const currentParallel1 = parameterStore.globalParameters.parallels?.[0] ?? null
    setCustomParallels(currentParallel1, value)
  }

  function resetProjectionParams(_currentViewPreset: string | null): void {
    parameterStore.setGlobalParameters({ rotate: undefined, center: undefined })
    parameterStore.setGlobalParameter('parallels', undefined)
    parameterStore.setGlobalParameter('scale', undefined)
    parameterStore.setGlobalParameter('scaleMultiplier', undefined)

    rotateLatitudeLocked.value = true
  }

  const customRotate = computed<D3Rotate | null>(() => {
    const { rotate, center } = parameterStore.globalParameters
    return rotate || center ? getDisplayedRotate({ rotate, center }, 'global') : null
  })

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

    customRotate,
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
    setCustomParallels,
    setCustomScale,
    setCustomParallel1,
    setCustomParallel2,
    resetProjectionParams,
  }
})
