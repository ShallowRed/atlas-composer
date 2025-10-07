import { geoConicConformalEurope, geoConicConformalFrance, geoConicConformalPortugal } from 'd3-composite-projections'
import * as d3GeoProjection from 'd3-geo-projection'

import { FRANCE_PROJECTION_PARAMS } from '@/constants/france-territories'

export interface ProjectionOption {
  value: string
  label: string
  category: string
}

export const PROJECTION_OPTIONS: ProjectionOption[] = [
  // Projections Composites (avec régions d'outre-mer intégrées)
  { value: 'conic-conformal-france', label: 'Conic Conformal France (Composite)', category: 'Projections Composites France' },
  { value: 'conic-conformal-portugal', label: 'Conic Conformal Portugal (Composite)', category: 'Projections Composites Portugal' },
  { value: 'conic-conformal-europe', label: 'Conic Conformal Europe (Composite)', category: 'Projections Composites Europe' },

  // Recommandées pour la France
  { value: 'albers', label: 'Albers (Conic Equal Area)', category: 'Recommandées pour la France' },
  { value: 'conic-conformal', label: 'Conic Conformal', category: 'Recommandées pour la France' },
  { value: 'conic-equal-area', label: 'Conic Equal Area', category: 'Recommandées pour la France' },
  { value: 'conic-equidistant', label: 'Conic Equidistant', category: 'Recommandées pour la France' },
  { value: 'bonne', label: 'Bonne (Pseudoconique)', category: 'Recommandées pour la France' },

  // Projections Azimutales
  { value: 'azimuthal-equal-area', label: 'Azimuthal Equal Area', category: 'Projections Azimutales' },
  { value: 'azimuthal-equidistant', label: 'Azimuthal Equidistant', category: 'Projections Azimutales' },
  { value: 'orthographic', label: 'Orthographic', category: 'Projections Azimutales' },
  { value: 'stereographic', label: 'Stereographic', category: 'Projections Azimutales' },
  { value: 'gnomonic', label: 'Gnomonic', category: 'Projections Azimutales' },

  // Projections Cylindriques
  { value: 'mercator', label: 'Mercator', category: 'Projections Cylindriques' },
  { value: 'transverse-mercator', label: 'Transverse Mercator', category: 'Projections Cylindriques' },
  { value: 'equirectangular', label: 'Equirectangular (Plate Carrée)', category: 'Projections Cylindriques' },
  { value: 'miller', label: 'Miller Cylindrical', category: 'Projections Cylindriques' },

  // Projections Mondiales Équivalentes
  { value: 'equal-earth', label: 'Equal Earth', category: 'Projections Mondiales' },
  { value: 'mollweide', label: 'Mollweide', category: 'Projections Mondiales' },
  { value: 'sinusoidal', label: 'Sinusoidal', category: 'Projections Mondiales' },

  // Projections de Compromis
  { value: 'robinson', label: 'Robinson', category: 'Projections de Compromis' },
  { value: 'winkel3', label: 'Winkel Tripel', category: 'Projections de Compromis' },
  // { value: 'natural-earth', label: 'Natural Earth', category: 'Pseudocylindriques' }, // Temporarily disabled due to import issue

  // Projections Historiques/Artistiques
  { value: 'aitoff', label: 'Aitoff', category: 'Projections Artistiques' },
  { value: 'hammer', label: 'Hammer', category: 'Projections Artistiques' },
  { value: 'bertin1953', label: 'Bertin 1953 (Français)', category: 'Projections Artistiques' },

  // Projections Polyédriques
  { value: 'polyhedral-waterman', label: 'Polyhedral Waterman (Butterfly)', category: 'Projections Polyédriques' },
]

export class GeoProjectionService {
  getProjection(type: string, data: any) {
    const albers = {
      type: 'conic-equal-area' as const,
      parallels: FRANCE_PROJECTION_PARAMS.parallels.conic,
      rotate: FRANCE_PROJECTION_PARAMS.rotate.mainland,
      domain: data,
    }

    switch (type) {
      // Composite projections (with integrated overseas territories)
      case 'conic-conformal-france':
        return {
          type: () => geoConicConformalFrance(),
          domain: data,
        }
      case 'conic-conformal-portugal':
        return {
          type: () => geoConicConformalPortugal(),
          domain: data,
        }
      case 'conic-conformal-europe':
        return {
          type: () => geoConicConformalEurope(),
          domain: data,
        }

      // Azimuthal projections
      case 'azimuthal-equal-area':
        return {
          type: 'azimuthal-equal-area' as const,
          rotate: FRANCE_PROJECTION_PARAMS.rotate.azimuthal,
          domain: data,
        }
      case 'azimuthal-equidistant':
        return {
          type: 'azimuthal-equidistant' as const,
          rotate: FRANCE_PROJECTION_PARAMS.rotate.azimuthal,
          domain: data,
        }
      case 'orthographic':
        return {
          type: 'orthographic' as const,
          rotate: FRANCE_PROJECTION_PARAMS.rotate.azimuthal,
          domain: data,
        }
      case 'stereographic':
        return {
          type: 'stereographic' as const,
          rotate: FRANCE_PROJECTION_PARAMS.rotate.azimuthal,
          domain: data,
        }
      case 'gnomonic':
        return {
          type: 'gnomonic' as const,
          rotate: FRANCE_PROJECTION_PARAMS.rotate.azimuthal,
          domain: data,
        }

      // Conic projections (optimisées pour la France)
      case 'albers':
        return albers
      case 'conic-equal-area':
        return {
          type: 'conic-equal-area' as const,
          parallels: FRANCE_PROJECTION_PARAMS.parallels.conic,
          rotate: FRANCE_PROJECTION_PARAMS.rotate.mainland,
          domain: data,
        }
      case 'conic-conformal':
        return {
          type: 'conic-conformal' as const,
          parallels: FRANCE_PROJECTION_PARAMS.parallels.conic,
          rotate: FRANCE_PROJECTION_PARAMS.rotate.mainland,
          domain: data,
        }
      case 'conic-equidistant':
        return {
          type: 'conic-equidistant' as const,
          parallels: FRANCE_PROJECTION_PARAMS.parallels.conic,
          rotate: FRANCE_PROJECTION_PARAMS.rotate.mainland,
          domain: data,
        }

      // Cylindrical projections
      case 'mercator':
        return {
          type: 'mercator' as const,
          domain: data,
        }
      case 'transverse-mercator':
        return {
          type: 'transverse-mercator' as const,
          domain: data,
        }
      case 'equirectangular':
        return {
          type: 'equirectangular' as const,
          domain: data,
        }

      // World projections (built-in)
      case 'equal-earth':
        return {
          type: 'equal-earth' as const,
          domain: data,
        }

      // Extended projections from d3-geo-projection
      case 'bonne':
        return {
          type: () => d3GeoProjection.geoBonne()
            .parallel(45), // 45° standard parallel for France region
          domain: data,
        }
      case 'miller':
        return {
          type: () => d3GeoProjection.geoMiller(),
          domain: data,
        }
      case 'mollweide':
        return {
          type: () => d3GeoProjection.geoMollweide(),
          domain: data,
        }
      case 'sinusoidal':
        return {
          type: () => d3GeoProjection.geoSinusoidal(),
          domain: data,
        }
      case 'robinson':
        return {
          type: () => d3GeoProjection.geoRobinson(),
          domain: data,
        }
      case 'winkel3':
        return {
          type: () => d3GeoProjection.geoWinkel3(),
          domain: data,
        }
      // case 'natural-earth1':
      //   return {
      //     type: () => d3GeoProjection.geoNaturalEarth1(),
      //     domain: data
      //   }
      case 'aitoff':
        return {
          type: () => d3GeoProjection.geoAitoff(),
          domain: data,
        }
      case 'hammer':
        return {
          type: () => d3GeoProjection.geoHammer(),
          domain: data,
        }
      case 'bertin1953':
        return {
          type: () => d3GeoProjection.geoBertin1953(),
          domain: data,
        }
      case 'polyhedral-waterman':
        return {
          type: () => d3GeoProjection.geoPolyhedralWaterman(),
          domain: data,
        }

      default:
        return albers
    }
  }
}
