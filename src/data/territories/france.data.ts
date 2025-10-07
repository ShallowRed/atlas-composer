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
 */
export const OVERSEAS_TERRITORIES: TerritoryConfig[] = [
  // Caribbean - Left side
  {
    code: 'FR-MF',
    name: 'Saint-Martin',
    region: 'Caraïbes',
    center: [-63.082, 18.067],
    offset: [-450, -50],
    bounds: [[-63.15, 18.04], [-63.0, 18.13]],
    clipExtent: { x1: -0.14, y1: -0.052, x2: -0.0996, y2: -0.032 },
  },
  {
    code: 'FR-GP',
    name: 'Guadeloupe',
    region: 'Caraïbes',
    center: [-61.551, 16.265],
    offset: [-450, 50],
    bounds: [[-61.81, 15.83], [-61.0, 16.52]],
    clipExtent: { x1: -0.14, y1: -0.032, x2: -0.0996, y2: 0 },
  },
  {
    code: 'FR-MQ',
    name: 'Martinique',
    region: 'Caraïbes',
    center: [-61.024, 14.642],
    offset: [-450, 150],
    bounds: [[-61.23, 14.39], [-60.81, 14.88]],
    clipExtent: { x1: -0.14, y1: 0, x2: -0.0996, y2: 0.029 },
  },
  {
    code: 'FR-GF',
    name: 'Guyane',
    shortName: 'Guyane Française',
    region: 'Caraïbes',
    center: [-53.1, 3.9],
    offset: [-300, 180],
    bounds: [[-54.6, 2.1], [-51.6, 5.8]],
    clipExtent: { x1: -0.14, y1: 0.029, x2: -0.0996, y2: 0.0864 },
  },

  // North Atlantic
  {
    code: 'FR-PM',
    name: 'Saint-Pierre-et-Miquelon',
    region: 'Atlantique Nord',
    center: [-56.327, 46.885],
    offset: [-200, -200],
    bounds: [[-56.42, 46.75], [-56.13, 47.15]],
    clipExtent: { x1: -0.14, y1: -0.076, x2: -0.0996, y2: -0.052 },
  },

  // Indian Ocean - Right side
  {
    code: 'FR-YT',
    name: 'Mayotte',
    region: 'Océan Indien',
    center: [45.166, -12.827],
    offset: [350, -50],
    bounds: [[44.98, -13.0], [45.3, -12.64]],
    clipExtent: { x1: 0.0967, y1: -0.076, x2: 0.1371, y2: -0.052 },
  },
  {
    code: 'FR-RE',
    name: 'La Réunion',
    region: 'Océan Indien',
    center: [55.536, -21.115],
    offset: [-250, 0],
    bounds: [[55.22, -21.39], [55.84, -20.87]],
    clipExtent: { x1: 0.0967, y1: -0.052, x2: 0.1371, y2: -0.02 },
  },
  {
    code: 'FR-TF',
    name: 'Terres australes et antarctiques françaises',
    shortName: 'TAAF',
    region: 'Océan Indien',
    center: [69.348, -49.280],
    offset: [350, 250],
    bounds: [[39.0, -50.0], [77.0, -37.0]],
    clipExtent: { x1: 0.0967, y1: -0.09, x2: 0.1371, y2: -0.076 },
  },

  // Pacific - Far right
  {
    code: 'FR-NC',
    name: 'Nouvelle-Calédonie',
    region: 'Océan Pacifique',
    center: [165.618, -20.904],
    offset: [550, -100],
    bounds: [[163.0, -22.7], [168.0, -19.5]],
    clipExtent: { x1: 0.0967, y1: -0.02, x2: 0.1371, y2: 0.012 },
  },
  {
    code: 'FR-WF',
    name: 'Wallis-et-Futuna',
    region: 'Océan Pacifique',
    center: [-176.176, -13.768],
    offset: [550, 50],
    bounds: [[-178.2, -14.4], [-176.1, -13.2]],
    clipExtent: { x1: 0.0967, y1: 0.012, x2: 0.1371, y2: 0.033 },
  },
  {
    code: 'FR-PF',
    name: 'Polynésie française',
    region: 'Océan Pacifique',
    center: [-149.566, -17.679],
    offset: [550, 180],
    bounds: [[-154, -28], [-134, -7]],
    clipExtent: { x1: 0.0967, y1: 0.033, x2: 0.1371, y2: 0.0864 },
  },

  // Saint-Barthélemy
  {
    code: 'FR-BL',
    name: 'Saint-Barthélemy',
    region: 'Caraïbes',
    center: [-62.85, 17.90],
    offset: [-450, -150],
    bounds: [[-62.88, 17.87], [-62.79, 17.97]],
    clipExtent: { x1: -0.14, y1: -0.08, x2: -0.0996, y2: -0.06 },
  },
]

/**
 * All French territories (mainland + overseas)
 */
export const ALL_TERRITORIES: TerritoryConfig[] = [
  MAINLAND_FRANCE,
  ...OVERSEAS_TERRITORIES,
]
