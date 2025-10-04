# Guide d'Utilisation - Projection Composite Personnalisée

## Introduction

Le mode **Projection composite personnalisée** permet de créer des cartes où chaque territoire (France métropolitaine et DOM-TOM) peut avoir :
- Sa propre projection géographique
- Son propre positionnement sur la carte
- Sa propre échelle

## Activation

1. Sélectionner **Mode d'affichage** : `Projection composite personnalisée`
2. Activer **Mode de projection** : `Individual` (projections par territoire)

## Interface

### Contrôles Principaux

```
┌─────────────────────────────────────────────────────┐
│ Configuration                                        │
├─────────────────────────────────────────────────────┤
│ Theme                           [🌙 Dark]           │
│ Mode d'affichage               [Composite custom]   │
│ Mode de projection             [Individual]         │
│ Projection globale             [Albers France]      │
│ Territoires affichés           [Tous]               │
└─────────────────────────────────────────────────────┘
```

### Paramètres par Territoire

Chaque territoire dispose d'un panneau accordéon :

```
┌─────────────────────────────────────────────────────┐
│ ▼ Guadeloupe (FR-GP)                                │
├─────────────────────────────────────────────────────┤
│ Projection              [Mercator            ▼]     │
│ Translation X           [━━━●━━━━━━━] -400          │
│ Translation Y           [━━━●━━━━━━━] 100           │
│ Échelle                 [━━━●━━━━━━━] 1.0           │
└─────────────────────────────────────────────────────┘
```

## Types de Projections Disponibles

| Projection | Usage Recommandé | Déformation |
|------------|-----------------|-------------|
| **Mercator** | Zones tropicales (DOM-TOM) | Préserve les angles, déforme les surfaces |
| **Conic Conformal** | Zones tempérées (FR-MET) | Bonne pour latitudes moyennes |
| **Albers Equal Area** | Analyses statistiques | Préserve les surfaces |
| **Azimuthal Equidistant** | Territoires insulaires | Distances correctes depuis le centre |

## Flux de Travail

### 1. Mode Uniform (Par Défaut)

Tous les territoires utilisent la même projection :

```typescript
// Exemple: Tous en Mercator
configStore.projectionMode = 'uniform'
configStore.selectedProjection = 'mercator'
```

**Avantage** : Cohérence visuelle
**Inconvénient** : Déformations identiques partout

### 2. Mode Individual (Avancé)

Chaque territoire a sa propre projection :

```typescript
// Exemple: FR-MET en Conic Conformal, DOM-TOM en Mercator
configStore.projectionMode = 'individual'
configStore.territoryProjections = {
  'FR-MET': 'conic-conformal',
  'FR-GP': 'mercator',
  'FR-MQ': 'mercator',
  // ...
}
```

**Avantage** : Projections optimisées par territoire
**Inconvénient** : Nécessite ajustements manuels

## Exemples de Configuration

### Configuration Standard (Recommandée)

```json
{
  "viewMode": "composite-custom",
  "projectionMode": "individual",
  "territoryProjections": {
    "FR-MET": "conic-conformal",
    "FR-GP": "mercator",
    "FR-MQ": "mercator",
    "FR-GF": "mercator",
    "FR-RE": "mercator",
    "FR-YT": "mercator",
    "FR-NC": "mercator",
    "FR-PF": "mercator",
    "FR-MF": "mercator",
    "FR-WF": "mercator",
    "FR-PM": "mercator"
  }
}
```

### Configuration Expérimentale (Azimuthale pour Polynésie)

```json
{
  "viewMode": "composite-custom",
  "projectionMode": "individual",
  "territoryProjections": {
    "FR-MET": "conic-conformal",
    "FR-PF": "azimuthal-equidistant",
    "FR-NC": "azimuthal-equidistant"
  }
}
```

## Ajustement des Translations

### Comprendre les Axes

```
        Y négatif (haut)
              ↑
              |
←─────────────●─────────────→ X négatif   X positif
   (gauche)   |   (droite)
              |
              ↓
        Y positif (bas)
```

### Positionnement Typique

| Territoire | Translation X | Translation Y | Rationale |
|-----------|---------------|---------------|-----------|
| FR-MET | 0 | 0 | Centre de référence |
| FR-GP | -400 | 100 | En bas à gauche |
| FR-MQ | -400 | 200 | Sous la Guadeloupe |
| FR-GF | -400 | 300 | Sous la Martinique |
| FR-RE | 300 | 100 | En bas à droite |
| FR-YT | 350 | 200 | À côté de La Réunion |
| FR-NC | 450 | -100 | En haut à droite |
| FR-PF | 450 | 100 | Sous Nouvelle-Calédonie |
| FR-PM | -100 | -200 | En haut à gauche |
| FR-WF | 400 | 250 | Entre RE et PF |
| FR-MF | -350 | 80 | Près de GP |

## Ajustement des Échelles

### Règles Générales

- **Échelle 1.0** : Taille par défaut
- **Échelle > 1.0** : Agrandir (ex: 1.5 = 150%)
- **Échelle < 1.0** : Réduire (ex: 0.8 = 80%)

### Exemples Pratiques

```typescript
// Mettre en évidence La Réunion
cartographer.updateTerritoryScale('FR-RE', 1.3)

// Réduire la Polynésie pour économiser de l'espace
cartographer.updateTerritoryScale('FR-PF', 0.7)

// Grossir les petites îles pour la lisibilité
cartographer.updateTerritoryScale('FR-MF', 1.5)
cartographer.updateTerritoryScale('FR-WF', 1.5)
```

## Cas d'Usage

### Carte pour Analyse Statistique

**Objectif** : Préserver les surfaces pour comparer visuellement les densités

```typescript
configStore.projectionMode = 'uniform'
configStore.selectedProjection = 'albers'
```

### Carte pour Navigation

**Objectif** : Préserver les angles pour la navigation maritime

```typescript
configStore.projectionMode = 'uniform'
configStore.selectedProjection = 'mercator'
```

### Carte Optimisée par Territoire

**Objectif** : Minimiser les déformations pour chaque zone

```typescript
configStore.projectionMode = 'individual'
// FR-MET: Conic Conformal (optimal pour latitudes 45-50°N)
configStore.territoryProjections['FR-MET'] = 'conic-conformal'

// DOM-TOM tropicaux: Mercator (optimal pour équateur)
  ['FR-GP', 'FR-MQ', 'FR-GF'].forEach((code) => {
    configStore.territoryProjections[code] = 'mercator'
  })

// Îles du Pacifique: Azimuthale (optimal pour îles isolées)
  ['FR-NC', 'FR-PF', 'FR-WF'].forEach((code) => {
    configStore.territoryProjections[code] = 'azimuthal-equidistant'
  })
```

## Export de Configuration

### Exporter la Configuration Actuelle

```typescript
const config = geoDataStore.cartographer.exportCustomCompositeConfig()
console.log(JSON.stringify(config, null, 2))
```

### Format d'Export

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
    },
    {
      "territoryCode": "FR-GP",
      "territoryName": "Guadeloupe",
      "projectionType": "Mercator",
      "center": [-61.551, 16.265],
      "scale": 18000,
      "translateOffset": [-400, 100],
      "bounds": [[-61.81, 15.83], [-61.0, 16.52]]
    }
  ]
}
```

### Réimporter une Configuration

```typescript
// TODO: Feature à implémenter
// configStore.importCustomCompositeConfig(savedConfig)
```

## Débogage

### Visualiser les Frontières de Composition

```typescript
const borders = geoDataStore.cartographer.getCompositionBorders(800, 600)
console.log('Territory inset borders:', borders)

// Exemple de sortie:
// [
//   {
//     territoryCode: 'FR-GP',
//     territoryName: 'Guadeloupe',
//     bounds: [[150, 250], [250, 350]] // Top-left, bottom-right
//   }
// ]
```

### Vérifier la Configuration Active

```typescript
console.log('View mode:', configStore.viewMode)
console.log('Projection mode:', configStore.projectionMode)
console.log('Territory projections:', configStore.territoryProjections)
```

### Problèmes Courants

| Symptôme | Cause Possible | Solution |
|----------|----------------|----------|
| Territoire invisible | Hors du canvas | Ajuster translateOffset |
| Territoire déformé | Mauvaise projection | Choisir projection adaptée |
| Territoire trop petit | Échelle trop faible | Augmenter scale |
| Chevauchement | Translations proches | Espacer les territoires |

## Performance

### Recommandations

- **Nombre de Territoires** : ≤ 15 pour performances optimales
- **Mise à Jour** : Batch les modifications avant de re-render
- **Échelles** : Éviter les valeurs extrêmes (< 0.5 ou > 3.0)

### Mesure des Performances

```typescript
console.time('render-custom-composite')
await geoDataStore.renderCustomComposite(container)
console.timeEnd('render-custom-composite')
```

## Limitations

1. **Pas de Graticule Unifié** : Chaque territoire a sa propre grille lat/lon
2. **Transitions Brutales** : Pas de blend entre les projections aux frontières
3. **Sphere Non Supportée** : Les méthodes globales (`.sphere()`) n'ont pas de sens
4. **Ordre des Tests** : Le premier territoire qui matche gagne (peut causer des ambiguïtés)

## Références

- [Documentation Technique](./custom-composite-projection.md)
- [Code Source](../src/services/CustomCompositeProjection.ts)
- [D3 Geo Projections](https://github.com/d3/d3-geo)
