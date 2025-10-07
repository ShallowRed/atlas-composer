# Cartographies de la France avec territoires ultramarins

Ce projet permet de créer des visualisations cartographiques de la France métropolitaine et de ses départements et collectivités d'outre-mer (territoires ultramarins), en préservant les rapports de taille réels entre les territoires.

## 🎯 Objectifs

- **Représentation côte à côte** : Afficher la métropole et les territoires ultramarins de manière adjacente
- **Préservation des échelles** : Conserver les rapports de taille réels pour montrer la véritable étendue de territoires comme la Guyane
- **Projections géographiques avancées** : Utiliser des projections optimisées pour chaque territoire
- **Interactivité** : Permettre de basculer entre différentes projections et modes d'affichage

## 🛠️ Technologies utilisées

- **[Vite](https://vitejs.dev/)** : Build tool et serveur de développement
- **[TypeScript](https://www.typescriptlang.org/)** : Langage de programmation
- **[Vue.js 3](https://vuejs.org/)** : Framework réactif pour l'interface utilisateur
- **[Pinia](https://pinia.vuejs.org/)** : Gestion d'état pour Vue.js
- **[Tailwind CSS](https://tailwindcss.com/)** : Framework CSS utility-first
- **[DaisyUI](https://daisyui.com/)** : Composants UI basés sur Tailwind
- **[Observable Plot](https://observablehq.com/plot/)** : Bibliothèque de visualisation de données
- **[D3.js](https://d3js.org/)** : Manipulation des données géographiques et projections
- **[d3-composite-projections](https://github.com/rveciana/d3-composite-projections)** : Projections composites pour la France
- **[TopoJSON](https://github.com/topojson/topojson)** : Format de données géographiques optimisé

## 🚀 Démarrage rapide

### Prérequis

- Node.js version 22.12+ (recommandé)
- pnpm (gestionnaire de paquets)

### Installation

```bash
# Cloner le projet
git clone <url-du-repo>
cd cartos-resp

# Installer les dépendances
pnpm install

# Préparer les données géographiques (optionnel si déjà générées)
node scripts/prepare-geodata.js france

# Lancer le serveur de développement
pnpm dev
```

Le projet sera accessible à l'adresse [http://localhost:5173](http://localhost:5173)

### Build de production

```bash
pnpm build
```

## 📁 Architecture du projet

Le projet suit une architecture en couches avec séparation des préoccupations :

### Structure des répertoires

```
src/
├── data/territories/              # 📊 Couche de données
│   ├── france.data.ts            # Données géographiques de la France
│   ├── portugal.data.ts          # Données géographiques du Portugal
│   ├── eu.data.ts                # Données géographiques de l'UE
│   └── index.ts                  # Registre central des données
│
├── config/regions/               # ⚙️ Couche de configuration
│   ├── types.ts                  # Types TypeScript pour la config
│   ├── france.config.ts          # Configuration spécifique France
│   ├── portugal.config.ts        # Configuration spécifique Portugal
│   ├── eu.config.ts              # Configuration spécifique UE
│   └── index.ts                  # Registre central des configs
│
├── services/                     # 🔧 Couche métier
│   ├── TerritoryService.ts       # Utilitaires génériques pour territoires
│   ├── RegionService.ts          # Accès aux données par région
│   ├── CartographerFactory.ts    # Factory pour créer des cartographes
│   ├── GeoDataService.ts         # Service de chargement des données
│   └── GeoProjectionService.ts   # Service de projections géographiques
│
├── cartographer/                 # 🗺️ Moteur cartographique
│   └── Cartographer.ts           # Classe principale de rendu
│
├── stores/                       # 💾 Gestion d'état (Pinia)
│   ├── config.ts                 # Store de configuration UI
│   └── geoData.ts                # Store des données géographiques
│
├── components/                   # 🎨 Composants Vue
│   ├── MapRenderer.vue           # Rendu des cartes
│   ├── TerritoryControls.vue    # Contrôles des territoires
│   └── ui/                       # Composants UI réutilisables
│
├── views/                        # 📄 Pages
│   ├── MapView.vue               # Vue principale des cartes
│   └── AboutView.vue             # Page À propos
│
└── types/                        # 📝 Définitions TypeScript
    └── territory.d.ts            # Types pour territoires et régions
```

### Principes d'architecture

1. **Séparation des préoccupations**
   - **Data** : Données géographiques pures (coordinates, bounds, etc.)
   - **Config** : Configuration spécifique à chaque région (modes, projections, etc.)
   - **Services** : Logique métier et utilitaires

2. **Agnostique de la région**
   - Aucune dépendance dure vers une région spécifique
   - Ajout d'une nouvelle région = 2 fichiers (data + config)
   - Les services fonctionnent avec n'importe quelle région

3. **Factory Pattern**
   - `CartographerFactory` gère la création d'instances par région
   - Cache intégré pour optimiser les performances
   - Configuration automatique selon la région

4. **Service Layer**
   - `TerritoryService` : Opérations génériques (statiques)
   - `RegionService` : Accès contextualisé par région (instance)

### Migration depuis l'ancienne architecture

Si vous utilisez l'ancienne structure (`src/constants/territories/`), consultez le [Guide de Migration](.github/MIGRATION_GUIDE.md) pour migrer vers la nouvelle architecture.

**Fichiers dépréciés** :
- ⚠️ `src/constants/territories/france-territories.ts`
- ⚠️ `src/constants/territories/portugal-territories.ts`
- ⚠️ `src/constants/territories/eu-territories.ts`
- ⚠️ `src/constants/regions.ts`

## 🗺️ Fonctionnalités principales

### 1. Vue unifiée personnalisable

**Carte interactive avec contrôles de positionnement en temps réel**

- Sliders pour ajuster la position X/Y de chaque territoire d'outre-mer (-15 à +15, -10 à +10)
- Contrôle du scale (échelle) de 0.5x à 2.0x pour chaque territoire
- Aperçu en temps réel des modifications
- **🆕 Export de projection** : Générez du code TypeScript ou JSON à partir de votre configuration

### 2. Projection composite automatique

**Utilise les projections d3-composite-projections**

- **Conic Conformal France** : Projection conforme avec territoires ultramarins pré-positionnés
- Rendu optimisé pour la France avec tous ses territoires

### 3. Vues territoriales individuelles

**Cartes séparées pour chaque territoire**

- France métropolitaine avec projection optimisée
- 11 territoires d'outre-mer avec projections Mercator individuelles
- Grille responsive avec DaisyUI

## 🎯 Système d'export de projection

### Fonctionnement

1. **Configuration visuelle** : Utilisez les sliders dans l'onglet "Vue unifiée personnalisable"
2. **Aperçu temps réel** : La carte se met à jour instantanément
3. **Export** : Cliquez sur "🗺️ Exporter la projection"
4. **Choix du format** :
   - **TypeScript (.ts)** : Fonction de projection prête à l'emploi, similaire à `ConicConformalFrance`
   - **JSON (.json)** : Configuration pure pour persistence ou import
5. **Actions** : Copiez ou téléchargez le code généré

### Utilisation du code exporté

```typescript
// Fichier généré : custom-projection.ts
import customCompositeProjection from './custom-projection'

// Utilisation identique à d3-composite-projections
const projection = customCompositeProjection()
  .scale(2700)
  .translate([width / 2, height / 2])

// Utilisable directement avec Observable Plot ou D3.js
Plot.plot({
  projection,
  marks: [Plot.geo(data, { fill: 'steelblue' })]
})
```

### Paramètres de mapping

Le système convertit automatiquement vos paramètres visuels en code de projection :

| Paramètre UI | Paramètre D3 | Description |
|--------------|--------------|-------------|
| `translateX` (-15 à +15) | `coeffX * k` | Position horizontale relative au scale |
| `translateY` (-10 à +10) | `coeffY * k` | Position verticale relative au scale |
| `scale` (0.5 à 2.0) | `baseScale * multiplier` | Taille relative du territoire |

## 🎨 Architecture Vue.js

### Stores Pinia

- **`useConfigStore`** : Configuration globale (thème, projection, territoires)
  - `territoryTranslations`: Position X/Y de chaque territoire
  - `territoryScales`: Échelle de chaque territoire
  - `selectedProjection`: Projection active
  - `territoryMode`: Mode d'inclusion des territoires

- **`useGeoDataStore`** : Données géographiques et rendu
  - Chargement des TopoJSON
  - Repositionnement des territoires
  - Rendering via Cartographer

### Composants Vue

- **`App.vue`** : Layout principal avec tabs DaisyUI
- **`MapRenderer.vue`** : Composant générique et polyvalent pour tous les types de cartes (simple, vue-composite, projection-composite)
- **`TerritoryControls.vue`** : Sliders de contrôle pour repositionnement des territoires
- **`ProjectionExporter.vue`** : Modal d'export avec preview (TypeScript/JSON)
- **`ProjectionPreview.vue`** : Aperçu en temps réel de la projection générée

## 📊 Données géographiques

Le projet utilise maintenant **de vraies données géographiques** issues de Natural Earth :

- **Source** : [Natural Earth v5.1.2](https://www.naturalearthdata.com/)
- **Résolution** : 50m (équilibre entre précision et taille des fichiers)
- **Format** : TopoJSON optimisé
- **Mise à jour** : Automatique via script de téléchargement

### Préparation des données

```bash
# Télécharger et traiter les données Natural Earth
pnpm run prepare-data
```

Ce script :
1. Télécharge les données mondiales Natural Earth
2. Filtre les territoires français (métropole + territoires ultramarins)
3. Optimise le format TopoJSON
4. Génère les métadonnées (superficies, codes, etc.)

### Territoires couverts

| Territoire | Code | Superficie (km²) |
|------------|------|------------------|
| France métropolitaine | FR-MET | 543 965 |
| Guadeloupe | FR-GP | 1 628 |
| Martinique | FR-MQ | 1 128 |
| Guyane | FR-GF | 83 534 |
| La Réunion | FR-RE | 2 512 |
| Mayotte | FR-YT | 374 |
| Saint-Pierre-et-Miquelon | FR-PM | 242 |
| Wallis-et-Futuna | FR-WF | 142 |
| Polynésie française | FR-PF | 4 167 |
| Nouvelle-Calédonie | FR-NC | 18 575 |

## 🔧 Développement

### Architecture

Le projet suit une architecture modulaire avec séparation des responsabilités :

- **FranceCartographer** : Orchestration et rendu des cartes
- **GeoProjectionService** : Gestion des projections géographiques
- **FranceGeoDataService** : Chargement et manipulation des données

### Préparation des données géographiques

Le projet utilise un système de configuration modulaire pour générer les données géographiques :

```bash
# Préparer les données pour la France (par défaut)
node scripts/prepare-geodata.js france

# Préparer les données pour l'Espagne
node scripts/prepare-geodata.js spain

# Préparer les données pour l'UE
node scripts/prepare-geodata.js eu

# Utiliser une résolution différente (10m = haute précision)
NE_RESOLUTION=10m node scripts/prepare-geodata.js france
```

#### Créer une nouvelle configuration

1. Créez un fichier dans `scripts/configs/` (ex: `portugal.js`) :

```javascript
export default {
  name: 'Portugal',
  description: 'Portugal and autonomous regions',
  territories: {
    620: { name: 'Portugal', code: 'PT', iso: 'PRT' },
  },
  outputName: 'portugal-territories',
}
```

2. Exécutez le script avec votre configuration :

```bash
node scripts/prepare-geodata.js portugal
```

Voir [`scripts/configs/README.md`](scripts/configs/README.md) pour plus de détails.

### Extension

Pour ajouter de nouvelles fonctionnalités :

1. **Nouvelles projections** : Étendre `GeoProjectionService`
2. **Nouveaux territoires** : Ajouter une configuration dans `scripts/configs/`
3. **Nouveaux types de visualisation** : Étendre `FranceCartographer`

### Tests

```bash
# Lancer les tests (à implémenter)
pnpm test
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forker le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous license MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- [Observable](https://observablehq.com/) pour les bibliothèques de visualisation
- [Mike Bostock](https://bost.ocks.org/mike/) pour D3.js
- La communauté des développeurs de cartographie web

---

*Développé avec ❤️ pour une meilleure représentation cartographique de la France*
