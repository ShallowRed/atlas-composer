/**
 * Script de vérification des données géographiques
 */

async function verifyData() {
  try {
    console.log('🔍 Vérification des données géographiques...\n')
    
    // Vérifier les fichiers de données
    const files = [
      '/data/france-territories.json',
      '/data/metadata.json'
    ]
    
    for (const file of files) {
      try {
        const response = await fetch(file)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        console.log(`✅ ${file} - Taille: ${JSON.stringify(data).length} caractères`)
      } catch (error) {
        console.log(`❌ ${file} - Erreur: ${error.message}`)
      }
    }
    
    // Vérifier le service RealGeoDataService
    console.log('\n🗺️ Test du service de données...')
    
    const { RealGeoDataService } = await import('./src/services/RealGeoDataService.js')
    const service = new RealGeoDataService()
    
    await service.loadData()
    
    const territories = service.getTerritoryInfo()
    console.log(`📍 ${territories.length} territoires chargés:`)
    
    territories.forEach(territory => {
      console.log(`   • ${territory.name} (${territory.code}) - ${territory.area.toLocaleString()} km²`)
    })
    
    // Test des données par territoire
    console.log('\n🗺️ Test des données géographiques...')
    
    const metropole = await service.getMetropoleData()
    if (metropole) {
      console.log(`✅ France métropolitaine: ${metropole.features.length} feature(s)`)
    }
    
    const domtom = await service.getDOMTOMData()
    console.log(`✅ DOM-TOM: ${domtom.length} territoire(s)`)
    
    const unified = await service.getUnifiedData()
    if (unified) {
      console.log(`✅ Vue unifiée: ${unified.domtom.length} territoire(s) repositionné(s)`)
    }
    
    console.log('\n🎉 Vérification terminée avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
  }
}

// Lancer la vérification si le script est exécuté directement
if (typeof window !== 'undefined') {
  // Dans le navigateur
  verifyData()
} else {
  console.log('❌ Ce script doit être exécuté dans le navigateur')
  console.log('💡 Ouvrez http://localhost:5173 et exécutez verifyData() dans la console')
}