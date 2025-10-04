# Changelog - Cartographie de la France

## 2025-10-04 - Optimisations et améliorations majeures

### 🎯 Centralisation des constantes de territoires
- **Nouveau fichier**: `src/constants/territories.ts`
- Toutes les configurations de territoires (codes, noms, coordonnées, scales, offsets, bounds) sont maintenant centralisées
- Ajout de fonctions utilitaires: `getTerritoryConfig()`, `getTerritoryName()`, `getTerritoryShortName()`
- Groupements de territoires par région (Caraïbes, Océan Indien, Pacifique, etc.)
- Liste complète: `TERRITORY_CODES`, `ALL_TERRITORIES`, `TERRITORIES_BY_CODE`

### 🗺️ Amélioration du positionnement des DOM-TOM
Nouveaux placements optimisés pour une meilleure lisibilité:

**Caraïbes (gauche)**:
- Saint-Barthélemy: (-450, -150) - En haut
- Saint-Martin: (-450, -50)
- Guadeloupe: (-450, 50)
- Martinique: (-450, 150)
- Guyane: (-450, 280) - En bas (plus grand)

**Atlantique Nord**:
- Saint-Pierre-et-Miquelon: (-200, -200)

**Océan Indien (droite)**:
- Mayotte: (350, -50) - En haut (petite île)
- La Réunion: (350, 50)
- TAAF: (350, 250) - En bas (grand territoire)

**Pacifique (extrême droite)**:
- Nouvelle-Calédonie: (550, -100) - En haut
- Wallis-et-Futuna: (550, 50) - Petites îles
- Polynésie française: (550, 180) - En bas (grand territoire)

### 🔧 Correction du bug d'accumulation de scale
- **Problème**: Scaler à 1.5x puis revenir à 1.0x laissait le territoire plus grand
- **Solution**: Ajout de `scaleMultiplier` dans `SubProjectionConfig`
- Le `baseScale` est maintenant toujours extrait correctement: `baseScale = currentScale / scaleMultiplier`
- Lors du changement de type de projection, le multiplier est préservé

### 🎨 Amélioration de l'UI
- **Mode de projection**: Changé de boutons à dropdown (plus compact et cohérent)
- **Mode uniform**: Fonctionne maintenant correctement - applique la projection sélectionnée à TOUS les territoires
- Utilisation des constantes centralisées pour initialiser les translations et scales

### 🧹 Nettoyage du code
Suppression de tous les logs de debug ajoutés pendant l'investigation:
- `CustomCompositeProjection.ts`: Supprimé 10+ console.log
- `Cartographer.ts`: Supprimé logs d'initialisation et de build
- `geoData.ts`: Supprimé logs de synchronisation
- `config.ts`: Supprimé logs de setters
- `MapRenderer.vue`: Supprimé logs de watch
- `TerritoryControls.vue`: Supprimé logs d'événements
- `GeoDataService.ts`: Supprimé logs de chargement
- Conservé uniquement les logs d'erreur critiques

### 📊 Architecture améliorée
**Avant**:
```typescript
// Données en dur dispersées dans multiple fichiers
const domtomDefaults = [
  { code: 'FR-GP', name: 'Guadeloupe', center: [-61.551, 16.265], ... },
  // ... répété dans CustomCompositeProjection.ts
]

const territoryTranslations = {
  'FR-GP': { x: -400, y: 100 },
  // ... répété dans config.ts
}
```

**Après**:
```typescript
// Source unique de vérité
import { ALL_TERRITORIES, MAINLAND_FRANCE } from '../constants/territories'

// Initialisation automatique
const territoryTranslations = Object.fromEntries(
  ALL_TERRITORIES.map(t => [t.code, { x: t.offset[0], y: t.offset[1] }])
)
```

### 🚀 Bénéfices
1. **Maintenabilité**: Une seule source de vérité pour les données de territoires
2. **Cohérence**: Impossible d'avoir des données désynchronisées entre fichiers
3. **Lisibilité**: Code plus propre sans logs de debug partout
4. **Performance**: Pas de calculs inutiles ou de logs en production
5. **Extensibilité**: Facile d'ajouter de nouveaux territoires ou groupements

### 🐛 Bugs corrigés
- ✅ Accumulation de scale lors des changements de projection
- ✅ Mode "Uniform" qui n'appliquait pas la projection à tous les territoires
- ✅ Données de territoires dupliquées et désynchronisées

### 📝 Fichiers modifiés
- `src/constants/territories.ts` (nouveau)
- `src/services/CustomCompositeProjection.ts`
- `src/stores/config.ts`
- `src/stores/geoData.ts`
- `src/cartographer/Cartographer.ts`
- `src/services/GeoDataService.ts`
- `src/components/TerritoryControls.vue`
- `src/components/MapRenderer.vue`
- `src/components/DOMTOMGrid.vue`
- `src/App.vue`

---

## Anciennes versions

### 2025-10-03 - Fix de la projection composite personnalisée
- Implémentation du pattern albersUsa avec multiplex stream
- Ajout des clip extents pour isoler les territoires
- Fix du bug de translation offset doubling
- Centrage de la France métropolitaine

### 2025-10-02 - Initialisation du projet
- Configuration Vite + TypeScript + Vue 3
- Observable Plot pour le rendu cartographique
- D3-geo pour les projections
- Architecture modulaire avec stores Pinia
