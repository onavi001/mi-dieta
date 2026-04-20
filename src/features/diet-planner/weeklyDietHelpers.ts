import { DEFAULT_MEAL_DISTRIBUTION } from '@/services/nutrition/professionalNutritionRules'
import type { MealRankingPreferences } from '@/services/meal-matching/mealCatalogMatching'
import type { TipoComida } from '@/types/domain'
import type { GroupFilter, GroupStatus } from './weeklyDietTypes'

export const DEFAULT_MEAL_SUGGESTION_PREFERENCES: MealRankingPreferences = {
  preferredCuisineTags: [],
  preferQuickMeals: false,
  avoidFish: false,
  preferMeasuredMeals: true,
  autoApplyToGeneratedWeek: true,
}

export const DEFAULT_DISTRIBUTION: Record<'breakfast' | 'snackAm' | 'lunch' | 'snackPm' | 'dinner', number> = {
  ...DEFAULT_MEAL_DISTRIBUTION,
}

export function titleCase(value: string): string {
  return value.replace(/^\w/, (c) => c.toUpperCase())
}

export function mealDistributionKeyFromTipo(tipo: TipoComida): keyof typeof DEFAULT_DISTRIBUTION {
  if (tipo === 'Desayuno') return 'breakfast'
  if (tipo === 'Comida') return 'lunch'
  if (tipo === 'Cena') return 'dinner'
  if (tipo === 'Snack Mañana') return 'snackAm'
  return 'snackPm'
}

export function makeIngredientKey(slotId: string, ingredientId: string, index: number): string {
  return `${slotId}::${ingredientId}::${index}`
}

export function getGroupStatus(
  targetPortions: number,
  adjustedPortions: number
): { status: GroupStatus; statusLabel: string } {
  if (targetPortions <= 0) return { status: 'ok', statusLabel: 'Sin objetivo' }

  const deviation = Math.abs(adjustedPortions - targetPortions) / targetPortions
  if (deviation <= 0.1) return { status: 'ok', statusLabel: 'En rango' }
  if (deviation <= 0.2) return { status: 'warn', statusLabel: 'Cercano al límite' }
  return { status: 'alert', statusLabel: 'Fuera de rango' }
}

export function passesGroupFilter(status: GroupStatus, filter: GroupFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'warn_alert') return status === 'warn' || status === 'alert'
  return status === 'alert'
}

export function quantizeMultiplier(value: number): number {
  const clamped = Math.max(0, Math.min(3, value))
  return Number((Math.round(clamped / 0.25) * 0.25).toFixed(2))
}
