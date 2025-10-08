import config from '../../configs/france.json' with { type: 'json' }
import { createBackendConfig } from './adapter.js'

export default createBackendConfig(config)
