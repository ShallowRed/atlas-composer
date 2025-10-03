export class GeoProjectionService {

  getProjection(type: string, data: any) {
    const albers = {
      type: 'conic-conformal' as const,
      parallels: [44, 49] as [number, number], // Parallèles standards pour la France
      rotate: [-2, 0] as [number, number], // Longitude centrale de la France
      domain: data
    }
    switch (type) {
      case 'albers':
        return albers
      case 'mercator':
        return {
          type: 'mercator' as const,
          domain: data
        }
      case 'natural-earth':
        return {
          type: 'equal-earth' as const,
          domain: data
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
        bounds: [[-5, 42], [9, 51]] // Limites géographiques de la métropole
      },

      // Insets pour les DOM-TOM (positions relatives à la métropole)
      domtom: {
        'FR-GF': { // Guyane française
          scale: 1, // 60% de la taille
          translate: [-8, -2], // Position à droite de la métropole
          originalBounds: [[-54.6, 2.1], [-51.6, 5.8]]
        },
        'FR-RE': { // La Réunion
          scale: 1,
          translate: [-10, 3], // En bas à droite
          originalBounds: [[55.2, -21.4], [55.9, -20.8]]
        },
        'FR-GP': { // Guadeloupe
          scale: 1,
          translate: [-8, 1], // À gauche
          originalBounds: [[-61.8, 15.8], [-61.0, 16.6]]
        },
        'FR-MQ': { // Martinique
          scale: 1,
          translate: [-8.5, 2.5], // À gauche, décalé
          originalBounds: [[-61.2, 14.4], [-60.8, 14.9]]
        },
        'FR-YT': { // Mayotte
          scale: 1,
          translate: [-2, -5], // En bas
          originalBounds: [[45.0, -13.0], [45.3, -12.6]]
        },
        'FR-MF': { // Saint-Martin
          scale: 1,
          translate: [-1, -5], // Petit inset en bas à gauche
          originalBounds: [[-63.2, 18.0], [-62.8, 18.1]]
        },
        'FR-PF': { // Polynésie française
          scale: 1,
          translate: [-1, -5], // À droite
          originalBounds: [[-154, -28], [-134, -8]]
        },
        'FR-NC': { // Nouvelle-Calédonie
          scale: 1,
          translate: [8, 4], // En bas à droite
          originalBounds: [[163, -23], [168, -19]]
        },
        'FR-TF': { // Terres australes françaises
          scale: 1,
          translate: [2, 6], // En bas au centre
          originalBounds: [[68, -50], [78, -37]]
        },
        'FR-WF': { // Wallis-et-Futuna
          scale: 1,
          translate: [12, 3], // Petit inset à droite
          originalBounds: [[-178, -14.5], [-176, -13]]
        },
        'FR-PM': { // Saint-Pierre-et-Miquelon
          scale: 1,
          translate: [-2, 6], // En bas
          originalBounds: [[-56.4, 46.7], [-56.1, 47.1]]
        }
      }
    }
  }
}