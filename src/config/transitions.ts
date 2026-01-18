export const TRANSITION_DURATION = {
  fade: 250,
  slide: 200,
  renderDelay: 50,
  minLoadingDisplay: 350,
} as const

export const TRANSITION_CSS = {
  fade: `${TRANSITION_DURATION.fade}ms`,
  slide: `${TRANSITION_DURATION.slide}ms`,
} as const

export const STATE_DURATION = {
  switchingViewSplit: TRANSITION_DURATION.fade * 2 + 100,
  switchingViewOther: TRANSITION_DURATION.fade * 2,
} as const
