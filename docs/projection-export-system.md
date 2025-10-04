# Système d'export de projection

## Vue d'ensemble

Le système d'export de projection permet de convertir une configuration visuelle (sliders de position et d'échelle) en code TypeScript réutilisable qui génère une projection composite d3 personnalisée.

## Architecture

### 1. Utilitaires (`utils/projectionExporter.ts`)

#### `clientParamsToProjectionConfig()`

Convertit les paramètres des sliders en configuration de projection.

**Entrées :**
- `clientTranslations`: `Record<string, { x: number, y: number }>` - Positions (-15 à +15, -10 à +10)
- `clientScales`: `Record<string, number>` - Échelles (0.5 à 2.0)
- `baseProjectionType`: `'conic-conformal' | 'albers'` - Type de projection de base

**Sortie :**
```typescript
interface CompositeProjectionConfig {
  baseProjection: 'conic-conformal' | 'albers'
  baseRotate: [number, number]
  baseParallels?: [number, number]
  territories: TerritoryProjectionParams[]
}
```

**Logique de conversion :**
```typescript
// Translation UI → Coefficient de projection
const translateXCoeff = translation.x * 0.008
const translateYCoeff = translation.y * 0.008

// Dans la projection finale :
projection.translate([
  x + translateXCoeff * k, // k = scale de base
  y + translateYCoeff * k
])
```

#### `createCustomCompositeProjection()`

Crée une instance de projection fonctionnelle à partir de la configuration.

**Retour :** Une fonction factory `() => GeoProjection` qui :
1. Crée une projection de base (conic conformal ou albers)
2. Crée des projections Mercator pour chaque territoire
3. Implémente le multiplex stream pattern de d3
4. Gère automatiquement le clipping et le positionnement

**Caractéristiques :**
- Compatible avec d3 et Observable Plot
- Supporte `.scale()`, `.translate()`, `.stream()`
- Utilise le pattern multiplex pour fusionner les streams

#### `generateProjectionCode()`

Génère le code TypeScript source complet.

**Retour :** String contenant :
- Imports nécessaires (`d3-geo`)
- Fonction factory de projection
- Déclarations des projections par territoire
- Logique de multiplex stream
- Méthodes `.scale()`, `.translate()`, `.stream()`

**Format du code généré :**
```typescript
import type { GeoProjection } from 'd3-geo'
import { geoConicConformal, geoMercator } from 'd3-geo'

export default function customCompositeProjection(): GeoProjection {
  // ... implémentation complète
  return (projection as any).scale(2700)
}
```

#### `exportConfigAsJSON()`

Exporte la configuration en JSON pour persistence ou import.

**Utilité :**
- Sauvegarde de configurations
- Import/export entre sessions
- Versionnement des configurations
- Partage entre utilisateurs

### 2. Composants

#### `ProjectionExporter.vue`

**Responsabilités :**
- Bouton d'export visible dans l'UI
- Modal avec sélection de format (TypeScript/JSON)
- Aperçu du code généré avec coloration syntaxique
- Actions : Copier dans le presse-papier / Télécharger fichier
- Notifications toast (succès/erreur)

**Props exposées :**
```typescript
defineExpose({
  customProjection, // Instance de projection pour preview
  openExportModal, // Fonction pour ouvrir le modal
})
```

**State :**
- `exportFormat`: `'typescript' | 'json'`
- `isModalOpen`: `boolean`
- `notification`: Toast message state

#### `ProjectionPreview.vue`

**Responsabilités :**
- Afficher un aperçu de la projection générée
- Rendu avec Observable Plot
- Mise à jour temps réel quand la projection change

**Props :**
```typescript
{
  projection: () => GeoProjection  // Factory function
  title?: string
}
```

**Comportement :**
- Watch sur les données géo et la projection
- Re-render automatique
- État de chargement avec spinner

### 3. Utilitaire de rendu (`utils/plotHelper.ts`)

#### `plotCartography()`

Fonction helper pour créer un plot Observable Plot avec une projection personnalisée.

**Signature :**
```typescript
function plotCartography(
  geoData: GeoJSON.FeatureCollection,
  regions: Array<{ name: string, code: string }>,
  projection: GeoProjection
): HTMLElement | SVGSVGElement
```

**Utilité :**
- Simplifie le rendu des projections
- Gère les tooltips et les couleurs
- Réutilisable dans différents composants

## Workflow utilisateur

### Étape 1 : Configuration visuelle

```
Utilisateur dans l'onglet "Vue unifiée personnalisable"
    ↓
Ajuste les sliders de translation X/Y pour FR-GF (Guyane)
    ↓
Ajuste le slider de scale pour FR-GF
    ↓
Voit la carte se mettre à jour en temps réel
```

### Étape 2 : Export

```
Clique sur "🗺️ Exporter la projection"
    ↓
Modal s'ouvre avec 2 formats disponibles
    ↓
Sélectionne TypeScript (.ts)
    ↓
Voit le code généré dans l'aperçu
    ↓
Clique sur "📋 Copier" ou "💾 Télécharger"
```

### Étape 3 : Utilisation

```typescript
// 1. Copier le code dans src/services/MyCustomProjection.ts

// 2. Importer et utiliser
import myCustomProjection from './MyCustomProjection'

const projection = myCustomProjection()

// 3. Utiliser avec Observable Plot
const plot = Plot.plot({
  projection,
  marks: [
    Plot.geo(franceData, {
      fill: 'region',
      stroke: 'white'
    })
  ]
})

// 4. Ou avec d3 directement
const path = d3.geoPath(projection)
svg.append('path')
  .datum(franceData)
  .attr('d', path)
```

## Correspondance des paramètres

### Valeurs par défaut des territoires

Basées sur `ConicConformalFrance.ts` :

| Territoire | Code | translateXCoeff | translateYCoeff | scaleMultiplier | clipExtent |
|------------|------|-----------------|-----------------|-----------------|------------|
| Guyane | FR-GF | -0.12 | 0.0575 | 0.6 | `{x1: -0.14, y1: 0.029, x2: -0.0996, y2: 0.0864}` |
| Martinique | FR-MQ | -0.12 | 0.012 | 0.6 | `{x1: -0.14, y1: 0, x2: -0.0996, y2: 0.029}` |
| Guadeloupe | FR-GP | -0.12 | -0.016 | 0.6 | `{x1: -0.14, y1: -0.032, x2: -0.0996, y2: 0}` |
| Mayotte | FR-YT | 0.1167 | -0.064 | 0.6 | `{x1: 0.0967, y1: -0.076, x2: 0.1371, y2: -0.052}` |
| Réunion | FR-RE | 0.1167 | -0.036 | 0.6 | `{x1: 0.0967, y1: -0.052, x2: 0.1371, y2: -0.02}` |
| Nouvelle-Calédonie | FR-NC | 0.1167 | -0.004 | 0.6 | `{x1: 0.0967, y1: -0.02, x2: 0.1371, y2: 0.012}` |
| Wallis-et-Futuna | FR-WF | 0.1167 | 0.0225 | 0.6 | `{x1: 0.0967, y1: 0.012, x2: 0.1371, y2: 0.033}` |
| Polynésie française | FR-PF | 0.1167 | 0.0598 | 0.6 | `{x1: 0.0967, y1: 0.033, x2: 0.1371, y2: 0.0864}` |
| Saint-Pierre-et-Miquelon | FR-PM | -0.12 | -0.064 | 0.6 | `{x1: -0.14, y1: -0.076, x2: -0.0996, y2: -0.052}` |
| Saint-Martin | FR-MF | -0.12 | -0.042 | 0.6 | `{x1: -0.14, y1: -0.052, x2: -0.0996, y2: -0.032}` |
| Terres australes | FR-TF | 0.1167 | -0.083 | 0.6 | `{x1: 0.0967, y1: -0.09, x2: 0.1371, y2: -0.076}` |

### Formule de conversion

```typescript
// UI slider value → Projection coefficient
const uiTranslateX = -15 to +15  // Slider range
const uiTranslateY = -10 to +10  // Slider range
const uiScale = 0.5 to 2.0       // Scale slider

// Conversion factor (empirique, ajustable)
const CONVERSION_FACTOR = 0.008

// Result
const translateXCoeff = uiTranslateX * CONVERSION_FACTOR
const translateYCoeff = uiTranslateY * CONVERSION_FACTOR
const scaleMultiplier = uiScale

// Dans la projection (k = scale de base, ex: 2700)
projection.translate([
  x + translateXCoeff * k,
  y + translateYCoeff * k
])
projection.scale(baseScale * scaleMultiplier)
```

## Multiplex Stream Pattern

Le système utilise le pattern multiplex de d3 pour fusionner plusieurs projections :

```typescript
function multiplex(streams: any[]) {
  const n = streams.length
  return {
    point(x: number, y: number) {
      for (let i = 0; i < n; i++) streams[i].point(x, y)
    },
    sphere() { /* ... */ },
    lineStart() { /* ... */ },
    lineEnd() { /* ... */ },
    polygonStart() { /* ... */ },
    polygonEnd() { /* ... */ }
  }
}

// Utilisation
projection.stream = function (stream) {
  return cache && cacheStream === stream
    ? cache
    : (cache = multiplex([
        europe.stream(cacheStream = stream),
        guyane.stream(stream),
        martinique.stream(stream),
        // ... autres territoires
      ]))
}
```

**Avantage :** Chaque territoire a sa propre projection et clip extent, mais le rendu est unifié.

## Tests et validation

### Checklist de validation

- [ ] Les sliders modifient la carte en temps réel
- [ ] Le bouton d'export ouvre le modal
- [ ] Le code TypeScript généré est syntaxiquement valide
- [ ] Le code peut être copié dans le presse-papier
- [ ] Le fichier peut être téléchargé
- [ ] Le JSON exporté contient toutes les configurations
- [ ] L'aperçu de projection se met à jour avec les changements
- [ ] La notification toast apparaît après copie
- [ ] Le code généré peut être importé et utilisé

### Exemple de test manuel

1. Ouvrir l'application → onglet "Vue unifiée personnalisable"
2. Ajuster Guyane : X = +5, Y = -3, Scale = 1.2
3. Cliquer "Exporter la projection"
4. Sélectionner TypeScript
5. Vérifier que le code contient :
   ```typescript
   // Guyane
   const guyane = geoMercator()
     .center([-53.2, 3.9])
   ```
   Et les valeurs de translate/scale correspondantes
6. Copier le code
7. Créer un fichier `test-projection.ts`
8. Coller et vérifier la compilation TypeScript

## Évolutions futures

### Fonctionnalités à ajouter

1. **Import de configuration JSON**
   - Charger une configuration sauvegardée
   - Appliquer aux sliders
   - Mettre à jour la carte

2. **Presets**
   - Configurations pré-définies (ex: "Guyane mise en avant", "Océan Indien focus")
   - Galerie de presets communautaires

3. **Comparaison côte à côte**
   - Afficher 2 projections simultanément
   - Avant/après les modifications

4. **Animation de transition**
   - Animer le passage d'une configuration à une autre
   - Export en GIF ou vidéo

5. **Paramètres avancés**
   - Modifier les clip extents
   - Changer les centres géographiques
   - Ajuster les parallels de la projection de base

6. **Partage**
   - Générer une URL avec configuration encodée
   - Partage social
   - Export vers Observable Notebook

## Références

- [d3-geo documentation](https://github.com/d3/d3-geo)
- [d3-composite-projections](https://github.com/rveciana/d3-composite-projections)
- [Observable Plot projections](https://observablehq.com/plot/features/projections)
- [GeoJSON specification](https://geojson.org/)
