#!/usr/bin/env node

/**
 * Script de diagnostic des données géographiques
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '../public/data')

async function diagnosisData() {
  try {
    console.log('🔍 Diagnostic des données géographiques\n')
    
    // Vérifier les fichiers
    const francePath = path.join(dataDir, 'france-territories.json')
    const metaPath = path.join(dataDir, 'metadata.json')
    
    const franceData = JSON.parse(await fs.readFile(francePath, 'utf-8'))
    const metaData = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
    
    console.log('📊 Métadonnées:')
    console.log(`   Source: ${metaData.source} v${metaData.version}`)
    console.log(`   Territoires: ${metaData.territories.length}`)
    metaData.territories.forEach(t => {
      console.log(`     • ${t.name} (${t.code}) - ${t.area.toLocaleString()} km²`)
    })
    
    console.log('\n🗺️ Données TopoJSON:')
    console.log(`   Type: ${franceData.type}`)
    console.log(`   Arcs: ${franceData.arcs ? franceData.arcs.length : 'N/A'}`)
    console.log(`   Objets: ${Object.keys(franceData.objects).join(', ')}`)
    
    if (franceData.objects.territories) {
      const territories = franceData.objects.territories.geometries || []
      console.log(`   Geometries: ${territories.length}`)
      
      territories.forEach((geom, i) => {
        console.log(`     ${i+1}. ID: ${geom.id}, Type: ${geom.type}, Nom: ${geom.properties?.name || 'N/A'}`)
        
        // Vérifier les coordonnées
        if (geom.arcs) {
          console.log(`        Arcs: ${geom.arcs.length} groupe(s)`)
        }
      })
    }
    
    // Vérifier la cohérence
    const metaCount = metaData.territories.length
    const geomCount = franceData.objects.territories?.geometries?.length || 0
    
    console.log('\n✅ Vérifications:')
    console.log(`   Métadonnées: ${metaCount} territoires`)
    console.log(`   Géométries: ${geomCount} features`)
    
    if (metaCount === geomCount) {
      console.log('   ✅ Cohérence OK')
    } else {
      console.log('   ⚠️ Incohérence détectée!')
    }
    
  } catch (error) {
    console.error('❌ Erreur diagnostic:', error.message)
  }
}

diagnosisData()