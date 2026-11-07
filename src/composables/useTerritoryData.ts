import type { Translation } from '@/types'
import type { ProjectionId, TerritoryCode } from '@/types/branded'
import { computed } from 'vue'
import { useGeoDataStore } from '@/stores/geoData'
import { useParameterStore } from '@/stores/parameters'

export function useTerritoryData() {
  const geoDataStore = useGeoDataStore()
  const parameterStore = useParameterStore()

  const territories = computed(() => geoDataStore.filteredTerritories.map(t => ({ code: t.code, name: t.name })))

  const translations = computed(() => Object.fromEntries(
    territories.value.map(t => [t.code, parameterStore.getTerritoryTranslation(t.code)]),
  ) as Record<TerritoryCode, Translation>)

  const scales = computed(() => Object.fromEntries(
    territories.value.map(t => [t.code, parameterStore.getTerritoryParameters(t.code).scaleMultiplier ?? 1.0]),
  ) as Record<TerritoryCode, number>)

  const projections = computed(() => Object.fromEntries(
    territories.value.flatMap((t) => {
      const projectionId = parameterStore.getTerritoryProjection(t.code)
      return projectionId ? [[t.code, projectionId]] : []
    }),
  ) as Record<TerritoryCode, ProjectionId>)

  return { territories, translations, scales, projections }
}
