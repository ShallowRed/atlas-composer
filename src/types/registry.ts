import type { PresetDefinition } from '#types'

export interface ResolvedPresetDefinition extends Omit<PresetDefinition, 'name' | 'description'> {
  name: string
  description?: string
}
