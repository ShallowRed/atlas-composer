/**
 * View Mode Icon Utilities
 * Maps view modes to Remix icons
 */

import type { ViewMode } from '@/types/composite'

const VIEW_MODE_ICONS: Record<ViewMode, string> = {
  'composite-custom': 'ri-layout-grid-line',
  'composite-existing': 'ri-layout-4-line',
  'split': 'ri-layout-row-line',
  'unified': 'ri-map-2-line',
}

/**
 * Get remix icon for a view mode
 */
export function getViewModeIcon(viewMode: ViewMode): string {
  return VIEW_MODE_ICONS[viewMode] || 'ri-layout-grid-line'
}
