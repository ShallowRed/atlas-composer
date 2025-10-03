import './styles.css'
import { FranceCartographer } from './cartographer/FranceCartographer'

// Version normale avec séparation métropole/DOM-TOM
const app = new FranceCartographer()
app.init()

// Version de debug (commentée maintenant que les coordonnées sont fixes)
// import { SimpleDebugCartographer } from './debug/SimpleDebugCartographer'
// const debugApp = new SimpleDebugCartographer()
// debugApp.init()
