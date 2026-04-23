import type { Comida } from '@/types/domain'
import type { MealMatchResult } from '@/services/meal-matching/mealCatalogMatching'
import type { FoodRuleProfile } from '@/services/profile-food/profileFoodRules'
import type { PlanGroupKey } from '@/data/reference/ingredientReference'

export interface MealCardProps {
  comida: Comida
  slotId: string
  groupBreakdown: Array<{
    group: string
    label: string
    targetPortions: number
    adjustedPortions: number
    targetGrams: number
    adjustedGrams: number
    status: 'ok' | 'warn' | 'alert'
    statusLabel: string
  }>
  hour: string
  swipeTrigger: number
  isExpanded: boolean
  onToggle: () => void
  isCompleted: boolean
  mealPortionFactor: number
  getIngredientMultiplier: (slotId: string, ingredientId: string, index: number) => number
  onSetIngredientMultiplier: (slotId: string, ingredientId: string, index: number, next: number) => void
  isIngredientReplacing: (slotId: string, index: number) => boolean
  getIngredientOptions: (ingredientId: string, ingredientText: string) => string[]
  onReplaceIngredient: (index: number, currentId: string, ingredientText: string, nextId: string) => void
  onToggleCompleted: () => void
  onSwapMeal: () => void
  onQuickComplete: () => void
  onQuickSwap: () => void
  suggestedMeals?: MealMatchResult[]
  profileFoodRules?: FoodRuleProfile
  suggestionsLoading?: boolean
  onOpenSuggestedMeals?: () => Promise<void>
  hasSuggestedMealOverride?: boolean
  saveState?: 'saving' | 'saved' | 'error'
  onApplySuggestedMeal?: (match: MealMatchResult) => void
  onClearSuggestedMeal?: () => void
  swapEnabled?: boolean
}

export type IngredientConversion = {
  label: string
  value: number
}

export type PieceSizeConversion = {
  sizeLabel: string
  gramsPerPiece: number
  piecesForCurrent: number
}

export type ConversionModalState = {
  ingredientId: string
  sourceAmount: number
  sourceUnit: string
  grams: number
  pieceGrams: number | null
  pieceAmount: number | null
  pieceSizeConversions: PieceSizeConversion[]
  group: PlanGroupKey | null
  portions: number | null
  conversions: IngredientConversion[]
}
