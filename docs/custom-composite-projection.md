# Custom Composite Projection - Documentation Technique

## Vue d'ensemble

Le service `CustomCompositeProjection` implémente une projection composite D3 personnalisée permettant d'afficher la France métropolitaine et les DOM-TOM avec des projections individuelles optimisées pour chaque territoire, tout en les positionnant manuellement sur une seule carte.

## Architecture

### Principe de Fonctionnement

```
┌─────────────────────────────────────────────────────────────┐
│           Projection Composite Personnalisée                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Sub-Projections (par territoire)                        │
│     ├─ FR-MET: Conic Conformal                              │
│     ├─ FR-GP: Mercator (Guadeloupe)                        │
│     ├─ FR-MQ: Mercator (Martinique)                        │
│     └─ ... autres territoires                               │
│                                                              │
│  2. Fonction de Projection                                   │
│     ├─ Essaie chaque sub-projection séquentiellement        │
│     ├─ Vérifie les bounds géographiques                     │
│     └─ Applique translateOffset (inset positioning)         │
│                                                              │
│  3. Fonction Invert                                          │
│     ├─ Détranslate l'offset                                 │
│     ├─ Appelle invert de chaque sub-projection             │
│     └─ Vérifie que le résultat est dans les bounds         │
│                                                              │
│  4. Stream Multiplexing                                      │
│     ├─ Propage point/line/polygon à toutes sub-projections │
│     └─ Seules les sub-projections dans bounds produisent    │
│        un résultat                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Configuration d'une Sub-Projection

```typescript
interface SubProjectionConfig {
  territoryCode: string // Ex: 'FR-GP'
  territoryName: string // Ex: 'Guadeloupe'
  projection: GeoProjection // Instance D3 projection
  clipExtent: [[number, number], [number, number]] | null
  translateOffset: [number, number] // [x, y] in screen coords
  bounds: [[number, number], [number, number]] // Geographic bounds
}
```

### Exemple: Configuration Guadeloupe

```typescript
{
  territoryCode: 'FR-GP',
  territoryName: 'Guadeloupe',
  projection: geoMercator()
    .center([-61.551, 16.265])     // Center of Guadeloupe
    .scale(18000)                   // Zoom level
    .translate([0, 0]),             // Local origin
  clipExtent: null,
  translateOffset: [-400, 100],     // Position in composite map
  bounds: [[-61.81, 15.83], [-61.0, 16.52]] // Geographic bounds
}
```

## Étapes de Construction

### 1. Initialisation

```typescript
const compositeProj = new CustomCompositeProjection()
```

Crée automatiquement des sub-projections par défaut pour :
- France Métropolitaine (Conic Conformal)
- 10 DOM-TOM (Mercator avec paramètres optimisés)

### 2. Ajout/Mise à jour de Sub-Projections

```typescript
compositeProj.addSubProjection({
  territoryCode: 'FR-GP',
  territoryName: 'Guadeloupe',
  projection: geoMercator().center([-61.551, 16.265]).scale(18000),
  clipExtent: null,
  translateOffset: [-400, 100],
  bounds: [[-61.81, 15.83], [-61.0, 16.52]]
})
```

### 3. Modification Dynamique

#### Changer le type de projection d'un territoire

```typescript
compositeProj.updateTerritoryProjection('FR-GP', 'conic-conformal')
```

#### Ajuster la position (offset)

```typescript
compositeProj.updateTranslationOffset('FR-GP', [-450, 150])
```

#### Ajuster l'échelle

```typescript
compositeProj.updateScale('FR-GP', 1.2) // 20% plus grand
```

### 4. Construction de la Projection Finale

```typescript
const projection = compositeProj.build(800, 600)
```

Retourne une `GeoProjection` D3 standard utilisable avec `Plot.geo()`.

## Algorithme de Projection

### Forward Projection (Coordonnées → Écran)

```typescript
function project([lon, lat]: [number, number]): [number, number] | null {
  for each subProjection {
    if (isWithinBounds(lon, lat, subProjection.bounds)) {
      let [x, y] = subProjection.projection([lon, lat])

      // Apply base translation (centering)
      x += width / 2
      y += height / 2

      // Apply territory offset (inset positioning)
      x += subProjection.translateOffset[0]
      y += subProjection.translateOffset[1]

      return [x, y]
    }
  }
  return null // Point not in any territory
}
```

### Inverse Projection (Écran → Coordonnées)

```typescript
function invert([x, y]: [number, number]): [number, number] | null {
  for each subProjection {
    // Remove offsets
    let adjX = x - width/2 - subProjection.translateOffset[0]
    let adjY = y - height/2 - subProjection.translateOffset[1]

    let [lon, lat] = subProjection.projection.invert([adjX, adjY])

    if (isWithinBounds(lon, lat, subProjection.bounds)) {
      return [lon, lat]
    }
  }
  return null
}
```

## Stream Multiplexing

Le multiplexage de stream permet à D3 de traiter correctement les géométries qui traversent plusieurs sub-projections.

```typescript
projection.stream = (sink) => {
  const streams = subProjections.map(sp => sp.projection.stream(sink))

  return {
    point(x, y) {
      // Chaque sub-projection teste si le point est dans son clipExtent
      streams.forEach(s => s.point(x, y))
    },
    lineStart() {
      streams.forEach(s => s.lineStart())
    },
    // ... autres méthodes
  }
}
```

### Pourquoi le Multiplexing ?

1. **Géométries Multi-Territoires** : Une ligne côtière peut traverser plusieurs territoires
2. **Clipping Intelligent** : Chaque sub-projection clip automatiquement selon son bounds
3. **Performance** : Évite de dupliquer les données géographiques

## Visualisation des Frontières

```typescript
const borders = compositeProj.getCompositionBorders(800, 600)
```

Retourne un tableau de rectangles englobants pour chaque territoire (inset) :

```typescript
[
  {
    territoryCode: 'FR-GP',
    territoryName: 'Guadeloupe',
    bounds: [[x1, y1], [x2, y2]] // Top-left, bottom-right en pixels
  },
  // ...
]
```

Utile pour :
- Dessiner des cadres autour des insets
- Debug du positionnement
- Interaction utilisateur (clic sur un territoire)

## Export de Configuration

```typescript
const config = compositeProj.exportConfig()
```

Retourne un objet JSON sérialisable :

```json
{
  "subProjections": [
    {
      "territoryCode": "FR-MET",
      "territoryName": "France Métropolitaine",
      "projectionType": "ConicConformal",
      "center": [2.5, 46.5],
      "scale": 2800,
      "rotate": [-3, 0],
      "translateOffset": [0, 0],
      "bounds": [[-5, 41], [10, 51]]
    }
    // ...
  ]
}
```

## Intégration avec Observable Plot

```typescript
const projection = compositeProj.build(800, 600)

const plot = Plot.plot({
  width: 800,
  height: 600,
  projection,
  marks: [
    Plot.geo(geoData, {
      fill: 'steelblue',
      stroke: 'white'
    })
  ]
})
```

## Cas d'Usage Avancés

### 1. Projection Azimuthale pour la Polynésie

```typescript
import { geoAzimuthalEquidistant } from 'd3-geo'

compositeProj.addSubProjection({
  territoryCode: 'FR-PF',
  territoryName: 'Polynésie française',
  projection: geoAzimuthalEquidistant()
    .center([-149.566, -17.679])
    .scale(5000),
  translateOffset: [450, 150],
  bounds: [[-154, -28], [-134, -7]]
})
```

### 2. Zoom Dynamique sur un Territoire

```typescript
// Doubler la taille de La Réunion
compositeProj.updateScale('FR-RE', 2.0)

// Reconstruire la projection
const updatedProjection = compositeProj.build(800, 600)
```

### 3. Animation de Repositionnement

```typescript
function animateOffset(from: [number, number], to: [number, number], duration: number) {
  const steps = 60
  const dx = (to[0] - from[0]) / steps
  const dy = (to[1] - from[1]) / steps

  let step = 0
  const interval = setInterval(() => {
    const currentOffset: [number, number] = [
      from[0] + dx * step,
      from[1] + dy * step
    ]

    compositeProj.updateTranslationOffset('FR-GP', currentOffset)
    renderMap() // Redessiner

    if (++step >= steps)
      clearInterval(interval)
  }, duration / steps)
}
```

## Performance

### Optimisations Implémentées

1. **Cache de Projection** : La projection composite n'est reconstruite que si nécessaire
2. **Bounds Check Rapide** : Test simple de rectangle avant d'invoquer la projection
3. **Stream Multiplexing** : Évite la duplication des données

### Considérations

- **Temps de Construction** : O(n) où n = nombre de sub-projections
- **Temps de Projection** : O(n) au pire cas (teste toutes les sub-projections)
- **Mémoire** : Linéaire avec le nombre de territoires

### Recommandations

- ✅ Limiter à 15-20 sub-projections maximum
- ✅ Définir des bounds précis pour minimiser les tests
- ✅ Utiliser `clipExtent` quand possible pour améliorer le clipping
- ❌ Éviter les sub-projections qui se chevauchent (résultats imprévisibles)

## Limitations Connues

1. **Pas de Graticule Unifié** : Chaque sub-projection a sa propre grille de longitude/latitude
2. **Transitions Brutales** : Les frontières entre sub-projections sont nettes (pas de blend)
3. **Sphere Non Supportée** : La méthode `sphere()` n'a pas de sens pour une projection composite
4. **Ordre des Sub-Projections** : Important ! La première qui matche gagne

## Comparaison avec d3-composite-projections

| Aspect | CustomCompositeProjection | d3-composite-projections |
|--------|---------------------------|--------------------------|
| Projections par territoire | ✅ Oui | ❌ Non (uniforme) |
| Positionnement manuel | ✅ Oui | ❌ Non (automatique) |
| Modification dynamique | ✅ Oui | ❌ Non |
| Performance | 🟡 Moyenne | 🟢 Excellente |
| Simplicité | 🟡 Complexe | 🟢 Simple |
| Export de config | ✅ Oui | ❌ Non |

## Références

- [D3 Geo Projections](https://github.com/d3/d3-geo)
- [D3 Geo Projection API](https://github.com/d3/d3-geo#projections)
- [Observable Plot Geo Mark](https://observablehq.com/plot/marks/geo)
- [Composite Projections Paper](https://www.jasondavies.com/maps/composite/)
