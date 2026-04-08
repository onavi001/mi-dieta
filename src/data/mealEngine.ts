import mealDb from './meal-database.json'
import type { Comida, TipoComida } from './types'
import { WEEKLY_SLOTS } from './weeklySlots'

type MealDb = {
  version: string
  rules: {
    forbiddenIngredients: string[]
  }
  meals: Comida[]
}

const DATABASE = mealDb as MealDb

function validateMealDatabaseSchema(db: MealDb): void {
  const issues: string[] = []

  if (!db || !Array.isArray(db.meals)) {
    console.error('[mealEngine] meal-database.json inválido: falta arreglo meals')
    return
  }

  db.meals.forEach((meal, index) => {
    if (!meal.id) issues.push(`meal[${index}] sin id`)
    if (!meal.tipo) issues.push(`meal[${index}] sin tipo`)
    if (!Array.isArray(meal.forbiddenIngredients)) {
      issues.push(`${meal.id || `meal[${index}]`} forbiddenIngredients no es arreglo`)
    }

    if (!Array.isArray(meal.ingredientes)) {
      issues.push(`${meal.id || `meal[${index}]`} ingredientes no es arreglo`)
      return
    }

    meal.ingredientes.forEach((ing, ingIndex) => {
      if (!ing.id) issues.push(`${meal.id} ingredientes[${ingIndex}] sin id`)
      if (typeof ing.presentacion !== 'string' || ing.presentacion.trim().length === 0) {
        issues.push(`${meal.id} ingredientes[${ingIndex}] presentacion inválida o vacía`)
      }
      if (typeof ing.cantidadIvan !== 'number') {
        issues.push(`${meal.id} ingredientes[${ingIndex}] cantidadIvan inválida`)
      }
      if (typeof ing.cantidadPaulina !== 'number') {
        issues.push(`${meal.id} ingredientes[${ingIndex}] cantidadPaulina inválida`)
      }
      if (!ing.unidad) issues.push(`${meal.id} ingredientes[${ingIndex}] sin unidad`)
    })
  })

  if (issues.length > 0) {
    console.warn('[mealEngine] Se detectaron problemas en meal-database.json:')
    issues.slice(0, 20).forEach((issue) => console.warn(`- ${issue}`))
    if (issues.length > 20) {
      console.warn(`- ... y ${issues.length - 20} problemas adicionales`)
    }
  }
}

validateMealDatabaseSchema(DATABASE)

const GLOBAL_FORBIDDEN = new Set(
  DATABASE.rules.forbiddenIngredients.map((item) => item.toLowerCase())
)

function mealIsAllowed(meal: Comida): boolean {
  return !meal.forbiddenIngredients.some((item) => GLOBAL_FORBIDDEN.has(item.toLowerCase()))
}

const ALLOWED_MEALS = DATABASE.meals.filter(mealIsAllowed)

function optionsByType(tipo: TipoComida): Comida[] {
  return ALLOWED_MEALS.filter((meal) => meal.tipo === tipo)
}

function fallbackMeal(tipo: TipoComida): Comida {
  const candidate = optionsByType(tipo)[0]
  if (candidate) {
    return candidate
  }

  return {
    id: `fallback-${tipo}`,
    tipo,
    nombre: `Sin opciones para ${tipo}`,
    receta: 'Agrega comidas validas en meal-database.json',
    tip: 'No hay comidas cargadas para este tipo.',
    tags: ['fallback'],
    forbiddenIngredients: [],
    ingredientes: [],
  }
}

export function getMealOptions(tipo: TipoComida): Comida[] {
  return optionsByType(tipo)
}

export type WeeklyMeal = Comida & {
  slotId: string
  day: string
  hour: string
}

export function buildWeeklyMeals(selectedBySlot: Record<string, string>): WeeklyMeal[] {
  return WEEKLY_SLOTS.map((slot) => {
    const options = optionsByType(slot.tipo)
    const defaultIndex = WEEKLY_SLOTS.indexOf(slot) % Math.max(options.length, 1)
    const defaultTemplate = options[defaultIndex] ?? fallbackMeal(slot.tipo)

    const selectedId = selectedBySlot[slot.id]
    const selectedTemplate = selectedId
      ? options.find((item) => item.id === selectedId)
      : undefined

    const template = selectedTemplate ?? defaultTemplate

    return {
      slotId: slot.id,
      day: slot.day,
      hour: slot.hour,
      ...template,
    }
  })
}

export function nextMealForSlot(tipo: TipoComida, currentMealId: string): string {
  const options = optionsByType(tipo)
  if (options.length === 0) {
    return currentMealId
  }

  const currentIndex = options.findIndex((meal) => meal.id === currentMealId)
  if (currentIndex === -1) {
    return options[0].id
  }

  return options[(currentIndex + 1) % options.length].id
}
