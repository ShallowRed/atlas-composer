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

  equals(other: ViewModeSelection): boolean {
    return this.mode === other.mode
  }

  requiresCompositeProjection(): boolean {
    return this.mode === 'composite-custom' || this.mode === 'built-in-composite'
  }

  isCustomComposite(): boolean {
    return this.mode === 'composite-custom'
  }

  isBuiltInComposite(): boolean {
    return this.mode === 'built-in-composite'
  }

  isComposite(): boolean {
    return this.requiresCompositeProjection()
  }

  supportsIndividualTerritoryProjections(): boolean {
    return this.mode === 'split'
  }

  isSplit(): boolean {
    return this.mode === 'split'
  }

  isUnified(): boolean {
    return this.mode === 'unified'
  }

  showsSeparateViews(): boolean {
    return this.mode === 'split'
  }

  showsTerritoryControls(): boolean {
    return this.mode === 'split' || this.mode === 'composite-custom'
  }

  showsProjectionParams(): boolean {
    return this.mode === 'unified' || this.mode === 'built-in-composite'
  }

  toString(): string {
    return `ViewModeSelection(${this.mode})`
  }

  static validModes(): readonly ViewMode[] {
    return VALID_VIEW_MODES
  }

  static fromString(value: string): ViewModeSelection | null {
    if (VALID_VIEW_MODES.includes(value as ViewMode)) {
      return new ViewModeSelection(value as ViewMode)
    }
    return null
  }
}
