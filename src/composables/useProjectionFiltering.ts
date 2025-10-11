import type { Ref } from 'vue'

import { computed, ref, toValue } from 'vue'
import { useI18n } from 'vue-i18n'
import { projectionRegistry } from '@/core/projections/registry'

interface ProjectionOption {
  value: string
  label: string
  category?: string
}

interface ProjectionGroup {
  category: string
  options?: ProjectionOption[]
}

/**
 * Composable for filtering projection groups based on search query
 * Supports searching by label, ID, category, family, and preservation properties
 */
export function useProjectionFiltering(
  projectionGroups: Ref<ProjectionGroup[]> | ProjectionGroup[],
) {
  const { t } = useI18n()
  const searchQuery = ref('')
  const isSearching = ref(false)

  const filteredProjectionGroups = computed(() => {
    const groups = toValue(projectionGroups)

    if (!searchQuery.value.trim()) {
      return groups
    }

    const query = searchQuery.value.toLowerCase().trim()

    return groups
      .map(group => ({
        ...group,
        options: group.options?.filter((option) => {
          // Search by label (translated)
          const label = t(option.label).toLowerCase()
          if (label.includes(query))
            return true

          // Search by projection ID
          if (option.value.toLowerCase().includes(query))
            return true

          // Search by category
          if (group.category.toLowerCase().includes(query))
            return true

          // Search by projection properties (if available)
          const projection = projectionRegistry.get(option.value)
          if (projection) {
            // Search by family
            if (projection.family.toLowerCase().includes(query))
              return true

            // Search by preservation properties
            if (projection.capabilities.preserves.some(prop => prop.toLowerCase().includes(query)))
              return true
          }

          return false
        }),
      }))
      .filter(group => group.options && group.options.length > 0)
  })

  function toggleSearch() {
    isSearching.value = !isSearching.value
    if (!isSearching.value) {
      searchQuery.value = ''
    }
  }

  function clearSearch() {
    searchQuery.value = ''
  }

  return {
    searchQuery,
    isSearching,
    filteredProjectionGroups,
    toggleSearch,
    clearSearch,
  }
}
