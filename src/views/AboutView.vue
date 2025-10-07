<script setup lang="ts">
import { RouterLink } from 'vue-router'
import CardContainer from '@/components/ui/CardContainer.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
</script>

<template>
  <div class="container mx-auto py-8">
    <div class="flex flex-col gap-6">
      <!-- Back Navigation -->
      <div class="flex items-center gap-4">
        <RouterLink
          to="/"
          class="btn btn-ghost btn-sm"
        >
          <i class="ri-arrow-left-line" />
          Retour à la carte
        </RouterLink>
      </div>

      <!-- Introduction -->
      <CardContainer
        title="À propos"
        icon="ri-information-line"
      >
        <div class="prose max-w-none">
          <p class="lead text-lg">
            Un outil de visualisation cartographique permettant de représenter fidèlement les territoires
            avec des projections géographiques avancées et une préservation des rapports de taille.
          </p>
        </div>
      </CardContainer>

      <!-- Why Section -->
      <CardContainer
        title="Pourquoi ce projet ?"
        icon="ri-lightbulb-line"
      >
        <div class="prose max-w-none space-y-4">
          <SectionHeader
            title="Le problème des représentations cartographiques classiques"
            :level="3"
            icon="ri-error-warning-line"
          />
          <p>
            Les représentations cartographiques traditionnelles des territoires avec zones ultramarines
            présentent plusieurs limites :
          </p>
          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>Distorsions de taille</strong> : Les territoires éloignés sont souvent représentés
              à des échelles arbitraires, donnant une perception faussée de leur superficie réelle.
            </li>
            <li>
              <strong>Projections inappropriées</strong> : L'utilisation d'une seule projection pour des
              territoires répartis sur plusieurs continents crée des distorsions importantes.
            </li>
            <li>
              <strong>Manque de flexibilité</strong> : Les outils existants ne permettent pas facilement
              d'expérimenter avec différentes projections et configurations.
            </li>
          </ul>

          <SectionHeader
            title="Notre approche"
            :level="3"
            icon="ri-compass-3-line"
          />
          <p>
            Ce projet propose une solution moderne et flexible pour créer des cartes précises et informatives :
          </p>
          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>Préservation des rapports de taille</strong> : Utilisation de calculs géographiques
              précis pour maintenir les proportions réelles entre les territoires.
            </li>
            <li>
              <strong>Projections composites</strong> : Combinaison de plusieurs projections optimisées
              pour chaque région géographique (métropole, Caraïbes, océan Indien, Pacifique).
            </li>
            <li>
              <strong>Flexibilité et personnalisation</strong> : Possibilité de choisir différentes projections,
              d'ajuster les positions et échelles, et d'exporter les configurations.
            </li>
          </ul>
        </div>
      </CardContainer>

      <!-- How Section -->
      <CardContainer
        title="Comment ça marche ?"
        icon="ri-tools-line"
      >
        <div class="prose max-w-none space-y-4">
          <SectionHeader
            title="Technologies utilisées"
            :level="3"
            icon="ri-code-box-line"
          />
          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>Vue 3</strong> : Framework JavaScript moderne pour une interface réactive et performante.
            </li>
            <li>
              <strong>D3.js</strong> : Bibliothèque de visualisation de données avec support avancé des projections géographiques.
            </li>
            <li>
              <strong>Observable Plot</strong> : Outil de visualisation pour créer des graphiques et cartes de qualité.
            </li>
            <li>
              <strong>TopoJSON</strong> : Format de données géographiques optimisé pour le web.
            </li>
            <li>
              <strong>d3-composite-projections</strong> : Extension D3 pour les projections composites (France, Portugal, Europe).
            </li>
          </ul>

          <SectionHeader
            title="Fonctionnalités principales"
            :level="3"
            icon="ri-star-line"
          />

          <div class="space-y-4">
            <div class="bg-base-200 p-4 rounded-lg">
              <h4 class="font-semibold mb-2">
                <i class="ri-layout-grid-line" />
                Modes d'affichage
              </h4>
              <ul class="list-disc pl-6 space-y-1 text-sm">
                <li><strong>Territoires séparés</strong> : Chaque territoire dans sa propre carte</li>
                <li><strong>Projection composite existante</strong> : Utilise les projections D3 optimisées (France, Portugal, Europe)</li>
                <li><strong>Projection composite personnalisée</strong> : Créez votre propre composition avec contrôles manuels</li>
                <li><strong>Projection unifiée</strong> : Tous les territoires dans une seule vue</li>
              </ul>
            </div>

            <div class="bg-base-200 p-4 rounded-lg">
              <h4 class="font-semibold mb-2">
                <i class="ri-global-line" />
                Régions supportées
              </h4>
              <ul class="list-disc pl-6 space-y-1 text-sm">
                <li><strong>France</strong> : Métropole + DOM-TOM (Guadeloupe, Martinique, Guyane, Réunion, Mayotte, etc.)</li>
                <li><strong>Portugal</strong> : Continental + Régions autonomes (Açores, Madère)</li>
                <li><strong>Union Européenne</strong> : Tous les états membres</li>
              </ul>
            </div>

            <div class="bg-base-200 p-4 rounded-lg">
              <h4 class="font-semibold mb-2">
                <i class="ri-settings-3-line" />
                Options de personnalisation
              </h4>
              <ul class="list-disc pl-6 space-y-1 text-sm">
                <li>Plus de 20 projections géographiques disponibles</li>
                <li>Modes de projection uniforme ou individuelle par territoire</li>
                <li>Préservation des rapports de taille basée sur les superficies réelles</li>
                <li>Sélection des territoires à inclure (métropole seule, avec majeurs, tous)</li>
                <li>Contrôles de translation, rotation et échelle pour les projections personnalisées</li>
              </ul>
            </div>
          </div>

          <SectionHeader
            title="Calcul des échelles proportionnelles"
            :level="3"
            icon="ri-ruler-line"
          />
          <p>
            L'application utilise les superficies géographiques réelles pour calculer des échelles proportionnelles :
          </p>
          <ul class="list-disc pl-6 space-y-2">
            <li>
              Les données incluent les superficies en km² pour chaque territoire
            </li>
            <li>
              Un algorithme calcule le rapport entre la superficie réelle et l'aire projetée
            </li>
            <li>
              Les échelles sont ajustées pour que tous les territoires respectent les mêmes proportions
            </li>
          </ul>
          <div class="alert alert-info mt-4">
            <i class="ri-information-line" />
            <span class="text-sm">
              Exemple : La Guyane (83 534 km²) apparaît environ 3 fois plus grande que la Martinique (1 128 km²),
              reflétant leur rapport de superficie réel de ~74:1.
            </span>
          </div>
        </div>
      </CardContainer>

      <!-- Use Cases -->
      <CardContainer
        title="Cas d'usage"
        icon="ri-apps-line"
      >
        <div class="prose max-w-none">
          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>Éducation</strong> : Enseigner la géographie avec des représentations précises des territoires.
            </li>
            <li>
              <strong>Journalisme</strong> : Créer des visualisations de données géographiques pour des articles.
            </li>
            <li>
              <strong>Recherche</strong> : Analyser des données spatiales avec des projections appropriées.
            </li>
            <li>
              <strong>Administration</strong> : Visualiser des données administratives à l'échelle régionale ou nationale.
            </li>
          </ul>
        </div>
      </CardContainer>

      <!-- Technical Details -->
      <CardContainer
        title="Détails techniques"
        icon="ri-file-code-line"
      >
        <div class="prose max-w-none space-y-4">
          <SectionHeader
            title="Architecture"
            :level="3"
          />
          <ul class="list-disc pl-6 space-y-2 text-sm">
            <li><strong>Frontend</strong> : Vue 3 avec Composition API, TypeScript, Vite</li>
            <li><strong>State Management</strong> : Pinia stores pour la configuration et les données géographiques</li>
            <li><strong>Styling</strong> : Tailwind CSS 4 + daisyUI 5 pour l'interface utilisateur</li>
            <li><strong>Visualisation</strong> : D3.js + Observable Plot pour le rendu des cartes</li>
            <li><strong>Données</strong> : TopoJSON avec différentes résolutions (10m, 50m)</li>
          </ul>

          <SectionHeader
            title="Sources de données"
            :level="3"
          />
          <ul class="list-disc pl-6 space-y-2 text-sm">
            <li><strong>Géométries</strong> : Natural Earth, OpenStreetMap, données administratives officielles</li>
            <li><strong>Métadonnées</strong> : Superficies, populations, codes ISO</li>
          </ul>
        </div>
      </CardContainer>

      <!-- Footer -->
      <div class="text-center py-6">
        <RouterLink
          to="/"
          class="btn btn-primary btn-lg"
        >
          <i class="ri-map-2-line" />
          Explorer les cartes
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prose {
  color: oklch(var(--bc));
}

.prose strong {
  color: oklch(var(--bc));
  font-weight: 600;
}

.prose .lead {
  color: oklch(var(--bc) / 0.8);
}

.alert-info {
  background-color: oklch(var(--in) / 0.1);
  border: 1px solid oklch(var(--in) / 0.3);
  color: oklch(var(--inc));
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: start;
}
</style>
