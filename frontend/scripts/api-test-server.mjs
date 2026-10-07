import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const backend = fileURLToPath(new URL('../../backend/', import.meta.url))
const tools = fileURLToPath(new URL('../../.tools/', import.meta.url))
const database = fileURLToPath(new URL('../../.tools/e2e.sqlite', import.meta.url))
const cache = fileURLToPath(new URL(`../../.tools/e2e-cache-${Date.now()}-${process.pid}/`, import.meta.url))
const php = process.env.PHP_BINARY ?? fileURLToPath(new URL('../../.tools/php/php.exe', import.meta.url))
mkdirSync(tools, { recursive: true })
mkdirSync(cache, { recursive: true })
if (!existsSync(database)) writeFileSync(database, '')
const env = { ...process.env, DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '',
  CACHE_STORE: 'file', CACHE_FILE_PATH: cache, SESSION_DRIVER: 'file', FRONTEND_ORIGINS: 'http://127.0.0.1:3173' }
const migration = spawnSync(php, ['artisan', 'migrate', '--seed', '--force', '--no-interaction'], { cwd: backend, env, stdio: 'inherit' })
if (migration.status !== 0) process.exit(migration.status ?? 1)
const server = spawn(php, ['-S', '127.0.0.1:8173', '-t', 'public'], { cwd: backend, env, stdio: 'inherit' })
process.on('SIGTERM', () => server.kill())
process.on('SIGINT', () => server.kill())
server.on('exit', code => process.exit(code ?? 0))
