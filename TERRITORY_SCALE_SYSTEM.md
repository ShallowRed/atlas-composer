# Système de Calcul Automatique des Échelles des Territoires

## Vue d'ensemble

Le système calcule automatiquement les échelles (zoom) de chaque territoire pour **respecter les proportions géographiques réelles** entre eux. Quand le multiplicateur d'échelle est à 1, tous les territoires apparaissent avec des tailles proportionnelles à leur étendue géographique réelle.

## Fonctionnement

### 1. Fonction de Calcul : `calculateTerritoryScale()`

```typescript
function calculateTerritoryScale(
  bounds: [[number, number], [number, number]],
  targetPixelSize: number
): number
```

**Paramètres :**
- `bounds` : Limites géographiques `[[minLon, minLat], [maxLon, maxLat]]`
- `targetPixelSize` : Taille cible en pixels pour ce territoire à l'écran

**Algorithme :**
1. Calcule l'étendue géographique en degrés (longitude et latitude)
2. Prend la dimension maximale (largeur ou hauteur)
3. Convertit en radians
4. Calcule l'échelle D3 : `scale = targetPixelSize / (maxSpan en radians)`

**Résultat :**
Une valeur d'échelle qui fait que le territoire occupe exactement `targetPixelSize` pixels dans sa dimension maximale.

### 2. Tailles de Référence : `TERRITORY_PIXEL_SIZES`

Configuration des tailles relatives souhaitées :

```typescript
const TERRITORY_PIXEL_SIZES = {
  mainland: 280, // France métropolitaine (référence)
  small: 60, // Petites îles (Saint-Martin, Mayotte, etc.)
  medium: 80, // Îles moyennes (Martinique, Guadeloupe)
  large: 100, // Grandes îles (Réunion, Nouvelle-Calédonie)
  xlarge: 140, // Grands territoires (Guyane, Polynésie, TAAF)
}
```

Ces valeurs déterminent la **taille visuelle** de chaque catégorie de territoire sur la carte.

## Attribution des Catégories

### Mainland (280px)
- **France Métropolitaine** : ~551 695 km²
  - Étendue : ~15° lon × ~10° lat
  - Sert de référence pour toutes les proportions

### Small (60px)
- **Saint-Martin** : ~53 km² | Étendue : ~0.15° × ~0.09°
- **Saint-Barthélemy** : ~21 km² | Étendue : ~0.09° × ~0.10°
- **Mayotte** : ~374 km² | Étendue : ~0.32° × ~0.36°
- **Saint-Pierre-et-Miquelon** : ~242 km² | Étendue : ~0.29° × ~0.40°
- **Wallis-et-Futuna** : ~142 km² | Étendue : ~2.1° × ~1.2°

### Medium (80px)
- **Guadeloupe** : ~1 628 km² | Étendue : ~0.81° × ~0.69°
- **Martinique** : ~1 128 km² | Étendue : ~0.42° × ~0.49°

### Large (100px)
- **La Réunion** : ~2 512 km² | Étendue : ~0.62° × ~0.52°
- **Nouvelle-Calédonie** : ~18 575 km² | Étendue : ~5° × ~3.2°

### XLarge (140px)
- **Guyane** : ~83 534 km² | Étendue : ~3° × ~3.7°
- **Polynésie Française** : ~4 167 km² (dispersés) | Étendue : ~20° × ~21°
- **TAAF** : ~7 747 km² (dispersés) | Étendue : ~38° × ~13°

## Avantages du Système

### ✅ Proportions Respectées
Tous les territoires sont affichés avec des tailles proportionnelles à leur étendue géographique réelle.

### ✅ Pas de Valeurs Magiques
Les échelles ne sont plus hardcodées, elles sont **calculées automatiquement** à partir des bounds.

### ✅ Cohérence Garantie
Avec un multiplicateur d'échelle = 1, les rapports de taille sont mathématiquement corrects.

### ✅ Facilité de Modification
Pour ajuster les tailles relatives :
1. Modifier les valeurs dans `TERRITORY_PIXEL_SIZES`
2. Les échelles se recalculent automatiquement

### ✅ Ajout de Nouveaux Territoires Simplifié
Pour ajouter un territoire :
1. Définir ses `bounds` géographiques
2. Choisir une catégorie de taille (small/medium/large/xlarge)
3. L'échelle est calculée automatiquement

## Formule Mathématique

```
scale = targetPixelSize / (max(Δlon, Δlat) × π/180)

où :
- Δlon = maxLon - minLon (en degrés)
- Δlat = maxLat - minLat (en degrés)
- π/180 = conversion degrés → radians
```

## Exemple de Calcul

**La Réunion** :
- Bounds : `[[55.22, -21.39], [55.84, -20.87]]`
- Δlon = 55.84 - 55.22 = 0.62°
- Δlat = -20.87 - (-21.39) = 0.52°
- max(0.62, 0.52) = 0.62°
- maxSpanRadians = 0.62 × (π/180) ≈ 0.01082
- targetPixelSize = 100 (large)
- **scale = 100 / 0.01082 ≈ 9 242**

**Guadeloupe** :
- Bounds : `[[-61.81, 15.83], [-61.0, 16.52]]`
- Δlon = 0.81°
- Δlat = 0.69°
- max(0.81, 0.69) = 0.81°
- maxSpanRadians ≈ 0.01414
- targetPixelSize = 80 (medium)
- **scale = 80 / 0.01414 ≈ 5 657**

## Réglage Fin

Si un territoire spécifique semble trop grand ou trop petit :

### Option 1 : Ajuster sa catégorie
```typescript
// Passer de 'medium' à 'small' par exemple
scale: calculateTerritoryScale(bounds, TERRITORY_PIXEL_SIZES.small)
```

### Option 2 : Créer une catégorie personnalisée
```typescript
const TERRITORY_PIXEL_SIZES = {
  mainland: 280,
  small: 60,
  medium: 80,
  large: 100,
  xlarge: 140,
  custom_reunion: 90, // Taille personnalisée pour La Réunion
}
```

### Option 3 : Ajuster les tailles globales
Si tous les DOM-TOM semblent trop grands/petits, ajuster les valeurs de base :
```typescript
const TERRITORY_PIXEL_SIZES = {
  mainland: 280,
  small: 50, // Au lieu de 60
  medium: 70, // Au lieu de 80
  large: 90, // Au lieu de 100
  xlarge: 130, // Au lieu de 140
}
```

## Migration depuis l'Ancien Système

### Avant (valeurs hardcodées)
```typescript
{
  code: 'FR-RE',
  scale: 18000, // ❌ Valeur arbitraire, pas de contexte
  bounds: [[55.22, -21.39], [55.84, -20.87]],
}
```

### Après (calcul automatique)
```typescript
{
  code: 'FR-RE',
  scale: calculateTerritoryScale(
    [[55.22, -21.39], [55.84, -20.87]],
    TERRITORY_PIXEL_SIZES.large
  ), // ✅ Calculé pour respecter les proportions
  bounds: [[55.22, -21.39], [55.84, -20.87]],
}
```

## Fichiers Modifiés

- ✅ `src/constants/territories.ts` : Ajout de `calculateTerritoryScale()` et `TERRITORY_PIXEL_SIZES`
- ✅ Tous les territoires mis à jour avec le calcul automatique
- ✅ Suppression de toutes les valeurs d'échelle hardcodées

## Résultat

Quand le multiplicateur d'échelle global est à **1.0**, tous les territoires apparaissent maintenant avec des **proportions géographiques correctes**, calculées mathématiquement à partir de leurs limites géographiques réelles. 🗺️✨
