/**
 * Example: Using Generated Projection from Atlas composer
 *
 * This example demonstrates how to use code generated from Atlas composer
 * with the @atlas-composer/projection-loader package.
 *
 * The generated code follows this pattern:
 * 1. Import D3 projection functions
 * 2. Import loader functions from @atlas-composer/projection-loader
 * 3. Register projections
 * 4. Load composite projection with configuration
 */

// Step 1: Import D3 projection functions
import { geoConicConformal, geoMercator } from 'd3-geo'
import { geoPath } from 'd3-geo'

// Step 2: Import loader functions
import { loadCompositeProjection, registerProjection } from '@atlas-composer/projection-loader'

/**
 * Create France composite projection
 * This is what Atlas composer generates when you export your custom configuration
 */
export function createFranceProjection() {
  // Step 3: Register projections used in this configuration
  registerProjection('conic-conformal', () => geoConicConformal())
  registerProjection('mercator', () => geoMercator())

  // Step 4: Embedded configuration (generated from Atlas composer)
  const config = {
    version: '1.0',
    metadata: {
      atlasId: 'france',
      atlasName: 'France',
      exportDate: '2025-10-12T09:00:00.000Z',
      createdWith: 'Atlas composer v1.0',
    },
    pattern: 'single-focus',
    referenceScale: 2700,
    territories: [
      {
        code: 'FR-MET',
        name: 'France Métropolitaine',
        role: 'primary',
        projectionId: 'conic-conformal',
        projectionFamily: 'conic',
        parameters: {
          center: [2.5, 46.5],
          rotate: [-3, -46.2, 0],
          parallels: [0, 60],
          scale: 2700,
          baseScale: 2700,
          scaleMultiplier: 1.0,
        },
        layout: {
          translateOffset: [0, 0],
          clipExtent: null,
        },
        bounds: [
          [-5, 41],
          [10, 51],
        ],
      },
      {
        code: 'FR-GP',
        name: 'Guadeloupe',
        role: 'secondary',
        projectionId: 'mercator',
        projectionFamily: 'cylindrical',
        parameters: {
          center: [-61.46, 16.14],
          scale: 3240,
          baseScale: 3240,
          scaleMultiplier: 1.0,
        },
        layout: {
          translateOffset: [100, -50],
          clipExtent: null,
        },
        bounds: [
          [-61.81, 15.83],
          [-61, 16.52],
        ],
      },
    ],
  }

  // Step 5: Load composite projection
  return loadCompositeProjection(config, {
    width: 800,
    height: 600,
  })
}

/**
 * Usage Example
 * 
 * Use the generated projection with D3:
 */
function usageExample() {
  // Create the composite projection
  const projection = createFranceProjection()

  // Use with D3 geoPath
  const path = geoPath(projection)

  // Example: Render GeoJSON features
  // svg.selectAll('path')
  //   .data(features)
  //   .join('path')
  //   .attr('d', path)
  //   .attr('fill', 'lightgray')
  //   .attr('stroke', 'white')

  console.log('Projection created successfully!')
  console.log('Projection center:', projection.center())
  console.log('Projection scale:', projection.scale())

  // Test projection by converting a coordinate
  const paris = [2.3522, 48.8566] // Paris coordinates
  const projected = projection(paris)
  console.log('Paris projected:', projected)
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  usageExample()
}
