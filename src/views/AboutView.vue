<script setup lang="ts">
import { RouterLink } from 'vue-router'
import CardContainer from '@/components/ui/CardContainer.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
</script>

<template>
  <div class="container mx-auto py-8 max-w-4xl">
    <div class="flex flex-col gap-6">
      <!-- Introduction -->
      <CardContainer
        title="Geo Projection Sandbox"
        icon="ri-map-2-line"
      >
        <div class="prose max-w-none space-y-4">
          <p class="text-lg">
            Un bac à sable pour expérimenter avec les projections géographiques composites,
            permettant de représenter des territoires éloignés avec des rapports de taille préservés.
          </p>
        </div>
      </CardContainer>

      <!-- The Problem -->
      <CardContainer
        title="Le défi cartographique"
        icon="ri-error-warning-line"
      >
        <div class="prose max-w-none space-y-4">
          <p>
            Représenter sur une même carte un pays et ses territoires dispersés géographiquement
            pose un défi : comment afficher ensemble des zones séparées par des milliers de kilomètres
            tout en conservant une cohérence visuelle ?
          </p>

          <p>
            La solution classique utilise des encarts repositionnés : la projection Albers USA, par exemple,
            intègre l'Alaska et Hawaï dans des cadres déplacés près du continent américain.
          </p>
          <p>
            Contrairement aux États-Unis, la France ne dispose pas de projection composite standardisée
            pour visualiser ensemble la métropole et les départements/collectivités d'outre-mer
            (Antilles, Guyane, océan Indien, Pacifique) avec des proportions et positionnements cohérents.
          </p>
        </div>
      </CardContainer>

      <!-- The Solution -->
      <CardContainer
        title="L'approche : projections composites interactives"
        icon="ri-compass-3-line"
      >
        <div class="prose max-w-none space-y-4">
          <p>
            Ce projet exploite les capacités de D3.js pour créer des projections composites interactives,
            en s'inspirant des recherches de <strong>Roger Veciana</strong> via la bibliothèque
            <code>d3-composite-projections</code>.
          </p>

          <SectionHeader
            title="Quatre modes de visualisation"
            :level="3"
          />

          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>Composite existante</strong> : Applique des projections géographiques professionnelles
              (France, Portugal, Europe) déjà paramétrées et validées
            </li>
            <li>
              <strong>Composite personnalisée</strong> : Construisez votre propre assemblage
              en contrôlant finement la position, l'orientation et l'échelle de chaque région
            </li>
            <li>
              <strong>Vues séparées</strong> : Affiche chaque territoire dans sa propre projection,
              en respectant les proportions géographiques réelles
            </li>
            <li>
              <strong>Vue unifiée</strong> : Rassemble tous les territoires dans une projection unique
              (pour observer les distorsions)
            </li>
          </ul>

          <SectionHeader
            title="Respect des proportions géographiques"
            :level="3"
          />

          <p>
            Les dimensions visuelles sont calculées à partir des superficies réelles pour maintenir
            une cohérence géographique :
          </p>

          <div class="bg-base-200 p-4 rounded-lg text-sm">
            <p class="font-mono">
              facteur_échelle = √(surface_territoire / surface_référence)
            </p>
            <p class="mt-2 text-xs opacity-70">
              Exemple concret : La Guyane (83 534 km²) comparée à la Martinique (1 128 km²)
              donne un rapport visuel de ~√74 ≈ 8.6 (la Guyane apparaît environ 9 fois plus grande)
            </p>
          </div>
        </div>
      </CardContainer>

      <!-- Regions -->
      <CardContainer
        title="Régions supportées"
        icon="ri-global-line"
      >
        <div class="prose max-w-none">
          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>France</strong> : Métropole + DOM-TOM (Guadeloupe, Martinique, Guyane, Réunion, Mayotte,
              Saint-Pierre-et-Miquelon, Saint-Martin, Saint-Barthélemy, Wallis-et-Futuna, Polynésie française, Nouvelle-Calédonie)
            </li>
            <li>
              <strong>Portugal</strong> : Continental + Régions autonomes (Açores, Madère)
            </li>
            <li>
              <strong>Union Européenne</strong> : 27 états membres avec projection composite Europe
            </li>
          </ul>
        </div>
      </CardContainer>

      <!-- Stack -->
      <CardContainer
        title="Technologies"
        icon="ri-code-box-line"
      >
        <div class="prose max-w-none">
          <ul class="list-disc pl-6 space-y-2 text-sm">
            <li><strong>D3.js</strong> + <strong>d3-composite-projections</strong> : Projections géographiques avancées</li>
            <li><strong>Observable Plot</strong> : Rendu des visualisations cartographiques</li>
            <li><strong>Vue 3</strong> + <strong>TypeScript</strong> : Interface réactive et typée</li>
            <li><strong>TopoJSON</strong> : Données géographiques optimisées (Natural Earth, OpenStreetMap)</li>
          </ul>
        </div>
      </CardContainer>

      <!-- CTA -->
      <div class="text-center py-6">
        <RouterLink
          to="/"
          class="btn btn-primary btn-lg"
        >
          <i class="ri-flask-line" />
          Expérimenter avec les projections
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
