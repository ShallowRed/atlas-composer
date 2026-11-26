import type { Arrangement, ScaleMode } from '@/core/territories/proposal'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ARRANGEMENTS, SCALE_MODES } from '@/core/territories/proposal'

const ARRANGEMENT_ICONS: Record<Arrangement, string> = {
  'insets-right': 'ri-layout-right-line',
  'insets-bottom': 'ri-layout-bottom-line',
}

// The options of the arrangement and of the scale of a proposal, with their labels in the locale
export function useProposalOptions() {
  const { t } = useI18n()

  const arrangementOptions = computed(() => ARRANGEMENTS.map(value => ({
    value,
    label: t(`proposal.arrangements.${value}`),
    icon: ARRANGEMENT_ICONS[value],
  })))

  const scaleModeOptions = computed(() => SCALE_MODES.map((value: ScaleMode) => ({
    value,
    label: t(`proposal.scaleModes.${value}`),
  })))

  return { arrangementOptions, scaleModeOptions }
}
