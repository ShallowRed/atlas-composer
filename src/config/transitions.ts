/**
 * Centralized transition timing configuration
 *
 * Single source of truth for all animation durations across the app.
 * All components should import from here instead of hardcoding values.
 */

/**
 * Base transition durations in milliseconds
 */
export const TRANSITION_DURATION = {
  /** Standard fade transition (e.g., map content appearing) */
  fade: 250,

  /** Slide animations for accordions */
  slide: 200,

  /** Delay before starting render to allow browser paint */
  renderDelay: 50,

  /** Minimum time skeleton/loading state must be visible */
  minLoadingDisplay: 350,
} as const

/**
 * CSS duration strings for use in stylesheets
 */
export const TRANSITION_CSS = {
  fade: `${TRANSITION_DURATION.fade}ms`,
  slide: `${TRANSITION_DURATION.slide}ms`,
} as const

/**
 * Calculated durations for state machine timeouts
 * These account for transition sequences (out-in = 2x fade)
 */
export const STATE_DURATION = {
  /** View switch with split mode: out-in transition needs 2x fade + buffer */
  switchingViewSplit: TRANSITION_DURATION.fade * 2 + 100,

  /** View switch for other modes: match out-in transition duration (2x fade) */
  switchingViewOther: TRANSITION_DURATION.fade * 2,
} as const
