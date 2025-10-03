#!/usr/bin/env node

/**
 * Script pour télécharger et préparer les données géographiques Natural Earth
 * pour la France et ses territoires d'outre-mer
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '../public/data')

// URLs Natural Earth pour les données 50m (résolution moyenne)
const NATURAL_EARTH_URLS = {
  countries: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
  land: 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json'
}

// IDs et noms pour les territoires français (Natural Earth - réels trouvés)
const FRANCE_TERRITORIES = {
  // Territoires confirmés présents dans Natural Earth 50m
  '250': { name: 'France métropolitaine', code: 'FR-MET', iso: 'FRA' },
  '666': { name: 'Saint-Pierre-et-Miquelon', code: 'FR-PM', iso: 'SPM' },
  '876': { name: 'Wallis-et-Futuna', code: 'FR-WF', iso: 'WLF' },
  '258': { name: 'Polynésie française', code: 'FR-PF', iso: 'PYF' },
  '540': { name: 'Nouvelle-Calédonie', code: 'FR-NC', iso: 'NCL' },
  '260': { name: 'Terres australes françaises', code: 'FR-TF', iso: 'ATF' },
  '663': { name: 'Saint-Martin', code: 'FR-MF', iso: 'MAF' }
}

async function downloadData(url, filename) {
  try {
    console.log(`📥 Téléchargement: ${filename}`)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = await response.json()
    
    const filepath = path.join(dataDir, filename)
    await fs.writeFile(filepath, JSON.stringify(data, null, 2))
    console.log(`✅ Sauvegardé: ${filepath}`)
    return data
  } catch (error) {
    console.error(`❌ Erreur téléchargement ${filename}:`, error.message)
    throw error
  }
}

function filterFranceData(worldData) {
  const franceFeatures = []
  
  if (worldData.objects && worldData.objects.countries) {
    // TopoJSON format
    const countries = worldData.objects.countries.geometries || []
    
    for (const country of countries) {
      const countryId = country.id?.toString()
      if (FRANCE_TERRITORIES[countryId]) {
        const territory = FRANCE_TERRITORIES[countryId]
        franceFeatures.push({
          ...country,
          properties: {
            ...country.properties,
            name: territory.name,
            code: territory.code,
            iso: territory.iso,
            id: countryId
          }
        })
      }
    }
    
    console.log(`🔍 Trouvé ${franceFeatures.length} territoires français sur ${countries.length} pays`)
  }
  
  return {
    type: 'Topology',
    arcs: worldData.arcs,
    // Préserver la transformation TopoJSON pour les coordonnées géographiques correctes
    transform: worldData.transform,
    objects: {
      territories: {
        type: 'GeometryCollection',
        geometries: franceFeatures
      }
    }
  }
}

function createMetadata() {
  return {
    source: 'Natural Earth',
    version: '5.1.2',
    resolution: '50m',
    projection: 'WGS84',
    territories: Object.entries(FRANCE_TERRITORIES).map(([id, info]) => ({
      id,
      iso: info.iso,
      name: info.name,
      code: info.code,
      // Superficies approximatives en km²
      area: getApproximateArea(id)
    }))
  }
}

function getApproximateArea(territoryId) {
  const areas = {
    '250': 543965,  // France métropolitaine
    '666': 242,     // Saint-Pierre-et-Miquelon
    '876': 142,     // Wallis-et-Futuna
    '258': 4167,    // Polynésie française
    '540': 18575,   // Nouvelle-Calédonie
    '260': 439781,  // Terres australes françaises
    '663': 53       // Saint-Martin
  }
  return areas[territoryId] || 0
}

async function main() {
  try {
    // Créer le dossier data s'il n'existe pas
    await fs.mkdir(dataDir, { recursive: true })
    
    console.log('🌍 Préparation des données géographiques Natural Earth')
    console.log('='.repeat(50))
    
    // Télécharger les données mondiales
    const worldCountries = await downloadData(
      NATURAL_EARTH_URLS.countries, 
      'world-countries-50m.json'
    )
    
    // Filtrer pour la France et ses territoires
    console.log('🇫🇷 Extraction des territoires français...')
    const franceData = filterFranceData(worldCountries)
    
    // Sauvegarder les données France
    const francePath = path.join(dataDir, 'france-territories.json')
    await fs.writeFile(francePath, JSON.stringify(franceData, null, 2))
    console.log(`✅ Données France sauvegardées: ${francePath}`)
    
    // Créer les métadonnées
    const metadata = createMetadata()
    const metadataPath = path.join(dataDir, 'metadata.json')
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
    console.log(`✅ Métadonnées créées: ${metadataPath}`)
    
    console.log('\n🎉 Préparation des données terminée!')
    console.log(`📊 ${franceData.objects.territories.geometries.length} territoires préparés`)
    
  } catch (error) {
    console.error('💥 Erreur lors de la préparation:', error.message)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}