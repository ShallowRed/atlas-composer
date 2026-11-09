import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { describe, expect, it } from 'vitest'

const PNPM_COMMANDS = ['install', 'exec', 'run']
const CHECKED_PATH = /^(?:src|configs|packages|scripts|types|docs|\.github)\/\S*$/
const GENERATED_PATH = /^src\/public\/data\//
const LINE_SUFFIX = /:\d+(?:-\d+)?$/
const IDENTIFIER = /^([A-Z][a-z0-9]\w*|[a-z][a-z0-9]*[A-Z]\w*)(?:[.(<].*)?$/
const PNPM_COMMAND = /\bpnpm (?:run )?([a-z][\w:-]*)/g

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n')
const trackedPaths = new Set(trackedFiles.flatMap(ancestorsAndSelf))
const DOCUMENTS = ['AGENTS.md', 'README.md', ...trackedFiles.filter(file => file.startsWith('docs/') && file.endsWith('.md'))]

const sourceWords = new Set(trackedFiles
  .filter(isIdentifierSource)
  .flatMap(file => readFileSync(file, 'utf8').match(/[A-Z_$][\w$]*/gi) ?? []))

const scripts = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts)

function ancestorsAndSelf(file: string): string[] {
  const parent = dirname(file)
  return parent === '.' ? [file] : [file, ...ancestorsAndSelf(parent)]
}

function isIdentifierSource(file: string): boolean {
  if (file === 'eslint.config.js' || file === 'package.json' || file.startsWith('configs/schemas/')) {
    return true
  }
  return /^(?:src|packages\/[^/]+\/src|scripts|types)\/.*\.(?:ts|vue)$/.test(file) && !file.includes('__tests__')
}

function pathPattern(path: string): RegExp {
  const source = path
    .replace(/\/$/, '')
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/<atlas>/g, 'france')
    .replace(/<id>|\*/g, '[^/]+')
  return new RegExp(`^${source}$`)
}

function resolvesToTrackedPath(path: string): boolean {
  const pattern = pathPattern(path)
  return [...trackedPaths].some(trackedPath => pattern.test(trackedPath))
}

function readDocument(document: string) {
  const markdown = readFileSync(document, 'utf8')
  const prose = markdown.replace(/^```[\s\S]+?^```/gm, '')
  const inlineCode = [...prose.matchAll(/`([^`\n]+)`/g)].map(match => match[1]!)
  const bashLines = [...markdown.matchAll(/^```bash\n([\s\S]+?)^```/gm)].flatMap(match => match[1]!.split('\n'))
  return { prose, inlineCode, bashLines }
}

describe.each(DOCUMENTS)('%s', (document) => {
  const { prose, inlineCode, bashLines } = readDocument(document)

  it('links to files of the repository', () => {
    const missing = [...prose.matchAll(/\]\(([^)\s]+)\)/g)]
      .map(match => match[1]!)
      .filter(target => !/^(?:[a-z]+:|#)/.test(target))
      .map(target => normalize(join(dirname(document), target.split('#')[0]!)).replace(/\/$/, ''))
      .filter(path => !trackedPaths.has(path))

    expect(missing).toEqual([])
  })

  it('names paths of the repository', () => {
    const missing = inlineCode
      .map(code => code.replace(LINE_SUFFIX, ''))
      .filter(code => CHECKED_PATH.test(code) && !GENERATED_PATH.test(code))
      .filter(path => !resolvesToTrackedPath(path))

    expect(missing).toEqual([])
  })

  it('names identifiers of the code', () => {
    const missing = inlineCode
      .map(code => code.match(IDENTIFIER)?.[1])
      .filter(identifier => identifier !== undefined && !sourceWords.has(identifier))

    expect(missing).toEqual([])
  })

  it('runs scripts of the package', () => {
    const unknown = [...inlineCode, ...bashLines]
      .flatMap(command => [...command.matchAll(PNPM_COMMAND)].map(match => match[1]!))
      .filter(name => !scripts.includes(name) && !PNPM_COMMANDS.includes(name))

    expect(unknown).toEqual([])
  })
})
