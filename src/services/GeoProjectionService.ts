// type ProjectionRotation = [x: number, y: number, z?: number | undefined]
// type ProjectionParallels = [y1: number, y2: number]
export class GeoProjectionService {
  
  getProjection(type: string, data: any) {
    switch (type) {
      case 'albers':
        return this.createAlbersProjection(data)
      case 'mercator':
        return this.createMercatorProjection(data)
      case 'natural-earth':
        return this.createEqualEarthProjection(data)
      default:
        return this.createAlbersProjection(data)
    }
  }

  getUnifiedProjection(type: string, _viewMode: string = 'metropole-major') {
    // PROJECTION COMPOSITE FRANCE : similaire à albers-usa
    // Utilise notre logique de repositionnement intelligent des DOM-TOM
    
    if (type === 'composite-france') {
      return this.createFranceCompositeProjection()
    }
    
    // Projection standard avec repositionnement automatique des données
    switch (type) {
      case 'albers':
        return {
          type: 'conic-conformal' as const,
          parallels: [44, 49] as [number, number],
          rotate: [-2, 0] as [number, number]
        }
      case 'mercator':
        return {
          type: 'mercator' as const
        }
      case 'natural-earth':
        return {
          type: 'equal-earth' as const
        }
      default:
        return {
          type: 'conic-conformal' as const,
          parallels: [44, 49] as [number, number],
          rotate: [-2, 0] as [number, number]
        }
    }
  }

  private createAlbersProjection(data: any) {
    // Projection Albers spécifiquement optimisée pour la France métropolitaine
    if (!data) return 'albers' as const
    
    return {
      type: 'conic-conformal' as const,
      parallels: [45.898889, 47.696014] as [number, number], // Parallèles standards pour la France
      rotate: [-3, 0] as [number, number], // Longitude centrale de la France
      domain: data
    }
  }

  private createMercatorProjection(data: any) {
    if (!data) return 'mercator' as const
    
    return {
      type: 'mercator' as const,
      domain: data
    }
  }

  private createEqualEarthProjection(data: any) {
    if (!data) return 'equal-earth' as const
    
    return {
      type: 'equal-earth' as const,
      domain: data
    }
  }

  /**
   * Calcule les paramètres de projection personnalisés pour préserver les échelles
   */
  calculateScalePreservingProjection(_territories: any[], preserveScale: boolean) {
    if (!preserveScale) return null

    // Cette méthode pourrait implémenter des calculs plus sophistiqués
    // pour préserver les rapports de taille entre territoires
    
    // Pour l'instant, retourne une configuration de base
    return 'albers' as const
  }

  /**
   * Crée une projection composite pour afficher plusieurs territoires
   * similaire à 'albers-usa' mais pour la France et ses DOM-TOM
   * 
   * Cette projection repositionne automatiquement les DOM-TOM dans des insets
   * autour de la France métropolitaine, comme le fait albers-usa pour Alaska et Hawaii
   */
  createFranceCompositeProjection() {
    return {
      type: 'identity' as const, // Utilise les coordonnées telles quelles après repositionnement
      // Cette projection assume que les données ont déjà été repositionnées
      // par notre logique de repositionnement composite
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
          scale: 0.6, // 60% de la taille
          translate: [8, -2], // Position à droite de la métropole
          originalBounds: [[-54.6, 2.1], [-51.6, 5.8]]
        },
        'FR-RE': { // La Réunion
          scale: 0.4,
          translate: [6, 3], // En bas à droite
          originalBounds: [[55.2, -21.4], [55.9, -20.8]]
        },
        'FR-GP': { // Guadeloupe
          scale: 0.3,
          translate: [-4, -2], // À gauche
          originalBounds: [[-61.8, 15.8], [-61.0, 16.6]]
        },
        'FR-MQ': { // Martinique
          scale: 0.3,
          translate: [-4, 1], // À gauche, décalé
          originalBounds: [[-61.2, 14.4], [-60.8, 14.9]]
        },
        'FR-YT': { // Mayotte
          scale: 0.2,
          translate: [4, 5], // En bas
          originalBounds: [[45.0, -13.0], [45.3, -12.6]]
        },
        'FR-MF': { // Saint-Martin
          scale: 0.15,
          translate: [-6, 3], // Petit inset en bas à gauche
          originalBounds: [[-63.2, 18.0], [-62.8, 18.1]]
        },
        'FR-PF': { // Polynésie française
          scale: 0.5,
          translate: [10, 0], // À droite
          originalBounds: [[-154, -28], [-134, -8]]
        },
        'FR-NC': { // Nouvelle-Calédonie
          scale: 0.4,
          translate: [8, 4], // En bas à droite
          originalBounds: [[163, -23], [168, -19]]
        },
        'FR-TF': { // Terres australes françaises
          scale: 0.3,
          translate: [2, 6], // En bas au centre
          originalBounds: [[68, -50], [78, -37]]
        },
        'FR-WF': { // Wallis-et-Futuna
          scale: 0.15,
          translate: [12, 3], // Petit inset à droite
          originalBounds: [[-178, -14.5], [-176, -13]]
        },
        'FR-PM': { // Saint-Pierre-et-Miquelon
          scale: 0.2,
          translate: [-2, 6], // En bas
          originalBounds: [[-56.4, 46.7], [-56.1, 47.1]]
        }
      }
    }
  }
}