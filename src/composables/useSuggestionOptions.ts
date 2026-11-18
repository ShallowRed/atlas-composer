import type { SuggestedArrangement, SuggestedScaleMode } from '@/core/territories/suggested-composition'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const ARRANGEMENTS: SuggestedArrangement[] = ['insets-right', 'insets-bottom']
const SCALE_MODES: SuggestedScaleMode[] = ['readable', 'uniform']

export function useSuggestionOptions() {
  const { t } = useI18n()

  const arrangementOptions = computed(() => ARRANGEMENTS.map(value => ({
    value,
    label: t(`suggestion.arrangements.${value}`),
    icon: value === 'insets-right' ? 'ri-layout-right-line' : 'ri-layout-bottom-line',
  })))

  const scaleModeOptions = computed(() => SCALE_MODES.map(value => ({
    value,
    label: t(`suggestion.scaleModes.${value}`),
  })))

  return { arrangementOptions, scaleModeOptions }
}
