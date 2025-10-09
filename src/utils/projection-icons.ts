import type { ProjectionCategoryType } from '@/core/projections/types'

import { ProjectionCategory } from '@/core/projections/types'

/**
 * Map of projection categories to Remix Icon class names
 */
export const PROJECTION_CATEGORY_ICONS: Record<ProjectionCategoryType, string> = {
  [ProjectionCategory.COMPOSITE]: 'ri-stack-line',
  [ProjectionCategory.CONIC]: 'ri-triangle-line',
  [ProjectionCategory.CYLINDRICAL]: 'ri-rectangle-line',
  [ProjectionCategory.AZIMUTHAL]: 'ri-record-circle-line',
  [ProjectionCategory.WORLD]: 'ri-global-line',
  [ProjectionCategory.COMPROMISE]: 'ri-scales-3-line',
  [ProjectionCategory.ARTISTIC]: 'ri-palette-line',
}

/**
 * Get icon class name for a projection category
 * @param category - Projection category
 * @returns Remix Icon class name
 */
export function getCategoryIcon(category: ProjectionCategoryType): string {
  return PROJECTION_CATEGORY_ICONS[category] || 'ri-map-2-line'
}

/**
 * Map of projection properties to Remix Icon class names
 */
export const PROJECTION_PROPERTY_ICONS = {
  area: 'ri-square-line',
  angle: 'ri-compass-3-line',
  distance: 'ri-ruler-line',
  direction: 'ri-navigation-line',
  interrupted: 'ri-scissors-cut-line',
} as const

/**
 * Get icon class name for a projection property
 * @param property - Projection property name
 * @returns Remix Icon class name
 */
export function getPropertyIcon(property: keyof typeof PROJECTION_PROPERTY_ICONS): string {
  return PROJECTION_PROPERTY_ICONS[property] || 'ri-checkbox-circle-line'
}
