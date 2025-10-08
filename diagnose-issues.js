// Compare our data with d3-composite-projections

const d3cpData = {
  guyane: { center: [-53.2, 3.9], scale: 0.6 },
  martinique: { center: [-61.03, 14.67], scale: 1.6 },
  guadeloupe: { center: [-61.46, 16.14], scale: 1.4 },
  saintBarthelemy: { center: [-62.85, 17.92], scale: 5.0 },
  stPierreMiquelon: { center: [-56.23, 46.93], scale: 1.3 },
  mayotte: { center: [45.16, -12.8], scale: 1.6 },
  reunion: { center: [55.52, -21.13], scale: 1.2 },
  nouvelleCaledonie: { center: [165.8, -21.07], scale: 0.3 },
  wallisFutuna: { center: [-178.1, -14.3], scale: 2.7 },
  polynesie: { center: [-150.55, -17.11], scale: 0.5 },
  polynesie2: { center: [-150.55, -17.11], scale: 0.06 }, // SECOND projection for remote islands
}

const ourData = {
  'FR-GF': { center: [-53.1, 3.9], scale: 0.6 },
  'FR-MQ': { center: [-61.024, 14.642], scale: 1.6 },
  'FR-GP': { center: [-61.551, 16.265], scale: 1.4 },
  'FR-BL': { center: [-62.85, 17.90], scale: 5.0 },
  'FR-PM': { center: [-56.327, 46.885], scale: 1.3 },
  'FR-YT': { center: [45.166, -12.827], scale: 1.6 },
  'FR-RE': { center: [55.536, -21.115], scale: 1.2 },
  'FR-NC': { center: [165.618, -20.904], scale: 0.3 },
  'FR-WF': { center: [-176.176, -13.768], scale: 2.7 }, // WRONG CENTER!
  'FR-PF': { center: [-149.566, -17.679], scale: 0.5 },
  'FR-TF': { center: [69.348, -49.280], scale: 1.0 }, // NOT IN d3-cp!
}

console.log('\n=== Issues Found ===\n')

// Issue 1: Wallis-et-Futuna center is wrong
console.log('❌ ISSUE 1: Wallis-et-Futuna Center Mismatch')
console.log('   d3-cp:  [-178.1, -14.3]')
console.log('   Ours:   [-176.176, -13.768]')
console.log('   FIX: Update center to [-178.1, -14.3]\n')

// Issue 2: Missing polynesie2
console.log('❌ ISSUE 2: Missing Second Polynésie Projection')
console.log('   d3-cp has TWO projections for Polynésie française:')
console.log('   - polynesie:  scale 0.5  (main islands)')
console.log('   - polynesie2: scale 0.06 (remote islands - Marquesas, etc.)')
console.log('   FIX: We need to add a second FR-PF entry or handle it differently\n')

// Issue 3: TAAF not in d3-cp
console.log('❌ ISSUE 3: TAAF Not in d3-composite-projections')
console.log('   TAAF (Terres australes) is NOT included in d3-cp')
console.log('   This is why it appears "a lot larger"')
console.log('   FIX: Either:')
console.log('   - Remove TAAF from default view')
console.log('   - Give it much smaller baseScaleMultiplier (0.1 or less)\n')

console.log('=== Summary of Fixes Needed ===\n')
console.log('1. Update Wallis-et-Futuna center to [-178.1, -14.3]')
console.log('2. Handle Polynésie française dual projection')
console.log('3. Handle TAAF (not in d3-cp) - reduce scale or exclude')
console.log('')
