/**
 * View Mode Icon Utilities
 * Maps view modes to Remix icons
 */

import type { ViewMode } from '@/types/composite'

const VIEW_MODE_ICONS: Record<ViewMode, string> = {
  'composite-custom': 'ri-drag-move-2-line',
  'built-in-composite': 'ri-layout-4-line',
  'split': 'ri-layout-grid-2-fill',
  'unified': 'ri-globe-line',
}

/**
 * Get remix icon for a view mode
 */
export function getViewModeIcon(viewMode: ViewMode): string {
  return VIEW_MODE_ICONS[viewMode] || 'ri-layout-grid-line'
}
