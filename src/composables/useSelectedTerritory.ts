import { computed, ref } from 'vue'
import { useTerritoryData } from '@/composables/useTerritoryData'
import { useViewState } from '@/composables/useViewState'

const selectedTerritoryCode = ref<string | null>(null)

export function useSelectedTerritory() {
  const { isCompositeCustomMode, isSplitMode } = useViewState()
  const { territories } = useTerritoryData()

  const hasTerritoryList = computed(() => isCompositeCustomMode.value || isSplitMode.value)

  const selectedTerritory = computed(() => hasTerritoryList.value
    ? territories.value.find(({ code }) => code === selectedTerritoryCode.value) ?? null
    : null)

  const hasSelectedTerritory = computed(() => selectedTerritory.value !== null)

  function selectTerritory(territoryCode: string) {
    if (hasTerritoryList.value && territories.value.some(({ code }) => code === territoryCode)) {
      selectedTerritoryCode.value = territoryCode
    }
  }

  function clearSelection() {
    selectedTerritoryCode.value = null
  }

  return { selectedTerritory, hasSelectedTerritory, selectTerritory, clearSelection }
}
