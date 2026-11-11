import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { logger } from '#scripts/utils/logger'

interface PackedPackage {
  name: string
  filename: string
}

type ExportTarget = string | { import?: string, types?: string }

// Installs each packed package alone in an empty project, as a user does from npm,
// type-checks an import of each typed entry with skipLibCheck off, imports in Node each typed entry,
// as JSON each file of the tarball that an untyped entry serves, and runs each command of `bin` with --help
const root = resolve(import.meta.dirname, '..')
const workspace = await mkdtemp(join(tmpdir(), 'atlas-composer-packages-'))

async function readJson(path: string) {
  return JSON.parse(await readFile(path, 'utf8'))
}

// Public specifiers of the tarball files that an export entry serves, expanding the `*` of a subpath pattern
function servedSpecifiers(name: string, entry: string, target: ExportTarget, files: string[]) {
  const path = typeof target === 'string' ? target : target.import
  if (!path)
    return []
  const [prefix, suffix] = path.slice(2).split('*')
  if (suffix === undefined)
    return files.includes(prefix) ? [`${name}${entry.slice(1)}`] : []
  return files
    .filter(file => file.startsWith(prefix) && file.endsWith(suffix) && file.length > prefix.length + suffix.length)
    .map(file => `${name}${entry.slice(1).replace('*', file.slice(prefix.length, file.length - suffix.length))}`)
}

try {
  const { packageManager } = await readJson(join(root, 'package.json'))
  const packed: PackedPackage[] = JSON.parse(execFileSync(
    'pnpm',
    ['-r', '--filter', './packages/*', 'pack', '--json', '--pack-destination', workspace],
    { cwd: root, encoding: 'utf8' },
  ))

  // The packed manifests name the other packages by version: the overrides resolve them to the tarballs
  const overrides = packed.map(({ name, filename }) => `  '${name}': 'file:${filename}'\n`).join('')

  for (const [index, { name, filename }] of packed.entries()) {
    const { exports, bin = {} } = JSON.parse(execFileSync('tar', ['-xOzf', filename, 'package/package.json'], { encoding: 'utf8' }))
    const typedEntries = Object.keys(exports).filter(entry => exports[entry].types)
    const specifiers = typedEntries.map(entry => `${name}${entry.slice(1)}`)
    const files = execFileSync('tar', ['-tzf', filename], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map(file => file.replace(/^package\//, ''))
    const jsonSpecifiers = Object.keys(exports)
      .filter(entry => !exports[entry].types)
      .flatMap(entry => servedSpecifiers(name, entry, exports[entry], files))

    const project = join(workspace, `project-${index}`)
    await mkdir(project)
    await writeFile(join(project, 'package.json'), JSON.stringify({
      name: 'package-check',
      private: true,
      type: 'module',
      packageManager,
      dependencies: { [name]: `file:${filename}` },
    }))
    await writeFile(join(project, 'pnpm-workspace.yaml'), `overrides:\n${overrides}`)
    await writeFile(join(project, 'index.ts'), specifiers
      .map((specifier, entryIndex) => `export * as entry${entryIndex} from '${specifier}'\n`)
      .join(''))
    await writeFile(join(project, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, skipLibCheck: false, noEmit: true },
      files: ['index.ts'],
    }))

    execFileSync('pnpm', ['install', '--silent'], { cwd: project, stdio: 'inherit' })
    execFileSync(join(root, 'node_modules/.bin/tsc'), ['-p', project], { stdio: 'inherit' })
    const imports = [
      ...specifiers.map(specifier => `import '${specifier}'`),
      ...jsonSpecifiers.map(specifier => `import '${specifier}' with { type: 'json' }`),
    ]
    execFileSync('node', ['--input-type=module', '--eval', imports.join('\n')], { cwd: project, stdio: 'inherit' })
    logger.success(`${name} (${typedEntries.join(', ')}): types check and entries import when installed alone`)
    if (jsonSpecifiers.length > 0)
      logger.success(`${name}: ${jsonSpecifiers.length} JSON files import by their public path`)
    for (const command of Object.keys(bin)) {
      execFileSync(join(project, 'node_modules/.bin', command), ['--help'], { cwd: project, stdio: 'ignore' })
      logger.success(`${name}: ${command} --help runs`)
    }
  }
}
finally {
  await rm(workspace, { recursive: true, force: true })
}
