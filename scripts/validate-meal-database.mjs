import fs from 'node:fs'
import path from 'node:path'

const DB_PATH = path.resolve(process.cwd(), 'src/data/meal-database.json')
const ALLOWED_MEAL_TYPES = new Set([
  'Desayuno',
  'Snack Mañana',
  'Comida',
  'Snack Tarde',
  'Cena',
])

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function validate() {
  const issues = []
  let db

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8')
    db = JSON.parse(raw)
  } catch (error) {
    console.error('[validate:db] Could not read or parse meal-database.json')
    console.error(error)
    process.exit(1)
  }

  if (!db || typeof db !== 'object') {
    issues.push('Root must be an object')
  }

  if (!Array.isArray(db?.rules?.forbiddenIngredients)) {
    issues.push('rules.forbiddenIngredients must be an array of strings')
  }

  if (!Array.isArray(db?.meals)) {
    issues.push('meals must be an array')
  }

  const meals = Array.isArray(db?.meals) ? db.meals : []
  const mealIds = new Set()

  meals.forEach((meal, mealIndex) => {
    const prefix = `meals[${mealIndex}]`

    if (!meal || typeof meal !== 'object') {
      issues.push(`${prefix} must be an object`)
      return
    }

    if (typeof meal.id !== 'string' || meal.id.trim().length === 0) {
      issues.push(`${prefix}.id must be a non-empty string`)
    } else if (mealIds.has(meal.id)) {
      issues.push(`${prefix}.id is duplicated (${meal.id})`)
    } else {
      mealIds.add(meal.id)
    }

    if (!ALLOWED_MEAL_TYPES.has(meal.tipo)) {
      issues.push(`${prefix}.tipo must be one of allowed meal types`)
    }

    if (!Array.isArray(meal.tags)) {
      issues.push(`${prefix}.tags must be an array`)
    }

    if (!Array.isArray(meal.forbiddenIngredients)) {
      issues.push(`${prefix}.forbiddenIngredients must be an array`)
    }

    if (!Array.isArray(meal.ingredientes)) {
      issues.push(`${prefix}.ingredientes must be an array`)
      return
    }

    meal.ingredientes.forEach((ingredient, ingIndex) => {
      const ip = `${prefix}.ingredientes[${ingIndex}]`

      if (!ingredient || typeof ingredient !== 'object') {
        issues.push(`${ip} must be an object`)
        return
      }

      if (typeof ingredient.id !== 'string' || ingredient.id.trim().length === 0) {
        issues.push(`${ip}.id must be a non-empty string`)
      }

      if (typeof ingredient.presentacion !== 'string' || ingredient.presentacion.trim().length === 0) {
        issues.push(`${ip}.presentacion must be a non-empty string`)
      }

      if (!isFiniteNumber(ingredient.cantidadIvan) || ingredient.cantidadIvan < 0) {
        issues.push(`${ip}.cantidadIvan must be a non-negative number`)
      }

      if (!isFiniteNumber(ingredient.cantidadPaulina) || ingredient.cantidadPaulina < 0) {
        issues.push(`${ip}.cantidadPaulina must be a non-negative number`)
      }

      if (typeof ingredient.unidad !== 'string' || ingredient.unidad.trim().length === 0) {
        issues.push(`${ip}.unidad must be a non-empty string`)
      }
    })
  })

  if (issues.length > 0) {
    console.error(`[validate:db] Validation failed with ${issues.length} issue(s):`)
    issues.forEach((issue) => console.error(`- ${issue}`))
    process.exit(1)
  }

  console.log(`[validate:db] OK: ${meals.length} meals validated successfully.`)
}

validate()
