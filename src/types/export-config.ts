import type { ProjectionParameters } from './projection-parameters'

export interface ExportedProjectionParameters extends ProjectionParameters {
}

export interface ExportedTerritoryLayout {
  translateOffset: [number, number]
  pixelClipExtent?: [number, number, number, number] | null
}

export interface ExportedTerritory {
  code: string
  name: string
  projection: {
    id: string
    family: string
    parameters: ExportedProjectionParameters
  }
  layout: ExportedTerritoryLayout
  bounds: [[number, number], [number, number]]
}

export interface ExportMetadata {
  atlasId: string
  atlasName: string
  exportDate: string
  createdWith: string
  notes?: string
}

export type ConfigVersion = '1.0'

export interface CanvasDimensions {
  width: number
  height: number
}

export interface BaseExportedConfig {
  version: ConfigVersion
  metadata: ExportMetadata
  referenceScale?: number
  canvasDimensions?: CanvasDimensions
  territories: ExportedTerritory[]
}

export interface ExportedCompositeConfigV1 extends BaseExportedConfig {
  version: '1.0'
}

export type ExportedCompositeConfig = ExportedCompositeConfigV1
export type AnyVersionConfig = ExportedCompositeConfigV1

export interface ExportValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface MigrationResult {
  success: boolean
  config?: ExportedCompositeConfig
  fromVersion: ConfigVersion
  toVersion: ConfigVersion
  messages: string[]
  errors: string[]
  warnings: string[]
}

export interface CodeGenerationOptions {
  language: 'javascript' | 'typescript'
  format: 'd3' | 'plot'
  includeComments: boolean
  includeExamples?: boolean
  moduleFormat?: 'esm' | 'cjs' | 'umd'
}
