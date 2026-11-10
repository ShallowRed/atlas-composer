import type { CompositionState } from '@/core/presets'
import type { TerritoryCode } from '@/types'
import type { ProjectionParameters } from '@/types/projection-parameters'

import { DEFAULT_REFERENCE_SCALE } from '@atlas-composer/specification'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { areParametersEqual, parameterRegistry } from '@/core/parameters'
import { DEFAULT_CANVAS_DIMENSIONS } from '@/core/projections/defaults'
import { referenceParameters, RESET_KEYS } from '@/core/territories/territory-reset-service'

type Canvas = NonNullable<CompositionState['canvas']>

export const usePresetDefaultsStore = defineStore('presetDefaults', () => {
  const presetParameters = ref<Record<string, ProjectionParameters>>({})
  const presetGlobalParameters = ref<ProjectionParameters | null>(null)
  const presetCanvas = ref<Canvas | null>(null)

  function storePresetDefaults(parameters: Record<string, ProjectionParameters>) {
    presetParameters.value = { ...parameters }
  }

  function storeGlobalParameters(parameters: ProjectionParameters | null) {
    presetGlobalParameters.value = parameters ? { ...parameters } : null
  }

  function storePresetCanvas(canvas: Canvas | null) {
    presetCanvas.value = canvas ? { referenceScale: canvas.referenceScale, dimensions: { ...canvas.dimensions } } : null
  }

  function clearAll() {
    presetParameters.value = {}
    presetGlobalParameters.value = null
    presetCanvas.value = null
  }

  function referenceCanvas(): Canvas {
    return presetCanvas.value ?? { referenceScale: DEFAULT_REFERENCE_SCALE, dimensions: DEFAULT_CANVAS_DIMENSIONS }
  }

  function canvasDiffersFromPreset(canvas: Canvas): boolean {
    const reference = referenceCanvas()
    return canvas.referenceScale !== reference.referenceScale
      || canvas.dimensions.width !== reference.dimensions.width
      || canvas.dimensions.height !== reference.dimensions.height
  }

  function territoryDiffersFromPreset(territoryCode: TerritoryCode, territoryParameters: ProjectionParameters): boolean {
    const reference = referenceParameters(presetParameters.value[territoryCode])
    const current: ProjectionParameters = { ...territoryParameters }
    for (const key of RESET_KEYS) {
      if (current[key] === undefined) {
        Object.assign(current, { [key]: parameterRegistry.getDefaultValue(key) })
      }
    }
    return !areParametersEqual(current, reference)
  }

  function territoriesDifferFromPreset(
    parametersByCode: Record<string, ProjectionParameters>,
    activeCodes: ReadonlySet<TerritoryCode>,
    compareActiveSet: boolean,
  ): boolean {
    const presetCodes = Object.keys(presetParameters.value) as TerritoryCode[]
    if (compareActiveSet && presetCodes.length > 0
      && (presetCodes.length !== activeCodes.size || presetCodes.some(code => !activeCodes.has(code)))) {
      return true
    }
    return Object.entries(parametersByCode)
      .some(([code, parameters]) => territoryDiffersFromPreset(code as TerritoryCode, parameters))
  }

  function globalDiffersFromPreset(effectiveGlobalParameters: ProjectionParameters): boolean {
    return !areParametersEqual(effectiveGlobalParameters, presetGlobalParameters.value ?? {})
  }

  return {
    presetParameters,
    presetGlobalParameters,
    presetCanvas,
    storePresetDefaults,
    storeGlobalParameters,
    storePresetCanvas,
    clearAll,
    referenceCanvas,
    territoryDiffersFromPreset,
    territoriesDifferFromPreset,
    globalDiffersFromPreset,
    canvasDiffersFromPreset,
  }
})
