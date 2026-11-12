import { execFileSync } from 'node:child_process'
import { expect } from 'vitest'

const CLI = 'packages/cli/dist/cli.js'

/** The standard output of the built command */
export function run(args: string[]): string {
  return execFileSync('node', [CLI, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: 'pipe' })
}

/** The standard error of a command that exits with the code 1 */
export function failureOf(args: string[]): string {
  try {
    run(args)
  }
  catch (error) {
    const { status, stderr } = error as { status: number, stderr: string }
    expect(status).toBe(1)
    return stderr
  }
  throw new Error(`atlas-composer ${args.join(' ')} exits with the code 0`)
}
