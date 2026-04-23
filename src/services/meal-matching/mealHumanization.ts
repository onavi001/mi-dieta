import { findIngredientPortionProfile, type HumanPortionUnit } from '@/data/reference/ingredientPortionProfiles'
import { detectIngredientGroup, ingredientToEstimatedGrams, unitToGramsFactor } from '@/data/reference/ingredientConversionUtils'
import { normalizeIngredientUnit } from '@/data/reference/ingredientReference'
import type { Comida, MealIngredient } from '@/types/domain'

function nearestAllowed(value: number, allowed: number[]): number {
  return allowed.reduce((best, candidate) => (
    Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best
  ), allowed[0])
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function toGrams(ingredient: MealIngredient): number {
  const group = detectIngredientGroup(ingredient.id, `${ingredient.id} ${ingredient.presentacion || ''}`)
  if (!group) return ingredient.cantidad
  return ingredientToEstimatedGrams(ingredient, group)
}

function asHumanAmount(grams: number, unit: HumanPortionUnit, unitGrams?: number): number {
  if (unit === 'g' || unit === 'ml') return grams
  if (!unitGrams || unitGrams <= 0) return grams
  return grams / unitGrams
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toIngredientQty(amount: number, unit: HumanPortionUnit, _unitGrams?: number): { cantidad: number; unidad: string } {
  if (unit === 'g' || unit === 'ml') {
    return { cantidad: Math.max(1, Math.round(amount)), unidad: unit }
  }

  const rounded = Math.round(amount * 20) / 20
  return {
    cantidad: Math.max(0.25, Number(rounded.toFixed(2))),
    unidad: unit,
  }
}

export function humanizeMealIngredientAmounts(meal: Comida): Comida {
  const nextIngredients = meal.ingredientes.map((ingredient) => {
    const profile = findIngredientPortionProfile(ingredient.id, ingredient.presentacion)
    if (!profile) return ingredient

    const grams = toGrams(ingredient)
    if (!Number.isFinite(grams) || grams <= 0) return ingredient

    const rawHuman = asHumanAmount(grams, profile.defaultUnit, profile.unitGrams)
    const bounded = clamp(rawHuman, profile.minUsefulAmount, profile.maxUsefulAmount)
    const stepped = nearestAllowed(bounded, profile.allowedSteps)

    const next = toIngredientQty(stepped, profile.defaultUnit, profile.unitGrams)
    return {
      ...ingredient,
      cantidad: next.cantidad,
      unidad: next.unidad,
    }
  })

  return {
    ...meal,
    ingredientes: nextIngredients,
  }
}

function unitLabel(unit: string, amount: number): string {
  const normalized = normalizeIngredientUnit(unit)
  if (normalized === 'slice') return amount === 1 ? 'rebanada' : 'rebanadas'
  if (normalized === 'piece') return amount === 1 ? 'pieza' : 'piezas'
  if (normalized === 'cup') return amount === 1 ? 'taza' : 'tazas'
  if (normalized === 'tbsp') return amount === 1 ? 'cda' : 'cdas'
  if (normalized === 'tsp') return amount === 1 ? 'cdta' : 'cdtas'
  if (normalized === 'g' || normalized === 'ml') return normalized
  return normalized
}

export function formatHumanServingHint(ingredient: MealIngredient): string | null {
  const profile = findIngredientPortionProfile(ingredient.id, ingredient.presentacion)
  if (!profile) return null

  const normalizedCurrent = normalizeIngredientUnit(ingredient.unidad)
  const unit = profile.defaultUnit
  if (normalizedCurrent !== unit) return null

  const amount = Number(ingredient.cantidad.toFixed(2))
  return `${amount} ${unitLabel(unit, amount)}`
}

export function convertAmountToHumanHint(ingredient: MealIngredient, amount: number, unit: string): string | null {
  const profile = findIngredientPortionProfile(ingredient.id, ingredient.presentacion)
  if (!profile) return null
  const normalizedUnit = normalizeIngredientUnit(unit)
  if (normalizedUnit === profile.defaultUnit) {
    const rounded = Number(amount.toFixed(2))
    return `${rounded} ${unitLabel(profile.defaultUnit, rounded)}`
  }

  const group = detectIngredientGroup(ingredient.id, `${ingredient.id} ${ingredient.presentacion || ''}`)
  const factor = unitToGramsFactor(unit, group, ingredient.id)
  if (!factor || factor <= 0 || !profile.unitGrams || profile.unitGrams <= 0) return null

  const grams = amount * factor
  const human = grams / profile.unitGrams
  if (!Number.isFinite(human) || human <= 0) return null
  const roundedHuman = Math.round(human * 4) / 4
  return `${roundedHuman} ${unitLabel(profile.defaultUnit, roundedHuman)}`
}
