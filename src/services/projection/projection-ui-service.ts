import type { ViewMode } from '@/types'

import { projectionRegistry } from '@/core/projections/registry'
import { ViewModeSelection } from '@/core/view'

interface ProjectionGroupOptions {
  value: string
  label: string
  category?: string
}

export interface ProjectionGroup {
  category: string
  options?: ProjectionGroupOptions[]
}

export class ProjectionUIService {
  static getProjectionGroups(viewMode: ViewMode): ProjectionGroup[] {
    const filteredProjections = projectionRegistry.filter({
      viewMode,
      excludeCategories: ['COMPOSITE'],
    })

    const groups: { [key: string]: ProjectionGroupOptions[] } = {}

    filteredProjections.forEach((projection) => {
      const category = projection.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category]!.push({
        value: projection.id,
        label: projection.name,
        category: projection.category,
      })
    })

    return Object.keys(groups).map(category => ({
      category,
      options: groups[category],
    }))
  }

  static getProjectionRecommendations(
    recommended: readonly string[] | undefined,
    viewMode: ViewMode,
  ) {
    return projectionRegistry.recommend({
      recommended,
      viewMode,
      excludeCategories: ['COMPOSITE'],
    })
  }

  static shouldShowProjectionSelector(
    viewMode: ViewMode,
    hasViewPreset = false,
  ): boolean {
    const selection = new ViewModeSelection(viewMode)

    if (hasViewPreset && !selection.isCustomComposite()) {
      return false
    }

    return selection.isUnified()
  }

  static shouldShowIndividualProjectionSelectors(
    viewMode: ViewMode,
  ): boolean {
    const selection = new ViewModeSelection(viewMode)
    return selection.isSplit() || selection.isCustomComposite()
  }
}
