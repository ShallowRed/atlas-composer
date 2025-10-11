/**
 * Unified Color Logger
 * Provides consistent colored output for all scripts
 * Uses character-based icons (no emoji) for terminal compatibility
 */

/**
 * ANSI color codes
 */
const COLORS = {
  reset: '\x1B[0m',
  bold: '\x1B[1m',
  dim: '\x1B[2m',

  // Foreground colors
  black: '\x1B[30m',
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  magenta: '\x1B[35m',
  cyan: '\x1B[36m',
  white: '\x1B[37m',
  gray: '\x1B[90m',
} as const

type Color = typeof COLORS[keyof typeof COLORS]

/**
 * Format helper - wraps text in color
 */
function colorize(text: string, color: Color): string {
  return `${color}${text}${COLORS.reset}`
}

/**
 * Unified logger with consistent icons and colors
 */
export const logger = {
  /**
   * Informational message (blue)
   */
  info(message: string): void {
    console.log(`${colorize('[i]', COLORS.blue)} ${message}`)
  },

  /**
   * Success message (green)
   */
  success(message: string): void {
    console.log(`${colorize('[✓]', COLORS.green)} ${message}`)
  },

  /**
   * Warning message (yellow)
   */
  warning(message: string): void {
    console.log(`${colorize('[!]', COLORS.yellow)} ${message}`)
  },

  /**
   * Error message (red)
   */
  error(message: string): void {
    console.error(`${colorize('[✗]', COLORS.red)} ${message}`)
  },

  /**
   * Section header (bold cyan)
   */
  section(message: string): void {
    console.log(`\n${COLORS.bold}${COLORS.cyan}${message}${COLORS.reset}`)
  },

  /**
   * Subsection header (cyan)
   */
  subsection(message: string): void {
    console.log(`\n${COLORS.cyan}${message}${COLORS.reset}`)
  },

  /**
   * Plain message with optional color
   */
  log(message: string, color: Color | null = null): void {
    if (color) {
      console.log(colorize(message, color))
    }
    else {
      console.log(message)
    }
  },

  /**
   * Dimmed/gray text for less important info
   */
  dim(message: string): void {
    console.log(colorize(message, COLORS.gray))
  },

  /**
   * Highlight text (bold yellow)
   */
  highlight(message: string): void {
    console.log(`${COLORS.bold}${COLORS.yellow}${message}${COLORS.reset}`)
  },

  /**
   * Data output (formatted key-value)
   */
  data(key: string, value: string | number): void {
    console.log(`  ${COLORS.cyan}${key}:${COLORS.reset} ${value}`)
  },

  /**
   * Empty line for spacing
   */
  newline(): void {
    console.log()
  },
}

/**
 * Export colors for direct use if needed
 */
export { COLORS }
export type { Color }
