import type { ViewMode } from './composite'

export interface MapRendererProps {
  geoData?: GeoJSON.FeatureCollection | null
  title?: string
  area?: number
  region?: string
  preserveScale?: boolean
  width?: number
  height?: number
  projection?: string
  mode?: 'simple' | 'composite'
}

export const mapRendererDefaults: Required<Omit<MapRendererProps, 'geoData' | 'title' | 'area' | 'region' | 'projection'>> = {
  preserveScale: false,
  width: 200,
  height: 160,
  mode: 'simple',
}

export interface ViewComponentProps {
  viewMode: ViewMode
  showSkeleton?: boolean
}

export interface TerritoryControlsProps {
  territoryCode: string
  territoryName: string
}

export interface ProjectionSelectorProps {
  modelValue: string
  projections: string[]
  disabled?: boolean
  placeholder?: string
  label?: string
}

export interface ProjectionSelectorEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

export interface DisplayOptionsSectionProps {
  show?: boolean
}
