import * as Plot from '@observablehq/plot'

export class SimpleDebugCartographer {
  async init() {
    console.log('🔍 DEBUG: Initialisation cartographe simple...')
    
    try {
      // Test 1: Vérification des fichiers de données
      console.log('📁 Test chargement fichiers...')
      
      const metaResponse = await fetch('/data/metadata.json')
      const meta = await metaResponse.json()
      console.log('✅ Métadonnées:', meta.territories.length, 'territoires')
      
      const dataResponse = await fetch('/data/france-territories.json')
      const topoData = await dataResponse.json()
      console.log('✅ TopoJSON:', Object.keys(topoData.objects))
      
      // Test 2: Conversion TopoJSON simple
      const topojson = await import('topojson-client')
      const geoData = topojson.feature(topoData, topoData.objects.territories) as any
      console.log('✅ Conversion GeoJSON:', geoData.features.length, 'features')
      
      // Test 3: Affichage des coordonnées de la première feature
      if (geoData.features.length > 0) {
        const firstFeature = geoData.features[0]
        console.log('🗺️ Première feature:', firstFeature.properties)
        console.log('📐 Type géométrie:', firstFeature.geometry.type)
        
        // Analyser les coordonnées
        if (firstFeature.geometry.coordinates) {
          console.log('📍 Coordonnées (échantillon):')
          const coords = firstFeature.geometry.coordinates
          if (coords[0] && coords[0][0]) {
            const sampleCoords = coords[0][0].slice(0, 3) // Premiers points
            console.log('  Échantillon:', sampleCoords)
            
            // Calculer les limites approximatives (version simplifiée)
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
            
            const checkCoords = (coordsArray: any) => {
              if (Array.isArray(coordsArray[0])) {
                coordsArray.forEach(checkCoords)
              } else {
                const [x, y] = coordsArray
                if (typeof x === 'number' && typeof y === 'number') {
                  if (x < minX) minX = x
                  if (x > maxX) maxX = x
                  if (y < minY) minY = y  
                  if (y > maxY) maxY = y
                }
              }
            }
            
            checkCoords(coords)
            console.log(`  Limites: X[${minX.toFixed(2)}, ${maxX.toFixed(2)}] Y[${minY.toFixed(2)}, ${maxY.toFixed(2)}]`)
          }
        }
      }
      
      // Test 4: Rendu simple sans projection
      this.renderSimpleMap(geoData)
      
    } catch (error) {
      console.error('❌ Erreur debug:', error)
    }
  }
  
  renderSimpleMap(geoData: any) {
    const container = document.querySelector('#france-metropole .map-plot')
    if (!container) {
      console.error('❌ Container non trouvé')
      return
    }
    
    console.log('🎨 Rendu carte simple...')
    
    // Tester plusieurs approches de rendu
    this.testMultipleRenders(container, geoData)
  }
  
  testMultipleRenders(container: Element, geoData: any) {
    const approaches = [
      {
        name: 'Sans projection',
        config: {
          width: 600,
          height: 400,
          marks: [Plot.geo(geoData.features, { fill: 'lightblue', stroke: 'blue', strokeWidth: 2 })]
        }
      },
      {
        name: 'Projection Mercator',
        config: {
          width: 600,
          height: 400,
          projection: 'mercator' as const,
          marks: [Plot.geo(geoData.features, { fill: 'lightgreen', stroke: 'darkgreen', strokeWidth: 2 })]
        }
      },
      {
        name: 'Projection Equal Earth',
        config: {
          width: 600,
          height: 400,
          projection: 'equal-earth' as const,
          marks: [Plot.geo(geoData.features, { fill: 'lightyellow', stroke: 'orange', strokeWidth: 2 })]
        }
      },
      {
        name: 'Projection avec domain auto',
        config: {
          width: 600,
          height: 400,
          projection: { type: 'mercator' as const, domain: geoData },
          marks: [Plot.geo(geoData.features, { fill: 'lightcoral', stroke: 'darkred', strokeWidth: 2 })]
        }
      }
    ]
    
    let successCount = 0
    
    approaches.forEach((approach, index) => {
      try {
        console.log(`🧪 Test ${index + 1}: ${approach.name}`)
        
        const plot = Plot.plot(approach.config)
        
        const testDiv = document.createElement('div')
        testDiv.style.margin = '10px 0'
        testDiv.innerHTML = `<h4>${approach.name}</h4>`
        testDiv.appendChild(plot)
        
        if (index === 0) {
          container.innerHTML = ''
        }
        container.appendChild(testDiv)
        
        console.log(`✅ Test ${index + 1} réussi`)
        successCount++
        
      } catch (error) {
        console.error(`❌ Test ${index + 1} échoué:`, error)
        
        const errorDiv = document.createElement('div')
        errorDiv.style.cssText = 'margin: 10px 0; padding: 10px; background: #ffe6e6; border: 1px solid red; border-radius: 4px;'
        errorDiv.innerHTML = `
          <h4>${approach.name} - ÉCHEC</h4>
          <p style="font-size: 0.9em; color: #d63031;">${error instanceof Error ? error.message : String(error)}</p>
        `
        
        if (index === 0) {
          container.innerHTML = ''
        }
        container.appendChild(errorDiv)
      }
    })
    
    console.log(`📊 Résultat: ${successCount}/${approaches.length} approches réussies`)
  }
}