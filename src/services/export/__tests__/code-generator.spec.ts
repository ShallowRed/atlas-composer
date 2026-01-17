import type { ExportedCompositeConfig } from '@/types/export-config'
import { describe, expect, it } from 'vitest'

import { CodeGenerator } from '../code-generator'

describe('codeGenerator', () => {
  const generator = new CodeGenerator()

  const singleFocusConfig: ExportedCompositeConfig = {
    version: '1.0',
    metadata: {
      atlasId: 'france',
      atlasName: 'France',
      exportDate: '2025-10-10T10:00:00.000Z',
      createdWith: 'Atlas composer v1.0',
    },
    referenceScale: 2700,
    territories: [
      {
        code: 'FR-MET',
        name: 'France Metropolitaine',
        projection: {
          id: 'conic-conformal',
          family: 'conic',
          parameters: {
            center: [2.5, 46.5],
            rotate: [-3, -46.2, 0],
            parallels: [0, 60],
            scale: 2700,
            baseScale: 2700,
            scaleMultiplier: 1.0,
          },
        },
        layout: {
          translateOffset: [0, 0],
        },
        bounds: [
          [-5, 41],
          [10, 51],
        ],
      },
      {
        code: 'FR-GP',
        name: 'Guadeloupe',
        projection: {
          id: 'mercator',
          family: 'cylindrical',
          parameters: {
            center: [-61.46, 16.14],
            scale: 3240,
            baseScale: 3240,
            scaleMultiplier: 1.0,
          },
        },
        layout: {
          translateOffset: [100, -50],
        },
        bounds: [
          [-61.81, 15.83],
          [-61, 16.52],
        ],
      },
    ],
  }

  const equalMembersConfig: ExportedCompositeConfig = {
    version: '1.0',
    metadata: {
      atlasId: 'portugal',
      atlasName: 'Portugal',
      exportDate: '2025-10-10T10:00:00.000Z',
      createdWith: 'Atlas composer v1.0',
    },
    referenceScale: 5400,
    territories: [
      {
        code: 'PT-MAIN',
        name: 'Portugal Continental',
        projection: {
          id: 'conic-conformal',
          family: 'conic',
          parameters: {
            center: [-8, 39.5],
            rotate: [8, -39.5, 0],
            parallels: [0, 60],
            scale: 5400,
            baseScale: 5400,
            scaleMultiplier: 1.0,
          },
        },
        layout: {
          translateOffset: [0, 0],
        },
        bounds: [
          [-10, 37],
          [-6, 42],
        ],
      },
      {
        code: 'PT-MAD',
        name: 'Madeira',
        projection: {
          id: 'mercator',
          family: 'cylindrical',
          parameters: {
            center: [-16.9, 32.7],
            scale: 6480,
            baseScale: 6480,
            scaleMultiplier: 1.0,
          },
        },
        layout: {
          translateOffset: [-100, 150],
        },
        bounds: [
          [-17.3, 32.4],
          [-16.5, 33],
        ],
      },
    ],
  }

  describe('generate', () => {
    it('should generate D3 JavaScript code', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('Composite Projection for France')
      expect(code).toContain('import { geoConicConformal, geoMercator }')
      expect(code).toContain('export function createFranceProjection()')
      expect(code).toContain('registerProjection')
      expect(code).toContain('loadCompositeProjection')
      expect(code).toContain('"id": "conic-conformal"')
      expect(code).toContain('2.5')
      expect(code).toContain('46.5')
      expect(code).toContain('-3')
      expect(code).toContain('2700')
    })

    it('should generate D3 TypeScript code', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'typescript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('type ProjectionLike')
      expect(code).toContain(': ProjectionLike')
      expect(code).toContain('export function createFranceProjection(): ProjectionLike')
    })

    it('should generate Observable Plot code', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'plot',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('Observable Plot')
      expect(code).toContain('import * as Plot from "@observablehq/plot"')
      expect(code).toContain('loadCompositeProjection')
      expect(code).toContain('registerProjection')
      expect(code).toContain('export function createFranceProjection()')
    })

    it('should include usage examples when requested', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: true,
      })

      expect(code).toContain('Usage Example')
      expect(code).toContain('const projection = createFranceProjection()')
      expect(code).toContain('const path = d3.geoPath(projection)')
    })

    it('should handle multiple territories', () => {
      const code = generator.generate(equalMembersConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('Composite Projection for Portugal')
      expect(code).toContain('loadCompositeProjection')
      expect(code).toContain('registerProjection')
      expect(code).toContain('"id": "conic-conformal"')
      expect(code).toContain('"id": "mercator"')
    })

    it('should throw error for unsupported format', () => {
      expect(() =>
        generator.generate(singleFocusConfig, {
          format: 'unsupported' as never,
          language: 'javascript',
          includeComments: true,
          includeExamples: false,
        }),
      ).toThrow('Unsupported format')
    })
  })

  describe('d3 JavaScript generation', () => {
    it('should include header with metadata', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('/**')
      expect(code).toContain('Composite Projection for France')
      expect(code).toContain('Generated by Atlas composer v1.0')
      expect(code).toContain('Territories: France Metropolitaine, Guadeloupe')
      expect(code).toContain('Language: JavaScript')
    })

    it('should import required D3 projections', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('import { geoConicConformal, geoMercator } from \'d3-geo\'')
    })

    it('should import from projection-loader package', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('@atlas-composer/projection-loader')
      expect(code).toContain('loadCompositeProjection')
      expect(code).toContain('registerProjection')
    })

    it('should create projection function with correct name', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('export function createFranceProjection()')
    })

    it('should create territory projections', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('"name": "France Metropolitaine"')
      expect(code).toContain('"id": "conic-conformal"')
      expect(code).toContain('"id": "mercator"')
    })

    it('should configure projection parameters correctly', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('2.5')
      expect(code).toContain('46.5')
      expect(code).toContain('-3')
      expect(code).toContain('2700')
    })

    it('should use loadCompositeProjection from loader package', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('loadCompositeProjection(config, {')
      expect(code).toContain('width: 800,')
      expect(code).toContain('height: 600')
      expect(code).toContain('return projection')
    })
  })

  describe('d3 TypeScript generation', () => {
    it('should include type imports', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'typescript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('import { geoConicConformal, geoMercator } from \'d3-geo\'')
      expect(code).toContain('type ProjectionLike')
    })

    it('should import loader package with types', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'typescript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('@atlas-composer/projection-loader')
      expect(code).toContain('loadCompositeProjection')
      expect(code).toContain('registerProjection')
      expect(code).toContain('type ProjectionLike')
    })

    it('should add return type to function', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'typescript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('export function createFranceProjection(): ProjectionLike')
    })

    it('should include header with TypeScript language', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'typescript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('Language: TypeScript')
    })
  })

  describe('observable Plot generation', () => {
    it('should import Plot and d3', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'plot',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('import * as Plot from "@observablehq/plot"')
      expect(code).toContain('import * as d3 from "d3"')
    })

    it('should import from projection-loader package', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'plot',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('@atlas-composer/projection-loader')
      expect(code).toContain('loadCompositeProjection')
      expect(code).toContain('registerProjection')
    })

    it('should import d3 as namespace', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'plot',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('import * as d3 from "d3"')
      expect(code).toContain('geoConicConformal()')
    })

    it('should include Plot usage example when requested', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'plot',
        language: 'javascript',
        includeComments: true,
        includeExamples: true,
      })

      expect(code).toContain('Usage Example with Observable Plot')
      expect(code).toContain('Plot.plot({')
      expect(code).toContain('projection: projectionFn,')
      expect(code).toContain('Plot.geo(countries')
    })
  })

  describe('projection mapping', () => {
    it('should correctly map conic projections', () => {
      const territory = singleFocusConfig.territories[0]!
      const config: ExportedCompositeConfig = {
        ...singleFocusConfig,
        territories: [
          {
            ...territory,
            projection: {
              ...territory.projection,
              id: 'conic-equal-area',
            },
          },
        ],
      }

      const code = generator.generate(config, {
        format: 'd3',
        language: 'javascript',
        includeComments: false,
        includeExamples: false,
      })

      expect(code).toContain('geoConicEqualArea')
    })

    it('should correctly map cylindrical projections', () => {
      const territory = singleFocusConfig.territories[0]!
      const config: ExportedCompositeConfig = {
        ...singleFocusConfig,
        territories: [
          {
            ...territory,
            projection: {
              ...territory.projection,
              id: 'transverse-mercator',
            },
          },
        ],
      }

      const code = generator.generate(config, {
        format: 'd3',
        language: 'javascript',
        includeComments: false,
        includeExamples: false,
      })

      expect(code).toContain('geoTransverseMercator')
    })

    it('should correctly map azimuthal projections', () => {
      const territory = singleFocusConfig.territories[0]!
      const config: ExportedCompositeConfig = {
        ...singleFocusConfig,
        territories: [
          {
            ...territory,
            projection: {
              ...territory.projection,
              id: 'azimuthal-equal-area',
            },
          },
        ],
      }

      const code = generator.generate(config, {
        format: 'd3',
        language: 'javascript',
        includeComments: false,
        includeExamples: false,
      })

      expect(code).toContain('geoAzimuthalEqualArea')
    })
  })

  describe('function naming', () => {
    it('should convert kebab-case atlas ID to PascalCase', () => {
      const config: ExportedCompositeConfig = {
        ...singleFocusConfig,
        metadata: {
          ...singleFocusConfig.metadata,
          atlasId: 'united-states',
        },
      }

      const code = generator.generate(config, {
        format: 'd3',
        language: 'javascript',
        includeComments: false,
        includeExamples: false,
      })

      expect(code).toContain('export function createUnitedStatesProjection()')
    })

    it('should handle single-word atlas IDs', () => {
      const config: ExportedCompositeConfig = {
        ...singleFocusConfig,
        metadata: {
          ...singleFocusConfig.metadata,
          atlasId: 'portugal',
        },
      }

      const code = generator.generate(config, {
        format: 'd3',
        language: 'javascript',
        includeComments: false,
        includeExamples: false,
      })

      expect(code).toContain('export function createPortugalProjection()')
    })
  })

  describe('comments and documentation', () => {
    it('should include comments when option is enabled', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('// Step 1: Register projections')
      expect(code).toContain('// Step 2: Define the composite projection configuration')
      expect(code).toContain('// Step 3: Load the composite projection')
    })

    it('should include notes from metadata if present', () => {
      const config: ExportedCompositeConfig = {
        ...singleFocusConfig,
        metadata: {
          ...singleFocusConfig.metadata,
          notes: 'Custom projection for special use case',
        },
      }

      const code = generator.generate(config, {
        format: 'd3',
        language: 'javascript',
        includeComments: true,
        includeExamples: false,
      })

      expect(code).toContain('Custom projection for special use case')
    })
  })

  describe('package exports validation', () => {
    it('should import only exported functions from projection-loader', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: false,
        includeExamples: false,
      })

      // Check that generated code imports functions that are actually exported
      expect(code).toContain('import { loadCompositeProjection, registerProjection }')
      expect(code).toContain('@atlas-composer/projection-loader')

      // Ensure we're not importing non-existent functions
      expect(code).not.toContain('import { createProjection }')
      expect(code).not.toContain('import { buildComposite }')
    })

    it('should import type exports in TypeScript mode', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'typescript',
        includeComments: false,
        includeExamples: false,
      })

      // TypeScript should import ProjectionLike type
      expect(code).toContain('type ProjectionLike')
      expect(code).toContain('@atlas-composer/projection-loader')
    })

    it('should use correct D3 projection functions that exist', () => {
      const code = generator.generate(singleFocusConfig, {
        format: 'd3',
        language: 'javascript',
        includeComments: false,
        includeExamples: false,
      })

      // Check that D3 functions are imported from correct package
      expect(code).toContain('from \'d3-geo\'')

      // Should include the projections used in config
      expect(code).toContain('geoConicConformal')
      expect(code).toContain('geoMercator')
    })
  })
})
