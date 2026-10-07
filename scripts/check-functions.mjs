import ts from '../frontend/node_modules/typescript/lib/typescript.js'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

let count = 0, failed = false
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? files(path) : /\.(ts|vue|mjs)$/.test(path) ? [path] : []
  })
}
function inspect(path) {
  const raw = readFileSync(path, 'utf8')
  const text = path.endsWith('.vue') ? raw.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? '' : raw
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  function visit(node) {
    if (ts.isFunctionLike(node) && node.body) {
      count++
      const begin = source.getLineAndCharacterOfPosition(node.getStart(source)).line
      const end = source.getLineAndCharacterOfPosition(node.end).line
      if (end - begin + 1 > 50) {
        failed = true
        console.error(`${path}:${begin + 1} ${node.name?.getText(source) ?? 'callback'}: ${end - begin + 1} lines`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}
for (const path of [...files('frontend/app'), ...files('frontend/tests'), ...files('frontend/scripts'), ...files('scripts'),
  'frontend/nuxt.config.ts', 'frontend/playwright.config.ts', 'frontend/vitest.config.ts']) inspect(path)
console.log(`Checked ${count} TypeScript/JavaScript functions (limit: 50 lines).`)
process.exitCode = failed ? 1 : 0
