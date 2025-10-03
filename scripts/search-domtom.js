import fs from 'fs';
const data = JSON.parse(fs.readFileSync('public/data/world-countries-50m.json', 'utf-8'));
const countries = data.objects.countries.geometries;

console.log('🎯 Recherche exhaustive des DOM-TOM dans Natural Earth\n');

// 1. Vérification des IDs ISO numériques exacts
const exactIds = ['312', '474', '254', '638', '175'];
console.log('1️⃣ IDs ISO numériques exacts:');
exactIds.forEach(id => {
  const found = countries.find(c => c.id === id);
  if (found) {
    console.log(`  ✅ ${id}: ${found.properties.name}`);
  } else {
    console.log(`  ❌ ${id}: Non trouvé`);
  }
});

// 2. Recherche par fragments de noms spécifiques
console.log('\n2️⃣ Recherche par fragments de noms:');
const fragments = [
  { fragment: 'guadal', expected: 'Guadeloupe' },
  { fragment: 'martin', expected: 'Martinique' },
  { fragment: 'reunion', expected: 'Réunion' },
  { fragment: 'mayot', expected: 'Mayotte' }
];

fragments.forEach(({ fragment, expected }) => {
  const matches = countries.filter(c => 
    (c.properties.name || '').toLowerCase().includes(fragment)
  );
  console.log(`  ${fragment} (${expected}): ${matches.length} résultat(s)`);
  matches.forEach(m => console.log(`    ${m.id}: ${m.properties.name}`));
});

// 3. Liste complète des territoires français confirmés
console.log('\n3️⃣ Territoires français confirmés trouvés:');
const confirmedFrench = [
  '250', // France
  '666', // St. Pierre and Miquelon  
  '876', // Wallis and Futuna
  '258', // Fr. Polynesia
  '540', // New Caledonia
  '260'  // Fr. S. Antarctic Lands (trouvé plus tôt)
];

const foundTerritories = [];
confirmedFrench.forEach(id => {
  const territory = countries.find(c => c.id === id);
  if (territory) {
    foundTerritories.push(territory);
    console.log(`  ✅ ${id}: ${territory.properties.name} (${territory.type})`);
  }
});

// 4. Analyse des propriétés pour comprendre la structure
console.log('\n4️⃣ Structure des propriétés (échantillon):');
foundTerritories.slice(0, 2).forEach(t => {
  console.log(`  ${t.id} (${t.properties.name}):`);
  console.log(`    Propriétés: ${JSON.stringify(t.properties, null, 6)}`);
});

console.log(`\n📊 Résumé: ${foundTerritories.length} territoires français trouvés sur ${confirmedFrench.length} recherchés`);