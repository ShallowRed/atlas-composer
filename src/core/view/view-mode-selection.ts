/**
 * ViewModeSelection Value Object
 *
 * Immutable value object representing a selected view mode.
 * Encapsulates validation and behavior related to view mode selection.
 *
 * DDD Pattern: Value Object
 * - Immutable (readonly property)
 * - Equality by value (equals method)
 * - Self-validating (constructor validation)
 * - Encapsulates domain behavior (requiresCompositeProjection, etc.)
 */

import type { ViewMode } from '@/types/composite'

/**
 * Domain error for invalid view mode selection
 */
export class InvalidViewModeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidViewModeError'
  }
}

/**
 * Valid view modes as a constant array for runtime validation
 */
const VALID_VIEW_MODES: readonly ViewMode[] = [
  'composite-custom',
  'built-in-composite',
  'split',
  'unified',
] as const

/**
 * ViewModeSelection Value Object
 *
 * Represents a valid view mode selection with domain behavior.
 * Use this instead of raw ViewMode strings for type safety and domain logic.
 */
export class ViewModeSelection {
  readonly mode: ViewMode

  /**
   * Create a new ViewModeSelection
   *
   * @param mode - The view mode to select
   * @throws InvalidViewModeError if mode is not a valid ViewMode
   */
  constructor(mode: ViewMode) {
    if (!VALID_VIEW_MODES.includes(mode)) {
      throw new InvalidViewModeError(`Invalid view mode: ${mode}. Valid modes are: ${VALID_VIEW_MODES.join(', ')}`)
    }
    this.mode = mode
  }

  /**
   * Check equality with another ViewModeSelection
   *
   * Value objects are equal when their values are equal.
   */
  equals(other: ViewModeSelection): boolean {
    return this.mode === other.mode
  }

  /**
   * Check if this view mode requires a composite projection
   *
   * Composite-custom and built-in-composite modes require composite projections.
   */
  requiresCompositeProjection(): boolean {
    return this.mode === 'composite-custom' || this.mode === 'built-in-composite'
  }

  /**
   * Check if this view mode is a custom composite mode
   *
   * Custom composite allows user-defined territory positioning.
   */
  isCustomComposite(): boolean {
    return this.mode === 'composite-custom'
  }

  /**
   * Check if this view mode uses built-in composite projections
   *
   * Built-in composite uses d3-composite-projections.
   */
  isBuiltInComposite(): boolean {
    return this.mode === 'built-in-composite'
  }

  /**
   * Check if this view mode is a composite mode (either type)
   */
  isComposite(): boolean {
    return this.requiresCompositeProjection()
  }

  /**
   * Check if this view mode supports individual territory projections
   *
   * Split mode allows each territory to have its own projection.
   */
  supportsIndividualTerritoryProjections(): boolean {
    return this.mode === 'split'
  }

  /**
   * Check if this is split mode
   */
  isSplit(): boolean {
    return this.mode === 'split'
  }

  /**
   * Check if this is unified mode
   *
   * Unified mode shows all territories in their geographic positions.
   */
  isUnified(): boolean {
    return this.mode === 'unified'
  }

  /**
   * Check if this view mode shows territories in separate views
   *
   * Split mode shows territories in separate views.
   */
  showsSeparateViews(): boolean {
    return this.mode === 'split'
  }

  /**
   * Check if territory controls should be shown
   *
   * Territory controls are shown in split and composite-custom modes.
   */
  showsTerritoryControls(): boolean {
    return this.mode === 'split' || this.mode === 'composite-custom'
  }

  /**
   * Check if projection parameters should be shown
   *
   * Projection params are shown in unified and built-in-composite modes.
   */
  showsProjectionParams(): boolean {
    return this.mode === 'unified' || this.mode === 'built-in-composite'
  }

  /**
   * Get a string representation for debugging
   */
  toString(): string {
    return `ViewModeSelection(${this.mode})`
  }

  /**
   * Get all valid view modes
   */
  static validModes(): readonly ViewMode[] {
    return VALID_VIEW_MODES
  }

  /**
   * Create from a string with validation
   */
  static fromString(value: string): ViewModeSelection | null {
    if (VALID_VIEW_MODES.includes(value as ViewMode)) {
      return new ViewModeSelection(value as ViewMode)
    }
    return null
  }
}
