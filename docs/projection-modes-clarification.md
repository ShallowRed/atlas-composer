# Corrections et Améliorations - 4 octobre 2025

## Changements Effectués

### 1. Renommage du Composant
**Ancien nom :** "Ajuster les territoires d'outre-mer"  
**Nouveau nom :** "Paramètres par territoire"

**Raison :** Plus concis et couvre mieux les deux usages du composant (projections + transformations)

### 2. Clarification du Mode Individuel

#### Problème Identifié
Le mode "projection individuelle" était proposé pour le mode `composite-custom`, mais techniquement impossible à implémenter car :
- Les territoires sont repositionnés manuellement avec des translations X/Y
- Ils doivent tous partager la même projection de base pour former une carte unifiée
- Appliquer des projections différentes après repositionnement causerait des distorsions

#### Solution Appliquée
Le mode "projection individuelle" est maintenant **uniquement disponible pour le mode `split`** :

```typescript
const showProjectionModeToggle = computed(() => {
  // Show projection mode toggle only for split mode
  // Custom composite always uses uniform projection
  return viewMode.value === 'split'
})

const showIndividualProjectionSelectors = computed(() => {
  // Show per-territory projection selectors only in split mode
  return viewMode.value === 'split' && projectionMode.value === 'individual'
})
```

### 3. Logique de Sélection de Projection Mise à Jour

#### Mode Split
- **Uniforme** : Un dropdown de projection pour tous les territoires
- **Individuel** : Un dropdown par territoire dans "Paramètres par territoire"

#### Mode Composite Custom
- **Toujours uniforme** : Un seul dropdown de projection
- Le toggle "Mode de projection" n'apparaît plus
- Les accordéons dans "Paramètres par territoire" montrent uniquement Translation/Échelle

#### Mode Composite Existing
- **Toujours uniforme** : Dropdown pour choisir albers-france ou conic-conformal-france
- Pas de contrôles de transformation

## Architecture Finale des Modes

### Mode Split (Territoires Séparés)
```
┌─ Controls ────────────────────────────┐
│ Mode d'affichage: Territoires séparés │
│ Mode de projection: [Uniforme/Individuel] ← Toggle visible
│                                         │
│ SI Uniforme:                           │
│   └─ Projection: [Dropdown]           │
│                                         │
│ SI Individuel:                         │
│   └─ Paramètres par territoire         │
│      ├─ France Métropolitaine          │
│      │  └─ Projection: [Dropdown]      │
│      ├─ Guadeloupe                     │
│      │  └─ Projection: [Dropdown]      │
│      └─ ... (autres territoires)       │
└────────────────────────────────────────┘
```

### Mode Composite Custom
```
┌─ Controls ────────────────────────────┐
│ Mode d'affichage: Projection composite personnalisée
│ Projection: [Dropdown] ← Toujours uniforme
│ (Pas de toggle Mode de projection)    │
└────────────────────────────────────────┘

┌─ Right Panel ─────────────────────────┐
│ Paramètres par territoire              │
│ ├─ Guadeloupe                          │
│ │  ├─ Position X: [Slider]             │
│ │  ├─ Position Y: [Slider]             │
│ │  └─ Échelle: [Slider]                │
│ ├─ Martinique                          │
│ │  ├─ Position X: [Slider]             │
│ │  └─ ...                               │
│ └─ ... (autres territoires)            │
└────────────────────────────────────────┘
```

## Justification Technique

### Pourquoi pas de mode individuel en composite custom ?

1. **Architecture de renderVueComposite** :
   ```typescript
   // Crée une collection unifiée
   const unifiedFeatures = [...metropole, ...domtom]
   
   // Applique UNE SEULE projection à tous
   const plot = Plot.plot({
     projection: getProjection(selectedProjection),
     marks: [Plot.geo(unifiedCollection)]
   })
   ```

2. **Ordre des opérations** :
   - Chaque territoire est d'abord projeté individuellement
   - Puis repositionné avec translations X/Y
   - Puis tous assemblés dans une seule FeatureCollection
   - Enfin une projection uniforme est appliquée à l'ensemble
   
3. **Impossibilité technique** :
   - Appliquer des projections différentes après repositionnement nécessiterait :
     - Soit des transformations de coordonnées complexes
     - Soit des plots séparés superposés (pas de gestion du Z-index)
     - Soit une réécriture complète de l'algorithme de composition

4. **Cohérence visuelle** :
   - Une carte composite doit avoir une projection cohérente
   - Les grilles de longitude/latitude doivent être continues
   - Les échelles doivent être cohérentes entre territoires voisins

## Comportement Attendu

### En Mode Split + Individuel
✅ Chaque territoire peut avoir sa propre projection  
✅ Les cartes sont rendues séparément  
✅ Pas de problème de cohérence car elles ne sont pas assemblées  

### En Mode Composite Custom + Uniforme
✅ Une seule projection pour toute la carte  
✅ Repositionnement manuel possible  
✅ Export de projection fonctionne  
✅ Cohérence visuelle garantie  

### En Mode Composite Existing
✅ Utilise des projections composites prédéfinies  
✅ Repositionnement automatique  
✅ Pas de contrôles manuels nécessaires  

## Tests de Validation

### Test 1 : Mode Split
- [x] Toggle "Mode de projection" visible
- [x] Mode uniforme : un dropdown pour tous
- [x] Mode individuel : accordéons avec dropdown par territoire
- [x] France métropolitaine incluse dans les accordéons (mode individuel)

### Test 2 : Mode Composite Custom
- [x] Toggle "Mode de projection" **non visible**
- [x] Un seul dropdown de projection (toujours uniforme)
- [x] Accordéons avec Translation X/Y + Échelle uniquement
- [x] Pas de sélecteur de projection dans les accordéons

### Test 3 : Mode Composite Existing
- [x] Dropdown pour choisir la projection composite
- [x] Pas de toggle mode de projection
- [x] Pas de contrôles de transformation

### Test 4 : Transitions
- [x] Split Uniforme → Split Individuel : Accordéons apparaissent
- [x] Split → Composite Custom : Toggle disparaît, projection devient uniforme
- [x] Composite Custom → Split : Toggle réapparaît

## Conclusion

Ces changements clarifient l'interface et corrigent une impossibilité technique. Le mode "projection individuelle" est maintenant correctement limité au mode `split` où il a du sens, et le titre "Paramètres par territoire" reflète mieux les deux usages du composant.
