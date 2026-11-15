import type { PresetId } from '@/types/branded'
import { createPresetId } from '@/types/branded'

// Sequential blue ramp, light to dark, checked for color vision deficiencies
const SEQUENTIAL_BLUES = ['#cde2fb', '#9ec5f4', '#6da7ec', '#2a78d6', '#1c5cab', '#0d366b'] as const

export interface ExampleSource {
  label: string
  url: string
}

export interface ExampleDefinition {
  id: string
  presetId: PresetId
  // TopoJSON of src/public/examples, whose `entities` object has a `name`, a `group` and the value property
  dataPath: string
  valueProperty: string
  // thresholds[i] starts colors[i + 1]
  thresholds: number[]
  colors: readonly string[]
  // Key of examples.units in the translations
  unit: 'density'
  sources: ExampleSource[]
}

export const EXAMPLES: ExampleDefinition[] = [
  {
    id: 'france-density',
    presetId: createPresetId('france-standard'),
    dataPath: 'examples/france-departements.json',
    valueProperty: 'density',
    thresholds: [20, 50, 100, 300, 1000],
    colors: SEQUENTIAL_BLUES,
    unit: 'density',
    sources: [
      { label: 'INSEE, populations de référence 2022', url: 'https://www.insee.fr/fr/statistiques/8290591' },
      { label: 'INSEE, estimation de la population de Mayotte au 1er janvier 2022', url: 'https://www.insee.fr/fr/statistiques/serie/001760180' },
      { label: 'Etalab, contours administratifs 2024 (Licence Ouverte 2.0)', url: 'https://www.data.gouv.fr/fr/datasets/contours-administratifs/' },
    ],
  },
  {
    id: 'portugal-density',
    presetId: createPresetId('portugal-standard'),
    dataPath: 'examples/portugal-nuts3.json',
    valueProperty: 'density',
    thresholds: [25, 50, 100, 300, 800],
    colors: SEQUENTIAL_BLUES,
    unit: 'density',
    sources: [
      { label: 'Eurostat, demo_r_d3dens (2023)', url: 'https://ec.europa.eu/eurostat/databrowser/view/demo_r_d3dens/default/table' },
      { label: 'Eurostat GISCO, NUTS 2024 (© EuroGeographics)', url: 'https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units' },
    ],
  },
]
