import type { ViewMode } from '@/types/composite'

const VIEW_MODE_DISPLAY: Record<ViewMode, { icon: string, labelKey: string }> = {
  'composite-custom': { icon: 'ri-drag-move-2-line', labelKey: 'mode.compositeCustom' },
  'split': { icon: 'ri-layout-grid-2-fill', labelKey: 'mode.split' },
  'built-in-composite': { icon: 'ri-layout-4-line', labelKey: 'mode.compositeExisting' },
  'unified': { icon: 'ri-globe-line', labelKey: 'mode.unified' },
}

// The order in which every screen lists the view modes
export const VIEW_MODES = Object.keys(VIEW_MODE_DISPLAY) as ViewMode[]

export function getViewModeIcon(viewMode: ViewMode): string {
  return VIEW_MODE_DISPLAY[viewMode].icon
}

export function getViewModeLabelKey(viewMode: ViewMode): string {
  return VIEW_MODE_DISPLAY[viewMode].labelKey
}
