import config from '../../configs/eu.json' with { type: 'json' }
import { createBackendConfig } from './adapter.js'

export default createBackendConfig(config)
