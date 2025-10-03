# Cartographies de la France avec DOM-TOM

Ce projet permet de créer des visualisations cartographiques de la France métropolitaine et de ses départements et collectivités d'outre-mer (DOM-TOM), en préservant les rapports de taille réels entre les territoires.

## 🎯 Objectifs

- **Représentation côte à côte** : Afficher la métropole et les DOM-TOM de manière adjacente
- **Préservation des échelles** : Conserver les rapports de taille réels pour montrer la véritable étendue de territoires comme la Guyane
- **Projections géographiques avancées** : Utiliser des projections optimisées pour chaque territoire
- **Interactivité** : Permettre de basculer entre différentes projections et modes d'affichage

## 🛠️ Technologies utilisées

- **[Vite](https://vitejs.dev/)** : Build tool et serveur de développement
- **[TypeScript](https://www.typescriptlang.org/)** : Langage de programmation
- **[Observable Plot](https://observablehq.com/plot/)** : Bibliothèque de visualisation de données
- **[D3.js](https://d3js.org/)** : Manipulation des données géographiques
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

# Lancer le serveur de développement
pnpm dev
```

Le projet sera accessible à l'adresse [http://localhost:5173](http://localhost:5173)

### Build de production

```bash
pnpm build
```

## 📁 Structure du projet

```
src/
├── cartographer/
│   └── FranceCartographer.ts    # Classe principale de cartographie
├── services/
│   ├── FranceGeoDataService.ts  # Gestion des données géographiques
│   └── GeoProjectionService.ts  # Service des projections géographiques
├── styles.css                   # Styles CSS
└── main.ts                      # Point d'entrée de l'application
```

## 🗺️ Fonctionnalités

### Cartes disponibles

1. **France Métropolitaine** : Projection optimisée pour le territoire hexagonal
2. **DOM-TOM individuels** : Chaque territoire dans sa propre projection
3. **Vue unifiée** : Repositionnement des DOM-TOM à côté de la métropole

### Projections supportées

- **Albers** : Projection conique équivalente, optimisée pour la France
- **Mercator** : Projection cylindrique conforme
- **Equal Earth** : Projection pseudo-cylindrique équivalente

### Options d'affichage

- Préservation des rapports de taille réels
- Basculement entre différentes projections
- Vue comparative des territoires

## 🎨 Interface utilisateur

L'interface comprend :

- **Contrôles** : Sélecteur de projection et options d'affichage
- **Cartes séparées** : Métropole et DOM-TOM côte à côte
- **Vue unifiée** : Carte composite avec repositionnement
- **Informations** : Statistiques sur les territoires (superficie, etc.)

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
2. Filtre les territoires français (métropole + DOM-TOM)
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

### Extension

Pour ajouter de nouvelles fonctionnalités :

1. **Nouvelles projections** : Étendre `GeoProjectionService`
2. **Nouveaux territoires** : Modifier `FranceGeoDataService`
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