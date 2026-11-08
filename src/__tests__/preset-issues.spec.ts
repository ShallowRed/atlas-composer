import type { Preset } from '@/core/presets'
import type { PresetIssue } from '@/core/types/errors'
import type { Result } from '@/core/types/result'
import type { AtlasConfig } from '@/types'
import { describe, expect, it } from 'vitest'
import { readPresetFiles } from '@/__tests__/test-utils'
import { validateCompositePreset, validateViewPreset } from '@/core/presets/validator'
import { PresetValidationService } from '@/services/validation/preset-validation-service'

interface IssueCase<C extends PresetIssue['code']> {
  run: () => PresetIssue[]
  expected: PresetIssue & { code: C }
}

function issuesOf(result: Result<unknown, PresetIssue[]>): PresetIssue[] {
  return result.ok ? [] : result.error
}

function compositeIssues(alter: (preset: any) => void): PresetIssue[] {
  const preset = JSON.parse(readPresetFiles().find(({ id }) => id === 'france-standard')!.json)
  alter(preset)
  return issuesOf(validateCompositePreset(preset))
}

function viewIssues(viewMode: unknown, config: unknown, fields: object = {}): PresetIssue[] {
  return issuesOf(validateViewPreset({ id: 'preset', name: 'Preset', atlasId: 'france', viewMode, config, ...fields } as any))
}

function unifiedIssues(parameters: unknown): PresetIssue[] {
  return viewIssues('unified', { projection: { id: 'mercator', parameters } })
}

const NO_TERRITORY = { territory: null }

const CASES = {
  PRESET_SCHEMA_INVALID_TYPE: {
    run: () => compositeIssues((preset) => { preset.referenceScale = 'large' }),
    expected: { code: 'PRESET_SCHEMA_INVALID_TYPE', path: 'referenceScale' },
  },
  PRESET_SCHEMA_MISSING_FIELD: {
    run: () => compositeIssues((preset) => { delete preset.territories }),
    expected: { code: 'PRESET_SCHEMA_MISSING_FIELD', path: 'territories' },
  },
  PRESET_SCHEMA_INVALID_VALUE: {
    run: () => compositeIssues((preset) => { preset.territories[1].code = preset.territories[0].code }),
    expected: { code: 'PRESET_SCHEMA_INVALID_VALUE', path: 'territories[1].code' },
  },
  PRESET_SCHEMA_VERSION_UNSUPPORTED: {
    run: () => compositeIssues((preset) => { preset.version = 'x' }),
    expected: { code: 'PRESET_SCHEMA_VERSION_UNSUPPORTED', path: 'version' },
  },
  PRESET_FIELD_MISSING: {
    run: () => viewIssues(undefined, {}),
    expected: { code: 'PRESET_FIELD_MISSING', field: 'viewMode' },
  },
  PRESET_ATLAS_ID_INVALID: {
    run: () => viewIssues('unified', {}, { atlasId: 42 }),
    expected: { code: 'PRESET_ATLAS_ID_INVALID' },
  },
  PRESET_VIEW_MODE_INVALID: {
    run: () => viewIssues('globe', {}),
    expected: { code: 'PRESET_VIEW_MODE_INVALID', viewMode: 'globe' },
  },
  PRESET_TYPE_NOT_SUPPORTED: {
    run: () => {
      const preset = { id: 'preset', type: 'split', config: {} } as Preset
      const result = PresetValidationService.validatePreset(preset, { id: 'world' } as AtlasConfig)
      return !result.ok && result.error.code === 'PRESET_INVALID' ? result.error.issues : []
    },
    expected: { code: 'PRESET_TYPE_NOT_SUPPORTED', presetType: 'split', atlasId: 'world' },
  },
  PRESET_PARAMETER_REQUIRED: {
    run: () => compositeIssues((preset) => { delete preset.territories[0].projection.parameters.parallels }),
    expected: { code: 'PRESET_PARAMETER_REQUIRED', territory: 'FR-MET', parameter: 'parallels' },
  },
  PRESET_POSITIONING_REQUIRED: {
    run: () => compositeIssues((preset) => {
      delete preset.territories[0].projection.parameters.rotate
      delete preset.territories[0].projection.parameters.center
    }),
    expected: { code: 'PRESET_POSITIONING_REQUIRED', territory: 'FR-MET' },
  },
  PRESET_PROJECTION_MISSING: {
    run: () => viewIssues('unified', {}),
    expected: { code: 'PRESET_PROJECTION_MISSING' },
  },
  PRESET_TERRITORIES_MISSING: {
    run: () => viewIssues('split', {}),
    expected: { code: 'PRESET_TERRITORIES_MISSING' },
  },
  PRESET_COMPOSITE_PROJECTION_MISSING: {
    run: () => viewIssues('built-in-composite', {}),
    expected: { code: 'PRESET_COMPOSITE_PROJECTION_MISSING' },
  },
  PRESET_GLOBAL_SCALE_NOT_NUMBER: {
    run: () => viewIssues('built-in-composite', { projectionId: 'albersusa', globalScale: 'large' }),
    expected: { code: 'PRESET_GLOBAL_SCALE_NOT_NUMBER' },
  },
  PRESET_GLOBAL_SCALE_NOT_POSITIVE: {
    run: () => viewIssues('built-in-composite', { projectionId: 'albersusa', globalScale: 0 }),
    expected: { code: 'PRESET_GLOBAL_SCALE_NOT_POSITIVE' },
  },
  PRESET_PROJECTION_ID_INVALID: {
    run: () => viewIssues('split', { territories: { 'FR-MET': { projection: { id: '' } } } }),
    expected: { code: 'PRESET_PROJECTION_ID_INVALID', territory: 'FR-MET' },
  },
  PRESET_PROJECTION_UNKNOWN: {
    run: () => viewIssues('unified', { projection: { id: 'flat-earth' } }),
    expected: { code: 'PRESET_PROJECTION_UNKNOWN', ...NO_TERRITORY, projectionId: 'flat-earth' },
  },
  PRESET_PARAMETERS_NOT_OBJECT: {
    run: () => unifiedIssues('none'),
    expected: { code: 'PRESET_PARAMETERS_NOT_OBJECT', ...NO_TERRITORY },
  },
  PRESET_PARAMETER_NOT_NUMBER: {
    run: () => unifiedIssues({ scaleMultiplier: 'large' }),
    expected: { code: 'PRESET_PARAMETER_NOT_NUMBER', ...NO_TERRITORY, parameter: 'scaleMultiplier', actualType: 'string' },
  },
  PRESET_PARAMETER_NOT_ARRAY: {
    run: () => unifiedIssues({ rotate: 5 }),
    expected: { code: 'PRESET_PARAMETER_NOT_ARRAY', ...NO_TERRITORY, parameter: 'rotate', actualType: 'number' },
  },
  PRESET_PARAMETER_WRONG_LENGTH: {
    run: () => unifiedIssues({ rotate: [1] }),
    expected: { code: 'PRESET_PARAMETER_WRONG_LENGTH', ...NO_TERRITORY, parameter: 'rotate', expected: 3 },
  },
  PRESET_PARAMETER_TOO_SMALL: {
    run: () => unifiedIssues({ scaleMultiplier: 0 }),
    expected: { code: 'PRESET_PARAMETER_TOO_SMALL', ...NO_TERRITORY, parameter: 'scaleMultiplier', min: 0.01 },
  },
  PRESET_PARAMETER_TOO_LARGE: {
    run: () => unifiedIssues({ scaleMultiplier: 11 }),
    expected: { code: 'PRESET_PARAMETER_TOO_LARGE', ...NO_TERRITORY, parameter: 'scaleMultiplier', max: 10 },
  },
} satisfies { [C in PresetIssue['code']]: IssueCase<C> }

describe('preset issues', () => {
  it.each(Object.values(CASES))('$expected.code is produced by its rule', ({ run, expected }) => {
    expect(run()).toContainEqual(expected)
  })
})
