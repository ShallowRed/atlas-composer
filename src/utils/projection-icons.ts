import type { ProjectionCategoryType } from '@/core/projections/types'

import { ProjectionCategory } from '@/core/projections/types'

export const PROJECTION_CATEGORY_ICONS: Record<ProjectionCategoryType, string> = {
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

export const PROJECTION_PROPERTY_ICONS = {
  area: 'ri-square-line',
  angle: 'ri-compass-3-line',
  distance: 'ri-ruler-line',
  direction: 'ri-navigation-line',
  interrupted: 'ri-scissors-cut-line',
} as const

export function getPropertyIcon(property: keyof typeof PROJECTION_PROPERTY_ICONS): string {
  return PROJECTION_PROPERTY_ICONS[property] || 'ri-checkbox-circle-line'
}
