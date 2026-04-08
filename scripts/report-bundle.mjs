import fs from 'node:fs'
import path from 'node:path'

const assetsDir = path.resolve(process.cwd(), 'dist/assets')

if (!fs.existsSync(assetsDir)) {
  console.error('[bundle:report] dist/assets not found. Run npm run build first.')
  process.exit(1)
}

const files = fs
  .readdirSync(assetsDir)
  .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
  .map((name) => {
    const abs = path.join(assetsDir, name)
    const size = fs.statSync(abs).size
    return { name, size }
  })
  .sort((a, b) => b.size - a.size)

const total = files.reduce((sum, file) => sum + file.size, 0)

console.log('[bundle:report] Assets sorted by size:')
for (const file of files) {
  const kb = (file.size / 1024).toFixed(2)
  console.log(`- ${file.name}: ${kb} kB`)
}

console.log(`[bundle:report] Total: ${(total / 1024).toFixed(2)} kB`)
