import type { D3Rotate } from '@/core/positioning'
import type { ProjectionId } from '@/types'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getDisplayedRotate } from '@/core/positioning'
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

  function setSelectedProjection(projection: ProjectionId): void {
    selectedProjection.value = projection
    debug('Projection selected: %s', projection)
  }

  function setRotateLatitudeLocked(locked: boolean): void {
    rotateLatitudeLocked.value = locked
  }

  function setAutoFitDomain(value: boolean): void {
    autoFitDomain.value = value
  }

  function setCustomRotate(rotate: Partial<Record<'longitude' | 'latitude' | 'gamma', number>>): void {
    const [longitude, latitude, gamma] = getDisplayedRotate(parameterStore.globalEffectiveParameters, 'global')
    parameterStore.setGlobalParameters({
      rotate: [rotate.longitude ?? longitude, rotate.latitude ?? latitude, rotate.gamma ?? gamma],
      center: undefined,
    })
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

  return {
    selectedProjection,
    compositeProjection,
    referenceScale,
    canvasDimensions,
    scalePreservation,
    rotateLatitudeLocked,
    autoFitDomain,

    customRotate,
    customParallel1,
    customParallel2,

    setSelectedProjection,
    setRotateLatitudeLocked,
    setAutoFitDomain,

    setCustomRotate,
  }
})
