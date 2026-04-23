import type { Comida, TipoComida } from '@/types/domain'
import type { CombinedSlot, DailyEngagement, DietSlot, WeekState, WeekStatePatch } from '@/hooks/useDietApi'
import type { PlanGroupKey } from '@/data/reference/ingredientReference'

export interface WeeklyDietProps {
  focusMode: 'today' | 'week'
  mode: 'my' | 'combined'
  accessToken?: string
  slots: DietSlot[]
  combinedSlots: CombinedSlot[]
  weekState?: WeekState | null
  onSyncWeekState?: (patch: WeekStatePatch) => Promise<boolean>
  myUserId?: string
  otherUserId?: string
  myUserName?: string
  otherUserName?: string
  canEditRelationship?: boolean
  onSwapMeal: (slotId: string, tipo: TipoComida, currentMealId: string) => Promise<void>
  onSetSlotCompleted: (slotId: string, completed: boolean) => Promise<void>
  onSetSlotMeal?: (slotId: string, meal: Comida) => Promise<boolean>
  onReplaceIngredient: (slotId: string, ingredientIndex: number, nextIngredientId: string) => Promise<void>
  onLoadSlotAlternatives?: (slotId: string, currentMealId: string | null) => Promise<Comida[]>
  /** Catálogo completo del backend (GET /api/meals) para sugerencias locales cuando no hay alternativas del plan. */
  onFetchAllMealsCatalog?: () => Promise<Comida[]>
  onRefreshPlan?: () => Promise<unknown>
  dailyEngagement?: DailyEngagement | null
  onSaveDailyEngagement?: (next: DailyEngagement) => Promise<boolean>
  onTrackEvent?: (event: string, context?: Record<string, unknown>) => Promise<boolean>
}

export interface LastAction {
  slotId: string
  previousState: boolean
}

export type SlotSaveState = 'saving' | 'saved' | 'error'

export type PortionOverrides = Record<string, number>
export type GroupStatus = 'ok' | 'warn' | 'alert'
export type GroupFilter = 'all' | 'warn_alert' | 'alert'
export type ReplacingIngredientMap = Record<string, boolean>

export type MealGroupBreakdown = {
  group: PlanGroupKey
  label: string
  targetPortions: number
  adjustedPortions: number
  targetGrams: number
  adjustedGrams: number
  status: GroupStatus
  statusLabel: string
}

export type WeeklyCardMeal = Comida & {
  slotId: string
  day: string
  hour: string
  completed: boolean
  suggestedMeals?: Comida[]
}

export type SavedMealOverrides = Record<string, Comida>
export type DayAdjustmentSnapshot = Record<string, number | null>
