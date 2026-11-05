import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { logger } from '#scripts/utils/logger'

interface PackedPackage {
  name: string
  filename: string
}

// Installs each packed package alone in an empty project, as a user does from npm,
// and type-checks an import of each typed entry with skipLibCheck off
const root = resolve(import.meta.dirname, '..')
const workspace = await mkdtemp(join(tmpdir(), 'atlas-composer-packages-'))

async function readJson(path: string) {
  return JSON.parse(await readFile(path, 'utf8'))
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
    const { exports } = JSON.parse(execFileSync('tar', ['-xOzf', filename, 'package/package.json'], { encoding: 'utf8' }))
    const typedEntries = Object.keys(exports).filter(entry => exports[entry].types)

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
    await writeFile(join(project, 'index.ts'), typedEntries
      .map((entry, entryIndex) => `export * as entry${entryIndex} from '${name}${entry.slice(1)}'\n`)
      .join(''))
    await writeFile(join(project, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, skipLibCheck: false, noEmit: true },
      files: ['index.ts'],
    }))

    execFileSync('pnpm', ['install', '--silent'], { cwd: project, stdio: 'inherit' })
    execFileSync(join(root, 'node_modules/.bin/tsc'), ['-p', project], { stdio: 'inherit' })
    logger.success(`${name} (${typedEntries.join(', ')}): types check when installed alone`)
  }
}
finally {
  await rm(workspace, { recursive: true, force: true })
}
