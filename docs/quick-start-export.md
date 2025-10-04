# Guide rapide : Export de projection

## En 3 étapes

### 1️⃣ Configurez visuellement

Dans l'onglet **"Vue unifiée personnalisable"** :

- Utilisez les **sliders** pour positionner chaque territoire
  - **X** : Position horizontale (-15 à +15)
  - **Y** : Position verticale (-10 à +10)
  - **Scale** : Taille (0.5x à 2.0x)
- La carte se met à jour **en temps réel**

### 2️⃣ Exportez votre configuration

Cliquez sur **"🗺️ Exporter la projection"**

Choisissez le format :
- **TypeScript (.ts)** : Code prêt à l'emploi
- **JSON (.json)** : Configuration pure

### 3️⃣ Utilisez le code

#### Option A : Code TypeScript

```typescript
// 1. Téléchargez ou copiez le fichier
// 2. Sauvegardez dans src/services/MyProjection.ts

// 3. Importez
import myProjection from './MyProjection'

// 4. Utilisez avec Observable Plot
const plot = Plot.plot({
  projection: myProjection(),
  marks: [Plot.geo(data, { fill: 'steelblue' })]
})

// Ou avec D3
const projection = myProjection()
const path = d3.geoPath(projection)
```

#### Option B : Configuration JSON

```json
{
  "baseProjection": "conic-conformal",
  "baseRotate": [-3, -46.2],
  "territories": [
    {
      "code": "FR-GF",
      "name": "Guyane",
      "translateXCoeff": 0.04,
      "translateYCoeff": -0.024,
      "scale": 1.2
    }
  ]
}
```

## Astuce

Utilisez l'**aperçu de projection** en bas des contrôles pour voir le résultat avant d'exporter !

## Questions fréquentes

**Q : Puis-je modifier le code généré ?**
R : Oui ! Le code TypeScript est totalement éditable. Vous pouvez ajuster les valeurs manuellement.

**Q : Comment revenir aux valeurs par défaut ?**
R : Rechargez la page. Les valeurs par défaut sont celles de `ConicConformalFrance`.

**Q : Puis-je partager ma configuration ?**
R : Oui ! Exportez en JSON et partagez le fichier. Les autres pourront l'importer (fonctionnalité à venir).

**Q : Ça fonctionne avec toutes les projections d3 ?**
R : Le système génère des projections compatibles avec d3-geo et Observable Plot.
