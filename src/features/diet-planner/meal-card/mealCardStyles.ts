import type { PlanGroupKey } from '@/data/reference/ingredientReference'

export function portionStatusSurfaceClasses(status: 'ok' | 'warn' | 'alert'): string {
  if (status === 'ok') return 'bg-emerald-50 border-emerald-200 text-emerald-900'
  if (status === 'warn') return 'bg-amber-50 border-amber-200 text-amber-900'
  return 'bg-rose-50 border-rose-200 text-rose-900'
}

export function groupBadgeClasses(group: PlanGroupKey | null): string {
  if (group === 'verduras') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (group === 'frutas') return 'bg-orange-100 text-orange-800 border-orange-200'
  if (group === 'cereales_tuberculos') return 'bg-amber-100 text-amber-800 border-amber-200'
  if (group === 'leguminosas') return 'bg-lime-100 text-lime-800 border-lime-200'
  if (group === 'proteina_animal_o_alternativas') return 'bg-rose-100 text-rose-800 border-rose-200'
  if (group === 'lacteos_o_sustitutos') return 'bg-sky-100 text-sky-800 border-sky-200'
  if (group === 'grasas_saludables') return 'bg-violet-100 text-violet-800 border-violet-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export function suggestionScoreClasses(score: number): string {
  if (score <= 0.75) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (score <= 1.5) return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-rose-100 text-rose-800 border-rose-200'
}

export function suggestionScoreLabel(score: number): string {
  if (score <= 0.75) return 'Muy compatible'
  if (score <= 1.5) return 'Compatible'
  return 'Aproximado'
}
