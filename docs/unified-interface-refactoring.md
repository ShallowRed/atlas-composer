# Refactorisation de l'Interface Unifiée

## Vue d'ensemble

Cette refactorisation transforme l'interface à 3 onglets en une interface à onglet unique avec un système de contrôles conditionnels basé sur le mode de vue sélectionné.

## Nouveau Modèle de Données

### Types

```typescript
export type ViewMode = 'split' | 'composite-existing' | 'composite-custom'
export type ProjectionMode = 'uniform' | 'individual'
```

### État

- `viewMode`: Mode de vue principal (3 options)
- `projectionMode`: Mode de projection uniform/individual
- `compositeProjection`: Projection composite sélectionnée (albers-france / conic-conformal-france)
- `territoryProjections`: Projections individuelles par territoire
- `selectedProjection`: Projection uniforme pour tous les territoires

## Structure de l'Interface

### Dropdown Principal (viewMode)

1. **Territoires séparés** (`split`)
   - Affiche les cartes individuelles (métropole + grille DOM-TOM)
   - Active le toggle uniform/individual
   - Active le sélecteur d'échelle

2. **Projection composite existante** (`composite-existing`)
   - Affiche un dropdown pour choisir entre albers-france et conic-conformal-france
   - Utilise les projections d3-composite-projections

3. **Projection composite personnalisée** (`composite-custom`)
   - Affiche les contrôles de positionnement manuel
   - Active le toggle uniform/individual
   - Permet d'exporter la projection générée

### Toggle Projection (projectionMode)

Visible pour les modes `split` et `composite-custom` :

- **Uniforme** (`uniform`): Une seule projection pour tous les territoires
  - Affiche un dropdown de projections
  - Applique la même projection partout

- **Individuelle** (`individual`): Projection par territoire
  - Affiche un dropdown par territoire dans les contrôles
  - Permet de choisir une projection différente pour chaque territoire

## Comportements Conditionnels

### Contrôles Visibles par Mode

| Contrôle | split | composite-existing | composite-custom |
|----------|-------|-------------------|------------------|
| Toggle Projection Mode | ✓ | ✗ | ✓ |
| Dropdown Projection (uniform) | ✓ | ✗ | ✓ |
| Dropdowns par territoire (individual) | ✓ | ✗ | ✓ |
| Dropdown Composite Projection | ✗ | ✓ | ✗ |
| Contrôles de Positionnement | ✗ | ✗ | ✓ |
| Exportateur de Projection | ✗ | ✗ | ✓ |
| Toggle Préservation d'Échelle | ✓ | ✗ | ✗ |

### Rendu par Mode

| Mode | Composant Rendu | Props |
|------|----------------|-------|
| split | MapRenderer (mode="simple") × N | geoData, projection |
| composite-existing | MapRenderer (mode="composite") | compositeMode |
| composite-custom | MapRenderer (mode="composite") | compositeMode="custom" |

## Migration

### Changements dans le Store

**Avant:**
```typescript
activeTab: 'composite' | 'individual-territories'
compositeMode: 'custom' | 'albers-france' | 'conic-conformal-france'
selectedProjection: string
```

**Après:**
```typescript
viewMode: 'split' | 'composite-existing' | 'composite-custom'
projectionMode: 'uniform' | 'individual'
compositeProjection: 'albers-france' | 'conic-conformal-france'
territoryProjections: Record<string, string>
selectedProjection: string // Pour mode uniforme
```

### Changements dans App.vue

**Avant:** 2 onglets séparés (composite, individual-territories)

**Après:** 1 onglet unique avec dropdown principal

## Avantages

1. **Interface Plus Simple**: Un seul onglet au lieu de plusieurs
2. **Flexibilité Accrue**: Projection par territoire même en mode composite
3. **Cohérence**: Même structure de contrôles pour split et composite-custom
4. **Clarté**: Les options sont regroupées logiquement

## Implémentation

### Étape 1: Mise à jour du Store ✓
- Ajout des nouveaux types
- Ajout des nouveaux états
- Mise à jour des computed properties
- Ajout des nouvelles actions

### Étape 2: Mise à jour de App.vue
- Suppression des tabs multiples
- Ajout du dropdown principal viewMode
- Ajout du toggle projectionMode
- Mise à jour des contrôles conditionnels

### Étape 3: Mise à jour de MapRenderer
- Support du nouveau mode composite avec projectionMode
- Gestion des projections individuelles par territoire

### Étape 4: Mise à jour de TerritoryTranslationControls
- Ajout des dropdowns de projection par territoire (mode individual)
- Renommage en "PerTerritorySettings" pour refléter le nouveau rôle

### Étape 5: Tests
- Vérifier chaque mode de vue
- Vérifier les transitions entre modes
- Vérifier les projections uniform/individual
