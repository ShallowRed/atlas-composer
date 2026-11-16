import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const configsDir = path.resolve(rootDir, 'configs')

/**
 * Path of the JSON file under the configs directory that a request names, or null
 * An address that leaves the directory or that does not decode names no file
 */
function configFilePath(url: string | undefined): string | null {
  const pathname = url && new URL(url, 'http://localhost').pathname
  if (!pathname?.startsWith('/configs/')) {
    return null
  }
  let relativePath: string
  try {
    relativePath = decodeURIComponent(pathname.slice('/configs'.length))
  }
  catch {
    return null
  }
  const filePath = path.resolve(configsDir, `.${relativePath}`)
  return filePath.startsWith(configsDir + path.sep) && filePath.endsWith('.json') ? filePath : null
}

/**
 * Vite plugin to serve configs folder as public assets
 * Serves the JSON files under the root configs directory at /configs/
 */
export function serveConfigsPlugin(): Plugin {
  return {
    name: 'serve-configs',
    configureServer(server) {
      // Serve configs directory in dev mode
      server.middlewares.use((req, res, next) => {
        const filePath = configFilePath(req.url)
        if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(content)
          return
        }
        next()
      })
    },
    generateBundle(options) {
      // Copy configs to dist in production build
      const distConfigsDir = path.join(options.dir!, 'configs')

      // Create configs directory in dist
      if (!fs.existsSync(distConfigsDir)) {
        fs.mkdirSync(distConfigsDir, { recursive: true })
      }

      // Recursively copy all JSON files and subdirectories from configs to dist/configs
      function copyRecursive(srcDir: string, destDir: string) {
        const files = fs.readdirSync(srcDir)
        for (const file of files) {
          const srcPath = path.join(srcDir, file)
          const destPath = path.join(destDir, file)

          if (fs.statSync(srcPath).isDirectory()) {
            // Create subdirectory and recurse
            if (!fs.existsSync(destPath)) {
              fs.mkdirSync(destPath, { recursive: true })
            }
            copyRecursive(srcPath, destPath)
          }
          else if (file.endsWith('.json')) {
            fs.copyFileSync(srcPath, destPath)
          }
        }
      }

      copyRecursive(configsDir, distConfigsDir)
    },
  }
}

/**
 * GitHub Pages serves 404.html for a path that matches no file: the application then reads the path
 * https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site
 */
export function notFoundPagePlugin(): Plugin {
  return {
    name: 'not-found-page',
    apply: 'build',
    writeBundle(options) {
      fs.copyFileSync(path.join(options.dir!, 'index.html'), path.join(options.dir!, '404.html'))
    },
  }
}
