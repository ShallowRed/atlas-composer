import type { ViewMode } from '@/types/composite'

export class InvalidViewModeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidViewModeError'
  }
}

const VALID_VIEW_MODES: readonly ViewMode[] = [
  'composite-custom',
  'built-in-composite',
  'split',
  'unified',
] as const

export class ViewModeSelection {
  readonly mode: ViewMode

  constructor(mode: ViewMode) {
    if (!VALID_VIEW_MODES.includes(mode)) {
      throw new InvalidViewModeError(`Invalid view mode: ${mode}. Valid modes are: ${VALID_VIEW_MODES.join(', ')}`)
    }
    this.mode = mode
  }

  isCustomComposite(): boolean {
    return this.mode === 'composite-custom'
  }

  isSplit(): boolean {
    return this.mode === 'split'
  }

  isUnified(): boolean {
    return this.mode === 'unified'
  }
}
