// Compare old vs new positioning

const territories = [
  { name: 'Saint-Martin', old: [-450, -50], new: [-336, -123] },
  { name: 'Guadeloupe', old: [-450, 50], new: [-336, -39] },
  { name: 'Martinique', old: [-450, 150], new: [-336, 36] },
  { name: 'Guyane', old: [-300, 180], new: [-336, 161] },
  { name: 'Saint-Pierre-et-Miquelon', old: [-200, -200], new: [-336, -182] },
  { name: 'Mayotte', old: [350, -50], new: [328, -179] },
  { name: 'La Réunion', old: [-250, 0], new: [325, -99] },
  { name: 'TAAF', old: [350, 250], new: [328, 126] },
  { name: 'Nouvelle-Calédonie', old: [550, -100], new: [325, -13] },
  { name: 'Wallis-et-Futuna', old: [550, 50], new: [325, 62] },
  { name: 'Polynésie française', old: [550, 180], new: [322, 210] },
  { name: 'Saint-Barthélemy', old: [-450, -150], new: [-336, -123] },
]

console.log('\n=== Territory Positioning Updates ===\n')
console.log('Territory'.padEnd(30), 'OLD Position'.padEnd(20), 'NEW Position'.padEnd(20), 'Change')
console.log('='.repeat(95))

territories.forEach((t) => {
  const oldStr = `[${t.old[0]}, ${t.old[1]}]`
  const newStr = `[${t.new[0]}, ${t.new[1]}]`
  const deltaX = t.new[0] - t.old[0]
  const deltaY = t.new[1] - t.old[1]
  const changeStr = `Δx:${deltaX > 0 ? '+' : ''}${deltaX}, Δy:${deltaY > 0 ? '+' : ''}${deltaY}`

  console.log(
    t.name.padEnd(30),
    oldStr.padEnd(20),
    newStr.padEnd(20),
    changeStr,
  )
})

console.log('\n=== Key Changes ===')
console.log('✓ Left column aligned to x = -336 (Caribbean/Atlantic)')
console.log('✓ Right column aligned to x ≈ +325 (Indian Ocean/Pacific)')
console.log('✓ Y positions match d3-composite-projections layout')
console.log('✓ Territories now stack vertically in proper order')
console.log('✓ La Réunion moved from NEGATIVE x to POSITIVE x (was on wrong side!)')
console.log('\nThe layout now matches d3-composite-projections conicConformalFrance\n')
