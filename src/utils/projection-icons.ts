import type { ProjectionCategoryType } from '@/core/projections/types'

import { ProjectionCategory } from '@/core/projections/types'

const PROJECTION_CATEGORY_ICONS: Record<ProjectionCategoryType, string> = {
  [ProjectionCategory.COMPOSITE]: 'ri-stack-line',
  [ProjectionCategory.CONIC]: 'ri-triangle-line',
  [ProjectionCategory.CYLINDRICAL]: 'ri-rectangle-line',
  [ProjectionCategory.AZIMUTHAL]: 'ri-record-circle-line',
  [ProjectionCategory.WORLD]: 'ri-global-line',
  [ProjectionCategory.COMPROMISE]: 'ri-scales-3-line',
  [ProjectionCategory.ARTISTIC]: 'ri-palette-line',
}

export function getCategoryIcon(category: ProjectionCategoryType): string {
  return PROJECTION_CATEGORY_ICONS[category] || 'ri-map-2-line'
}
