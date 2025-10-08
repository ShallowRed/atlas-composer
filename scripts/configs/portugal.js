/**
 * Portugal Territory Configuration
 * Uses generic adapter to transform unified JSON config
 */

import config from '../../configs/portugal.json' with { type: 'json' }
import { createBackendConfig } from './adapter.js'

export default createBackendConfig(config)
