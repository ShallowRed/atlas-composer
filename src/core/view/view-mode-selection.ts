import type { ViewMode } from '@/types/composite'

export class InvalidViewModeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidViewModeError'
  }
}

const VIEW_MODES = {
  'composite-custom': true,
  'built-in-composite': true,
  'split': true,
  'unified': true,
} as const satisfies Record<ViewMode, true>

export function isViewMode(value: unknown): value is ViewMode {
  return typeof value === 'string' && Object.hasOwn(VIEW_MODES, value)
}

export class ViewModeSelection {
  readonly mode: ViewMode

  constructor(mode: ViewMode) {
    if (!isViewMode(mode)) {
      throw new InvalidViewModeError(`Invalid view mode: ${mode}. Valid modes are: ${Object.keys(VIEW_MODES).join(', ')}`)
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
