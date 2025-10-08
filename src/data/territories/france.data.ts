/**
 * French Territory Data
 * Pure territory definitions with NO logic, NO UI concerns, NO utility functions
 *
 * This file contains ONLY geographic data for French territories.
 * All configuration, modes, groups, and operations are handled elsewhere.
 */

import type { TerritoryConfig } from '@/types/territory'

/**
 * Mainland France (France Métropolitaine)
 */
export const MAINLAND_FRANCE: TerritoryConfig = {
  code: 'FR-MET',
  name: 'France Métropolitaine',
  shortName: 'Métropole',
  center: [2.5, 46.5],
  offset: [80, 0],
  bounds: [[-5, 41], [10, 51]],
  projectionType: 'conic-conformal',
  rotate: [-3, 0],
  parallels: [45.898889, 47.696014],
}

/**
 * Overseas territories (Départements et Collectivités d'Outre-Mer)
 *
 * baseScaleMultiplier: Scale multiplier relative to mainland for geographic proportionality
 * - Values match d3-composite-projections for proper visual composition
 * - 1.0 = same scale as mainland (true geographic proportions)
 * - <1.0 = smaller than mainland (for large territories)
 * - >1.0 = larger than mainland (for better visibility of small territories)
 */
export const OVERSEAS_TERRITORIES: TerritoryConfig[] = [
  // Caribbean - Left side (x ≈ -336)
  {
    code: 'FR-MF',
    name: 'Saint-Martin',
    region: 'Caraïbes',
    center: [-63.082, 18.067], // Custom center (NOT in d3-composite-projections - only Saint-Barthélemy is)
    offset: [-336, -123], // From d3-composite-projections positioning
    bounds: [[-63.15, 18.04], [-63.0, 18.13]],
    clipExtent: { x1: -0.14, y1: -0.052, x2: -0.0996, y2: -0.032 },
    baseScaleMultiplier: 5.0, // From d3-composite-projections (same as Saint-Barthélemy)
  },
  {
    code: 'FR-GP',
    name: 'Guadeloupe',
    region: 'Caraïbes',
    center: [-61.46, 16.14], // From d3-composite-projections (exact center)
    offset: [-336, -39], // From d3-composite-projections positioning
    bounds: [[-61.81, 15.83], [-61.0, 16.52]],
    clipExtent: { x1: -0.14, y1: -0.032, x2: -0.0996, y2: 0 },
    baseScaleMultiplier: 1.4, // From d3-composite-projections
  },
  {
    code: 'FR-MQ',
    name: 'Martinique',
    region: 'Caraïbes',
    center: [-61.03, 14.67], // From d3-composite-projections (exact center)
    offset: [-336, 36], // From d3-composite-projections positioning
    bounds: [[-61.23, 14.39], [-60.81, 14.88]],
    clipExtent: { x1: -0.14, y1: 0, x2: -0.0996, y2: 0.029 },
    baseScaleMultiplier: 1.6, // From d3-composite-projections
  },
  {
    code: 'FR-GF',
    name: 'Guyane',
    shortName: 'Guyane Française',
    region: 'Caraïbes',
    center: [-53.2, 3.9], // From d3-composite-projections (exact center)
    offset: [-336, 161], // From d3-composite-projections positioning
    bounds: [[-54.6, 2.1], [-51.6, 5.8]],
    clipExtent: { x1: -0.14, y1: 0.029, x2: -0.0996, y2: 0.0864 },
    baseScaleMultiplier: 0.6, // From d3-composite-projections
  },

  // North Atlantic - Left side (x ≈ -336)
  {
    code: 'FR-PM',
    name: 'Saint-Pierre-et-Miquelon',
    region: 'Atlantique Nord',
    center: [-56.23, 46.93], // From d3-composite-projections (exact center)
    offset: [-336, -182], // From d3-composite-projections positioning
    bounds: [[-56.42, 46.75], [-56.13, 47.15]],
    clipExtent: { x1: -0.14, y1: -0.076, x2: -0.0996, y2: -0.052 },
    baseScaleMultiplier: 1.3, // From d3-composite-projections
  },

  // Indian Ocean - Right side (x ≈ +325)
  {
    code: 'FR-YT',
    name: 'Mayotte',
    region: 'Océan Indien',
    center: [45.16, -12.8], // From d3-composite-projections (exact center)
    offset: [328, -179], // From d3-composite-projections positioning
    bounds: [[44.98, -13.0], [45.3, -12.64]],
    clipExtent: { x1: 0.0967, y1: -0.076, x2: 0.1371, y2: -0.052 },
    baseScaleMultiplier: 1.6, // From d3-composite-projections
  },
  {
    code: 'FR-RE',
    name: 'La Réunion',
    region: 'Océan Indien',
    center: [55.52, -21.13], // From d3-composite-projections (exact center)
    offset: [325, -99], // From d3-composite-projections positioning
    bounds: [[55.22, -21.39], [55.84, -20.87]],
    clipExtent: { x1: 0.0967, y1: -0.052, x2: 0.1371, y2: -0.02 },
    baseScaleMultiplier: 1.2, // From d3-composite-projections
  },
  {
    code: 'FR-TF',
    name: 'Terres australes et antarctiques françaises',
    shortName: 'TAAF',
    region: 'Océan Indien',
    center: [69.348, -49.280],
    offset: [328, 126], // Estimated position (not in d3-composite-projections)
    bounds: [[39.0, -50.0], [77.0, -37.0]],
    clipExtent: { x1: 0.0967, y1: -0.09, x2: 0.1371, y2: -0.076 },
    baseScaleMultiplier: 0.1, // NOT in d3-cp - much smaller scale to avoid overwhelming the map
  },

  // Pacific - Right side (x ≈ +325)
  {
    code: 'FR-NC',
    name: 'Nouvelle-Calédonie',
    region: 'Océan Pacifique',
    center: [165.8, -21.07], // From d3-composite-projections (exact center)
    offset: [325, -13], // From d3-composite-projections positioning
    bounds: [[163.0, -22.7], [168.0, -19.5]],
    clipExtent: { x1: 0.0967, y1: -0.02, x2: 0.1371, y2: 0.012 },
    baseScaleMultiplier: 0.3, // From d3-composite-projections
  },
  {
    code: 'FR-WF',
    name: 'Wallis-et-Futuna',
    region: 'Océan Pacifique',
    center: [-178.1, -14.3], // From d3-composite-projections (fixed!)
    offset: [325, 62], // From d3-composite-projections positioning
    bounds: [[-178.2, -14.4], [-176.1, -13.2]],
    clipExtent: { x1: 0.0967, y1: 0.012, x2: 0.1371, y2: 0.033 },
    baseScaleMultiplier: 2.7, // From d3-composite-projections
  },
  {
    code: 'FR-PF-2',
    name: 'Polynésie française (îles éloignées)',
    shortName: 'Marquises, Tuamotu',
    region: 'Océan Pacifique',
    center: [-150.55, -17.11], // From d3-composite-projections (same as main Polynésie)
    offset: [308, 126], // From d3-composite-projections positioning (y + 0.045 * k)
    bounds: [[-154, -28], [-134, -7]], // Same bounds as main Polynésie
    clipExtent: { x1: 0.0967, y1: 0.033, x2: 0.1371, y2: 0.06 }, // Remote islands
    baseScaleMultiplier: 0.06, // From d3-composite-projections (polynesie2 - much smaller scale)
    // NOTE: This is the second projection for Polynésie française (polynesie2)
    // Covers Marquesas, Tuamotu, Gambier, and Austral Islands
    // Positioned between Wallis-et-Futuna and main Polynésie
  },
  {
    code: 'FR-PF',
    name: 'Polynésie française',
    shortName: 'Îles de la Société',
    region: 'Océan Pacifique',
    center: [-150.55, -17.11], // From d3-composite-projections (exact center)
    offset: [322, 210], // From d3-composite-projections positioning (y + 0.075 * k)
    bounds: [[-154, -28], [-134, -7]],
    clipExtent: { x1: 0.0967, y1: 0.06, x2: 0.1371, y2: 0.0864 }, // Main islands (Society Islands)
    baseScaleMultiplier: 0.5, // From d3-composite-projections (polynesie - main islands)
    // NOTE: This is the first/main projection for Polynésie française (polynesie)
    // Covers the Society Islands (Tahiti, Moorea, Bora Bora, etc.)
    // See FR-PF-2 above for remote islands
  },

  // Saint-Barthélemy - Left side (x ≈ -336)
  {
    code: 'FR-BL',
    name: 'Saint-Barthélemy',
    region: 'Caraïbes',
    center: [-62.85, 17.92], // From d3-composite-projections (exact center)
    offset: [-336, -123], // From d3-composite-projections positioning
    bounds: [[-62.88, 17.87], [-62.79, 17.97]],
    clipExtent: { x1: -0.14, y1: -0.08, x2: -0.0996, y2: -0.06 },
    baseScaleMultiplier: 5.0, // From d3-composite-projections
    // WARNING: NOT in Natural Earth 50m or 10m data (too small, ~21 km²)
    // May not render unless separate high-resolution data is provided
  },
]

/**
 * All French territories (mainland + overseas)
 */
export const ALL_TERRITORIES: TerritoryConfig[] = [
  MAINLAND_FRANCE,
  ...OVERSEAS_TERRITORIES,
]
