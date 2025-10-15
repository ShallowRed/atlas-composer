import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import { getViewModeIcon } from '@/utils/view-mode-icons'

/**
 * Provides view state flags and card UI helpers
 * Simplifies template conditionals without duplicating store logic
 *
 * IMPORTANT: Does NOT re-implement configStore.show* properties
 * Use configStore.showProjectionSelector, showIndividualProjectionSelectors, etc. directly
 */
export function useViewState() {
  const { t } = useI18n()
  const configStore = useConfigStore()

  // View Mode Flags - Simple boolean wrappers for readability
  const isCompositeMode = computed(() =>
    configStore.viewMode === 'composite-custom' || configStore.viewMode === 'composite-existing',
  )

  const isCompositeCustomMode = computed(() =>
    configStore.viewMode === 'composite-custom',
  )

  const isCompositeExistingMode = computed(() =>
    configStore.viewMode === 'composite-existing',
  )

  const isSplitMode = computed(() =>
    configStore.viewMode === 'split',
  )

  const isUnifiedMode = computed(() =>
    configStore.viewMode === 'unified',
  )

  // Card UI Helpers
  /**
   * Get card title based on current view mode
   */
  const cardTitle = computed(() => {
    switch (configStore.viewMode) {
      case 'split':
        return t('mode.split')
      case 'composite-existing':
        return t('mode.compositeExisting')
      case 'composite-custom':
        return t('mode.compositeCustom')
      case 'unified':
        return t('mode.unified')
      default:
        return t('mode.compositeCustom')
    }
  })

  /**
   * Get card icon based on current view mode
   */
  const cardIcon = computed(() =>
    getViewModeIcon(configStore.viewMode),
  )

  /**
   * Determine if right sidebar should be shown
   * Complex compound condition extracted from template
   */
  const shouldShowRightSidebar = computed(() =>
    configStore.viewMode === 'unified'
    || configStore.viewMode === 'composite-existing'
    || (configStore.viewMode === 'split' && !configStore.showIndividualProjectionSelectors)
    || configStore.showProjectionSelector
    || configStore.showIndividualProjectionSelectors,
  )

  /**
   * Determine which controls to show in right sidebar
   */
  const shouldShowProjectionParams = computed(() =>
    configStore.viewMode === 'unified'
    || configStore.viewMode === 'composite-existing'
    || (configStore.viewMode === 'split' && !configStore.showIndividualProjectionSelectors)
    || configStore.showProjectionSelector,
  )

  const shouldShowTerritoryControls = computed(() =>
    configStore.showIndividualProjectionSelectors || configStore.viewMode === 'composite-custom',
  )

  return {
    // View mode flags
    isCompositeMode,
    isCompositeCustomMode,
    isCompositeExistingMode,
    isSplitMode,
    isUnifiedMode,

    // Card UI helpers
    cardTitle,
    cardIcon,

    // Compound conditions
    shouldShowRightSidebar,
    shouldShowProjectionParams,
    shouldShowTerritoryControls,
  }
}
