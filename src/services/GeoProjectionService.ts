import { geoConicConformalFrance } from 'd3-composite-projections'
import * as d3GeoProjection from 'd3-geo-projection'

export interface ProjectionOption {
  value: string
  label: string
  category: string
}

export const PROJECTION_OPTIONS: ProjectionOption[] = [
  // Projections Composites France (DOM-TOM inclus)
  { value: 'albers-france', label: 'Albers France (Composite DOM-TOM)', category: 'Projections Composites France' },
  { value: 'conic-conformal-france', label: 'Conic Conformal France (Composite)', category: 'Projections Composites France' },

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
      parallels: [44, 49] as [number, number], // Parallèles standards pour la France
      rotate: [-2, 0] as [number, number], // Longitude centrale de la France
      domain: data,
    }

    switch (type) {
      case 'conic-conformal-france':
        return {
          type: () => geoConicConformalFrance(),
          domain: data,
        }

      // Azimuthal projections
      case 'azimuthal-equal-area':
        return {
          type: 'azimuthal-equal-area' as const,
          rotate: [-2, -46.5] as [number, number], // Centré sur la France
          domain: data,
        }
      case 'azimuthal-equidistant':
        return {
          type: 'azimuthal-equidistant' as const,
          rotate: [-2, -46.5] as [number, number],
          domain: data,
        }
      case 'orthographic':
        return {
          type: 'orthographic' as const,
          rotate: [-2, -46.5] as [number, number], // Vue de la France depuis l'espace
          domain: data,
        }
      case 'stereographic':
        return {
          type: 'stereographic' as const,
          rotate: [-2, -46.5] as [number, number],
          domain: data,
        }
      case 'gnomonic':
        return {
          type: 'gnomonic' as const,
          rotate: [-2, -46.5] as [number, number],
          domain: data,
        }

      // Conic projections (optimisées pour la France)
      case 'albers':
        return albers
      case 'conic-equal-area':
        return {
          type: 'conic-equal-area' as const,
          parallels: [44, 49] as [number, number],
          rotate: [-2, 0] as [number, number],
          domain: data,
        }
      case 'conic-conformal':
        return {
          type: 'conic-conformal' as const,
          parallels: [44, 49] as [number, number], // Parallèles standards pour la France
          rotate: [-2, 0] as [number, number], // Longitude centrale de la France
          domain: data,
        }
      case 'conic-equidistant':
        return {
          type: 'conic-equidistant' as const,
          parallels: [44, 49] as [number, number],
          rotate: [-2, 0] as [number, number],
          domain: data,
        }

      // Cylindrical projections
      case 'mercator':
        return { type: 'mercator' as const, domain: data }
      case 'transverse-mercator':
        return { type: 'transverse-mercator' as const, domain: data }
      case 'equirectangular':
        return { type: 'equirectangular' as const, domain: data }

      // World projections (built-in)
      case 'equal-earth':
        return { type: 'equal-earth' as const, domain: data }

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

  /**
   * Configuration des insets pour la projection composite France
   * Inspiré de la projection albers-usa
   */
  getFranceCompositeInsets() {
    return {
      // Position de la France métropolitaine (référence)
      metropole: {
        scale: 1.0,
        translate: [0, 0], // Position de référence
        bounds: [[-5, 42], [9, 51]], // Limites géographiques de la métropole
      },

      // Insets pour les DOM-TOM (positions relatives à la métropole)
      domtom: {
        'FR-GF': { // Guyane française
          scale: 1, // 60% de la taille
          translate: [-8, -2], // Position à droite de la métropole
          originalBounds: [[-54.6, 2.1], [-51.6, 5.8]],
        },
        'FR-RE': { // La Réunion
          scale: 1,
          translate: [-10, 3], // En bas à droite
          originalBounds: [[55.2, -21.4], [55.9, -20.8]],
        },
        'FR-GP': { // Guadeloupe
          scale: 1,
          translate: [-8, 1], // À gauche
          originalBounds: [[-61.8, 15.8], [-61.0, 16.6]],
        },
        'FR-MQ': { // Martinique
          scale: 1,
          translate: [-8.5, 2.5], // À gauche, décalé
          originalBounds: [[-61.2, 14.4], [-60.8, 14.9]],
        },
        'FR-YT': { // Mayotte
          scale: 1,
          translate: [-2, -5], // En bas
          originalBounds: [[45.0, -13.0], [45.3, -12.6]],
        },
        'FR-MF': { // Saint-Martin
          scale: 1,
          translate: [-1, -5], // Petit inset en bas à gauche
          originalBounds: [[-63.2, 18.0], [-62.8, 18.1]],
        },
        'FR-PF': { // Polynésie française
          scale: 1,
          translate: [-1, -5], // À droite
          originalBounds: [[-154, -28], [-134, -8]],
        },
        'FR-NC': { // Nouvelle-Calédonie
          scale: 1,
          translate: [8, 4], // En bas à droite
          originalBounds: [[163, -23], [168, -19]],
        },
        'FR-TF': { // Terres australes françaises
          scale: 1,
          translate: [2, 6], // En bas au centre
          originalBounds: [[68, -50], [78, -37]],
        },
        'FR-WF': { // Wallis-et-Futuna
          scale: 1,
          translate: [12, 3], // Petit inset à droite
          originalBounds: [[-178, -14.5], [-176, -13]],
        },
        'FR-PM': { // Saint-Pierre-et-Miquelon
          scale: 1,
          translate: [-2, 6], // En bas
          originalBounds: [[-56.4, 46.7], [-56.1, 47.1]],
        },
      },
    }
  }
}
