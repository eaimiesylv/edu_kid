import { mkdirSync, writeFileSync } from 'node:fs'
import { curriculum, skills } from '../frontend/app/domain/curriculum.ts'

mkdirSync(new URL('../backend/database/data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../backend/database/data/curriculum.json', import.meta.url), JSON.stringify({ curriculum, skills }, null, 2) + '\n')
console.log('Exported bundled curriculum to backend seed data.')
