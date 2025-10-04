# Consolidation des Composants de Carte

## Vue d'ensemble

Cette refactorisation consolide tous les composants de rendu de carte dans un seul composant générique `MapRenderer.vue`, éliminant ainsi la duplication de code et simplifiant l'architecture.

## Problématique Initiale

L'application comportait 5 composants séparés pour le rendu de cartes :

1. **MetropolitanFranceMap.vue** (20 lignes) - Wrapper pour la France métropolitaine
2. **TerritoryMap.vue** (28 lignes) - Wrapper pour les territoires d'outre-mer
3. **VueCompositeMap.vue** (60 lignes) - Vue composite avec repositionnement personnalisable
4. **ProjectionCompositeMap.vue** (60 lignes) - Projection composite d3 automatique
5. **MapRenderer.vue** (150 lignes) - Composant de base pour le rendu

### Problèmes

- **Code dupliqué** : Logique de chargement/erreur répétée dans chaque composant
- **Complexité** : Multiple niveaux d'indirection avec wrappers intermédiaires
- **Maintenance** : Changements nécessitant des modifications dans plusieurs fichiers
- **Cohérence** : States (loading, error) gérés différemment selon les composants

## Solution : MapRenderer Unifié

Un seul composant `MapRenderer.vue` avec 3 modes d'opération :

```typescript
interface Props {
  // Mode simple pour cartes individuelles
  geoData?: GeoJSON.FeatureCollection | null
  title?: string
  area?: number
  region?: string
  isMetropolitan?: boolean
  preserveScale?: boolean
  width?: number
  height?: number

  // Mode de rendu
  mode?: 'simple' | 'vue-composite' | 'projection-composite'
}
```

### Mode `simple` (défaut)

Rendu d'une carte individuelle avec données GeoJSON fournies :

```vue
<MapRenderer
  :geo-data="geoDataStore.metropolitanFranceData"
  is-metropolitan
  :width="500"
  :height="400"
/>
```

**Utilisé pour :**
- France métropolitaine dans l'onglet "Territoires individuels"
- Chaque territoire d'outre-mer dans la grille DOM-TOM

### Mode `vue-composite`

Rendu de la vue composite avec repositionnement personnalisable :

```vue
<MapRenderer mode="vue-composite" />
```

**Caractéristiques :**
- Utilise `geoDataStore.renderVueComposite()`
- Applique les translations et scales personnalisés depuis `configStore`
- Dimensions fixes 800x600px
- Réagit aux changements de :
  - `selectedProjection`
  - `territoryMode`
  - `scalePreservation`
  - `territoryTranslations`
  - `territoryScales`

### Mode `projection-composite`

Rendu avec projection composite d3 (AlbersFrance, ConicConformalFrance) :

```vue
<MapRenderer mode="projection-composite" />
```

**Caractéristiques :**
- Utilise `geoDataStore.renderProjectionComposite()`
- Repositionnement automatique par la projection d3
- Dimensions fixes 800x600px
- Réagit aux changements de :
  - `selectedProjection`
  - `territoryMode`

## Implémentation

### Gestion des States

States unifiés pour tous les modes :

```typescript
const isLoading = ref(false)
const error = ref<string | null>(null)
```

### Logique de Rendu

```typescript
async function renderMap() {
  if (!mapContainer.value)
    return

  try {
    isLoading.value = true
    error.value = null
    mapContainer.value.innerHTML = ''

    // Router vers le bon mode
    if (props.mode === 'vue-composite') {
      await renderVueComposite()
      return
    }

    if (props.mode === 'projection-composite') {
      await renderProjectionComposite()
    }

    // Mode simple
    // ... rendu Observable Plot standard
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Error rendering map'
  }
  finally {
    isLoading.value = false
  }
}
```

### Watchers Conditionnels

Les dépendances surveillées s'adaptent au mode :

```typescript
watch(() => {
  if (props.mode === 'vue-composite') {
    return [
      configStore.selectedProjection,
      configStore.territoryMode,
      configStore.scalePreservation,
      configStore.territoryTranslations,
      configStore.territoryScales,
    ]
  }
  if (props.mode === 'projection-composite') {
    return [
      configStore.selectedProjection,
      configStore.territoryMode,
    ]
  }
  return [
    props.geoData,
    configStore.selectedProjection,
    props.preserveScale,
  ]
}, renderMap, { deep: true })
```

## Utilisation dans App.vue

### Avant

```vue
<!-- 3 composants différents -->
<VueCompositeMap />

<ProjectionCompositeMap />

<MetropolitanFranceMap />
```

### Après

```vue
<!-- 1 seul composant, 3 modes -->
<MapRenderer mode="vue-composite" />

<MapRenderer mode="projection-composite" />

<MapRenderer
  :geo-data="geoDataStore.metropolitanFranceData"
  is-metropolitan
/>
```

## Bénéfices

### Réduction de Code

- **-5 fichiers** : Suppression des wrappers intermédiaires
- **~200 lignes** de code en moins (duplication éliminée)
- **1 seul composant** à maintenir pour tous les rendus de carte

### Architecture Simplifiée

```
Avant:
App.vue
  ├─ VueCompositeMap.vue → geoDataStore.renderVueComposite()
  ├─ ProjectionCompositeMap.vue → geoDataStore.renderProjectionComposite()
  ├─ MetropolitanFranceMap.vue → MapRenderer.vue
  └─ DOMTOMGrid.vue
       └─ RegionContainer.vue → TerritoryMap.vue → MapRenderer.vue

Après:
App.vue
  ├─ MapRenderer (mode="vue-composite")
  ├─ MapRenderer (mode="projection-composite")
  ├─ MapRenderer (is-metropolitan)
  └─ DOMTOMGrid.vue
       └─ RegionContainer.vue → MapRenderer
```

### Cohérence

- **States unifiés** : loading/error gérés de manière cohérente
- **API consistante** : Mêmes props, même comportement
- **Styling uniforme** : Classes CSS partagées

### Maintenabilité

- **Single source of truth** : Une seule implémentation à maintenir
- **Tests simplifiés** : Un seul composant à tester avec différents modes
- **Évolutions facilitées** : Nouvelles fonctionnalités ajoutées une seule fois

## Migration

### Étape 1 : Ajout du mode à MapRenderer

Ajout de la prop `mode` et de la logique de routage.

### Étape 2 : Mise à jour de App.vue

Remplacement des anciens composants par MapRenderer avec le bon mode.

### Étape 3 : Suppression des wrappers

```bash
rm src/components/MetropolitanFranceMap.vue
rm src/components/TerritoryMap.vue
rm src/components/VueCompositeMap.vue
rm src/components/ProjectionCompositeMap.vue
```

### Étape 4 : Mise à jour de la documentation

README et docs reflètent la nouvelle architecture.

## Compatibilité

✅ **Rétrocompatible** : Le mode `simple` (défaut) préserve le comportement original

✅ **Props optionnelles** : `mode` par défaut à `'simple'`, pas de breaking changes

✅ **API flexible** : Peut évoluer pour supporter de nouveaux modes sans casser l'existant

## Conclusion

Cette consolidation transforme 5 composants en un seul composant polyvalent, réduisant significativement la complexité du code tout en améliorant la maintenabilité et la cohérence de l'application.

La prop `mode` offre une API claire et extensible pour gérer différents types de rendu de cartes, tout en centralisant la logique commune (loading, error handling, watchers).
