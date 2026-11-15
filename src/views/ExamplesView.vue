<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CompositionDemo from '@/components/examples/CompositionDemo.vue'
import ExampleChoroplethMap from '@/components/examples/ExampleChoroplethMap.vue'
import ExampleSources from '@/components/examples/ExampleSources.vue'
import { COMPOSITION_SOURCES, EXAMPLES } from '@/core/examples'

const { t } = useI18n()

const SNIPPET = `import { getPreset } from '@atlas-composer/preset-library'
import { ProjectionLoader } from '@atlas-composer/projection-loader'
import { d3ProjectionFactories } from '@atlas-composer/projection-loader/helpers'
import { geoPath } from 'd3-geo'

const loader = new ProjectionLoader()
loader.registerAll(d3ProjectionFactories)

const preset = await getPreset('france-standard')
if (preset) {
  const path = geoPath(loader.load(preset, { width: 960, height: 500 }))
  svg.selectAll('path')
    .data(departements.features)
    .join('path')
    .attr('d', path)
}`
</script>

<template>
  <div class="flex flex-col gap-10">
    <header class="flex flex-col gap-4">
      <h1 class="text-3xl font-bold">
        {{ t('examples.title') }}
      </h1>
      <p class="text-lg text-base-content/80">
        {{ t('examples.intro') }}
      </p>
    </header>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold">
        {{ t('examples.composition.title') }}
      </h2>
      <p class="text-sm text-base-content/80">
        {{ t('examples.composition.description') }}
      </p>
      <CompositionDemo />
      <ExampleSources :sources="COMPOSITION_SOURCES" />
    </section>

    <div class="grid gap-10 lg:grid-cols-2">
      <section
        v-for="example in EXAMPLES"
        :key="example.id"
        class="flex flex-col gap-3"
      >
        <h2 class="text-xl font-semibold">
          {{ t(`examples.${example.id}.title`) }}
        </h2>
        <p class="text-sm text-base-content/80">
          {{ t(`examples.${example.id}.description`) }}
        </p>
        <ExampleChoroplethMap :example="example" />
        <ExampleSources :sources="example.sources" />
      </section>
    </div>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold">
        {{ t('examples.code.title') }}
      </h2>
      <p>
        {{ t('examples.code.description') }}
      </p>
      <pre class="overflow-x-auto rounded-box border border-base-300 bg-base-100 p-4 text-sm"><code>{{ SNIPPET }}</code></pre>
    </section>
  </div>
</template>
