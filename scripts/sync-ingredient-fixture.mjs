/**
 * Tras editar mi-dieta-api/src/data/ingredientReference.json, copia al fixture de tests del frontend.
 * Uso: node scripts/sync-ingredient-fixture.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const apiJson = path.resolve(root, '../mi-dieta-api/src/data/ingredientReference.json')
const fixture = path.resolve(root, 'src/test/fixtures/ingredientReference.json')

fs.copyFileSync(apiJson, fixture)
console.log('Synced', fixture)
