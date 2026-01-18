const COLORS = {
  reset: '\x1B[0m',
  bold: '\x1B[1m',
  dim: '\x1B[2m',

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

function colorize(text: string, color: Color): string {
  return `${color}${text}${COLORS.reset}`
}

export const logger = {
  info(message: string): void {
    console.log(`${colorize('[i]', COLORS.blue)} ${message}`)
  },

  success(message: string): void {
    console.log(`${colorize('[✓]', COLORS.green)} ${message}`)
  },

  warning(message: string): void {
    console.log(`${colorize('[!]', COLORS.yellow)} ${message}`)
  },

  error(message: string): void {
    console.error(`${colorize('[✗]', COLORS.red)} ${message}`)
  },

  section(message: string): void {
    console.log(`\n${COLORS.bold}${COLORS.cyan}${message}${COLORS.reset}`)
  },

  subsection(message: string): void {
    console.log(`\n${COLORS.cyan}${message}${COLORS.reset}`)
  },

  log(message: string, color: Color | null = null): void {
    if (color) {
      console.log(colorize(message, color))
    }
    else {
      console.log(message)
    }
  },

  dim(message: string): void {
    console.log(colorize(message, COLORS.gray))
  },

  highlight(message: string): void {
    console.log(`${COLORS.bold}${COLORS.yellow}${message}${COLORS.reset}`)
  },

  data(key: string, value: string | number): void {
    console.log(`  ${COLORS.cyan}${key}:${COLORS.reset} ${value}`)
  },

  newline(): void {
    console.log()
  },
}

export { COLORS }
export type { Color }
