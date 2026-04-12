import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DAYS } from '../data/weeklySlots'
import { MealCard } from './MealCard'
import type { Comida, TipoComida } from '../data/types'
import type { CombinedSlot, DietSlot, WeekState, WeekStatePatch } from '../hooks/useDietApi'
import { useNutritionApi } from '../hooks/useNutritionApi'
import { triggerHaptic } from '../utils/haptics'
import {
  GROUP_GRAMS_PER_PORTION,
  GROUP_LABELS,
  INGREDIENT_REFERENCE,
  normalizeIngredientText,
  type PlanGroupKey,
} from '../data/ingredientReference'
import {
  detectIngredientGroup,
  ingredientToEstimatedGrams,
} from '../data/ingredientConversionUtils'
import {
  DEFAULT_MEAL_DISTRIBUTION,
  distributeGroupPortionsByMeal,
  mealDistributionKeys,
  mealDistributionWeightsMap,
  profileGoalToNutritionGoal,
  type DistributionKey,
} from '../data/professionalNutritionRules'
import { getCuratedExpandedMealsByType } from '../data/curatedMealCatalog'
import {
  rankMealsForGroupTarget,
  type MealMatchResult,
  type MealRankingPreferences,
} from '../data/mealCatalogMatching'
import {
  filterAndSortMealsForProfile,
  mealPreferenceScore,
  sortIngredientOptionsForProfile,
} from '../data/profileFoodRules'

const SWIPE_TRIGGER = 72

const DEFAULT_DISTRIBUTION: Record<'breakfast' | 'snackAm' | 'lunch' | 'snackPm' | 'dinner', number> = {
  ...DEFAULT_MEAL_DISTRIBUTION,
}

interface WeeklyDietProps {
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
  onRefreshPlan?: () => Promise<unknown>
}

interface LastAction {
  slotId: string
  previousState: boolean
}

type SlotSaveState = 'saving' | 'saved' | 'error'

type PortionOverrides = Record<string, number>
type GroupStatus = 'ok' | 'warn' | 'alert'
type GroupFilter = 'all' | 'warn_alert' | 'alert'
type ReplacingIngredientMap = Record<string, boolean>
type MealGroupBreakdown = {
  group: PlanGroupKey
  label: string
  targetPortions: number
  adjustedPortions: number
  targetGrams: number
  adjustedGrams: number
  status: GroupStatus
  statusLabel: string
}

type WeeklyCardMeal = Comida & {
  slotId: string
  day: string
  hour: string
  completed: boolean
  suggestedMeals?: Comida[]
}

type SavedMealOverrides = Record<string, Comida>
type DayAdjustmentSnapshot = Record<string, number | null>

const DEFAULT_MEAL_SUGGESTION_PREFERENCES: MealRankingPreferences = {
  preferredCuisineTags: [],
  preferQuickMeals: false,
  avoidFish: false,
  preferMeasuredMeals: true,
  autoApplyToGeneratedWeek: true,
}

function titleCase(value: string): string {
  return value.replace(/^\w/, (c) => c.toUpperCase())
}

function mealDistributionKeyFromTipo(tipo: TipoComida): keyof typeof DEFAULT_DISTRIBUTION {
  if (tipo === 'Desayuno') return 'breakfast'
  if (tipo === 'Comida') return 'lunch'
  if (tipo === 'Cena') return 'dinner'
  if (tipo === 'Snack Mañana') return 'snackAm'
  return 'snackPm'
}

function makeIngredientKey(slotId: string, ingredientId: string, index: number): string {
  return `${slotId}::${ingredientId}::${index}`
}

function getGroupStatus(targetPortions: number, adjustedPortions: number): { status: GroupStatus; statusLabel: string } {
  if (targetPortions <= 0) return { status: 'ok', statusLabel: 'Sin objetivo' }

  const deviation = Math.abs(adjustedPortions - targetPortions) / targetPortions
  if (deviation <= 0.1) return { status: 'ok', statusLabel: 'En rango' }
  if (deviation <= 0.2) return { status: 'warn', statusLabel: 'Cercano al límite' }
  return { status: 'alert', statusLabel: 'Fuera de rango' }
}

function statusClasses(status: GroupStatus): string {
  if (status === 'ok') return 'bg-emerald-50 border-emerald-200 text-emerald-900'
  if (status === 'warn') return 'bg-amber-50 border-amber-200 text-amber-900'
  return 'bg-rose-50 border-rose-200 text-rose-900'
}

function passesGroupFilter(status: GroupStatus, filter: GroupFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'warn_alert') return status === 'warn' || status === 'alert'
  return status === 'alert'
}

function quantizeMultiplier(value: number): number {
  const clamped = Math.max(0, Math.min(3, value))
  return Number((Math.round(clamped / 0.25) * 0.25).toFixed(2))
}

export function WeeklyDiet({
  focusMode,
  mode,
  accessToken,
  slots,
  combinedSlots,
  weekState,
  onSyncWeekState,
  myUserId,
  otherUserId,
  myUserName,
  otherUserName,
  canEditRelationship,
  onSwapMeal,
  onSetSlotCompleted,
  onSetSlotMeal,
  onReplaceIngredient,
  onLoadSlotAlternatives,
  onRefreshPlan,
}: WeeklyDietProps) {
  const { summary, loadSummary } = useNutritionApi(accessToken)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [expandedImpactDays, setExpandedImpactDays] = useState<Set<string>>(new Set())
  const [lastAction, setLastAction] = useState<LastAction | null>(null)
  const [savedMealOverrides, setSavedMealOverrides] = useState<SavedMealOverrides>(() => weekState?.mealOverrides || {})
  const [mealSuggestionPreferences, setMealSuggestionPreferences] = useState<MealRankingPreferences>(() => weekState?.suggestionPreferences || DEFAULT_MEAL_SUGGESTION_PREFERENCES)
  const [slotSuggestedMeals, setSlotSuggestedMeals] = useState<Record<string, Comida[]>>({})
  const [loadingSlotSuggestions, setLoadingSlotSuggestions] = useState<Record<string, boolean>>({})
  const [loadedSuggestionKeyBySlot, setLoadedSuggestionKeyBySlot] = useState<Record<string, string>>({})
  const [portionOverrides, setPortionOverrides] = useState<PortionOverrides>(() => weekState?.ingredientMultipliers || {})
  const [replacingIngredients, setReplacingIngredients] = useState<ReplacingIngredientMap>({})
  const [slotSaveStates, setSlotSaveStates] = useState<Record<string, SlotSaveState>>({})
  const [groupFilter] = useState<GroupFilter>('all')
  const [autoAdjustMessage, setAutoAdjustMessage] = useState('')
  const [lastAutoAdjustSnapshotByDay, setLastAutoAdjustSnapshotByDay] = useState<Record<string, DayAdjustmentSnapshot>>({})
  const [saveFeedback, setSaveFeedback] = useState('')
  const [saveError, setSaveError] = useState('')
  const multiplierDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slotSaveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const showSaveFeedback = useCallback((message: string) => {
    setSaveError('')
    setSaveFeedback(message)
    if (saveFeedbackTimeoutRef.current) {
      clearTimeout(saveFeedbackTimeoutRef.current)
    }
    saveFeedbackTimeoutRef.current = setTimeout(() => {
      setSaveFeedback('')
    }, 1800)
  }, [])

  const showSaveError = useCallback((message: string) => {
    setSaveFeedback('')
    setSaveError(message)
    if (saveErrorTimeoutRef.current) {
      clearTimeout(saveErrorTimeoutRef.current)
    }
    saveErrorTimeoutRef.current = setTimeout(() => {
      setSaveError('')
    }, 2400)
  }, [])

  const setSlotSaveState = useCallback((slotIds: string[], state: SlotSaveState, clearAfterMs = 0) => {
    setSlotSaveStates((prev) => {
      const next = { ...prev }
      slotIds.forEach((slotId) => {
        next[slotId] = state
      })
      return next
    })

    slotIds.forEach((slotId) => {
      const existingTimeout = slotSaveTimeoutsRef.current[slotId]
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        delete slotSaveTimeoutsRef.current[slotId]
      }

      if (clearAfterMs > 0) {
        slotSaveTimeoutsRef.current[slotId] = setTimeout(() => {
          setSlotSaveStates((prev) => {
            const next = { ...prev }
            delete next[slotId]
            return next
          })
          delete slotSaveTimeoutsRef.current[slotId]
        }, clearAfterMs)
      }
    })
  }, [])

  const persistSuggestionPreferences = useCallback((nextPreferences: MealRankingPreferences) => {
    if (!onSyncWeekState) return

    const normalizedPreferences = {
      preferredCuisineTags: nextPreferences.preferredCuisineTags || [],
      preferQuickMeals: Boolean(nextPreferences.preferQuickMeals),
      avoidFish: Boolean(nextPreferences.avoidFish),
      preferMeasuredMeals:
        typeof nextPreferences.preferMeasuredMeals === 'boolean'
          ? nextPreferences.preferMeasuredMeals
          : true,
      autoApplyToGeneratedWeek:
        typeof nextPreferences.autoApplyToGeneratedWeek === 'boolean'
          ? nextPreferences.autoApplyToGeneratedWeek
          : true,
    }

    void Promise.resolve(onSyncWeekState({ suggestionPreferences: normalizedPreferences })).then((saved) => {
      if (saved) showSaveFeedback('Preferencias guardadas')
      else showSaveError('No se pudieron guardar las preferencias')
    })
  }, [onSyncWeekState, showSaveError, showSaveFeedback])

  useEffect(() => {
    if (!accessToken) return
    void loadSummary()
  }, [accessToken, loadSummary])

  const ingredientOptionsByGroup = useMemo(() => {
    const grouped = {
      verduras: [] as string[],
      frutas: [] as string[],
      cereales_tuberculos: [] as string[],
      leguminosas: [] as string[],
      proteina_animal_o_alternativas: [] as string[],
      lacteos_o_sustitutos: [] as string[],
      grasas_saludables: [] as string[],
    }

    for (const [id, ref] of Object.entries(INGREDIENT_REFERENCE)) {
      grouped[ref.group].push(id)
    }

    for (const group of Object.keys(grouped) as PlanGroupKey[]) {
      grouped[group].sort((a, b) => a.localeCompare(b, 'es'))
    }

    return grouped
  }, [])

  const today = titleCase(new Date().toLocaleDateString('es-ES', { weekday: 'long' }))

  const meals = useMemo<WeeklyCardMeal[]>(() => {
    return slots
      .filter((slot) => Boolean(slot.meal))
      .map((slot) => ({
        ...((savedMealOverrides[slot.slot] || slot.meal) as Comida),
        slotId: slot.slot,
        day: slot.day,
        hour: slot.hour,
        completed: slot.completed,
        suggestedMeals: slot.suggestedMeals,
      }))
  }, [savedMealOverrides, slots])

  const displayedDays = focusMode === 'today' ? DAYS.filter((d) => d === today) : DAYS
  const todayMeals = meals.filter((meal) => meal.day === today)
  const completedToday = todayMeals.filter((meal) => meal.completed).length

  const distributionByMeal = useMemo(() => {
    const raw = summary?.activePlanVersion?.distribution_by_meal
    const next = { ...DEFAULT_DISTRIBUTION }
    if (raw && typeof raw === 'object') {
      for (const key of Object.keys(DEFAULT_DISTRIBUTION) as Array<keyof typeof DEFAULT_DISTRIBUTION>) {
        const value = (raw as Record<string, unknown>)[key]
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          next[key] = value
        }
      }
    }

    return next
  }, [summary?.activePlanVersion?.distribution_by_meal])

  const planPortionsByGroup = useMemo<Record<PlanGroupKey, number>>(() => {
    const raw = summary?.activePlanVersion?.portions_by_group
    if (!raw || typeof raw !== 'object') {
      return {
        verduras: 0,
        frutas: 0,
        cereales_tuberculos: 0,
        leguminosas: 0,
        proteina_animal_o_alternativas: 0,
        lacteos_o_sustitutos: 0,
        grasas_saludables: 0,
      }
    }

    return {
      verduras: Number((raw as Record<string, unknown>).verduras || 0),
      frutas: Number((raw as Record<string, unknown>).frutas || 0),
      cereales_tuberculos: Number((raw as Record<string, unknown>).cereales_tuberculos || 0),
      leguminosas: Number((raw as Record<string, unknown>).leguminosas || 0),
      proteina_animal_o_alternativas: Number((raw as Record<string, unknown>).proteina_animal_o_alternativas || 0),
      lacteos_o_sustitutos: Number((raw as Record<string, unknown>).lacteos_o_sustitutos || 0),
      grasas_saludables: Number((raw as Record<string, unknown>).grasas_saludables || 0),
    }
  }, [summary?.activePlanVersion?.portions_by_group])

  const planDailyTotals = useMemo(() => {
    const portions = Object.values(planPortionsByGroup).reduce((acc, value) => acc + value, 0)
    const grams = Object.entries(planPortionsByGroup).reduce((acc, [group, value]) => {
      const factor = GROUP_GRAMS_PER_PORTION[group as PlanGroupKey] ?? 0
      return acc + value * factor
    }, 0)

    return {
      portions: Number(portions.toFixed(2)),
      grams: Math.round(grams),
    }
  }, [planPortionsByGroup])

  const mealPortionFactor = (tipo: TipoComida): number => {
    const key = mealDistributionKeyFromTipo(tipo)
    const base = DEFAULT_DISTRIBUTION[key] || 1
    const custom = distributionByMeal[key]
    return Number((custom / base).toFixed(2))
  }

  const getIngredientMultiplier = (slotId: string, ingredientId: string, index: number): number => {
    const key = makeIngredientKey(slotId, ingredientId, index)
    return portionOverrides[key] ?? 1
  }

  const setIngredientMultiplier = (slotId: string, ingredientId: string, index: number, next: number) => {
    const key = makeIngredientKey(slotId, ingredientId, index)
    const clamped = quantizeMultiplier(next)

    setPortionOverrides((prev) => {
      const nextOverrides = clamped < 0.001
        ? (() => { const copy = { ...prev }; delete copy[key]; return copy })()
        : { ...prev, [key]: clamped }

      // Debounced sync to DB so rapid clicks don't create many requests.
      if (multiplierDebounceRef.current) clearTimeout(multiplierDebounceRef.current)
      setSlotSaveState([slotId], 'saving')
      multiplierDebounceRef.current = setTimeout(() => {
        void Promise.resolve(onSyncWeekState?.({ ingredientMultipliers: nextOverrides })).then((saved) => {
          if (saved) {
            showSaveFeedback('Cantidades guardadas')
            setSlotSaveState([slotId], 'saved', 1600)
          } else if (onSyncWeekState) {
            showSaveError('No se pudieron guardar las cantidades')
            setSlotSaveState([slotId], 'error', 2400)
          }
        })
      }, 800)

      return nextOverrides
    })
  }

  const ingredientOptionsFor = (ingredientId: string, ingredientText: string): string[] => {
    const group = detectIngredientGroup(ingredientId, ingredientText)
    if (!group) return [normalizeIngredientText(ingredientId)]

    return sortIngredientOptionsForProfile(ingredientOptionsByGroup[group], ingredientId, {
      allergies: summary?.nutritionProfile?.allergies,
      intolerances: summary?.nutritionProfile?.intolerances,
      foodPreferences: summary?.nutritionProfile?.food_preferences,
    })
  }

  const setIngredientReplacement = (
    slotId: string,
    index: number,
    currentId: string,
    ingredientText: string,
    nextId: string
  ) => {
    const currentGroup = detectIngredientGroup(currentId, ingredientText)
    const nextGroup = detectIngredientGroup(nextId, nextId)
    if (!currentGroup || !nextGroup || currentGroup !== nextGroup) return

    const replacingKey = `${slotId}::${index}`
    if (replacingIngredients[replacingKey]) return

    setReplacingIngredients((prev) => ({
      ...prev,
      [replacingKey]: true,
    }))
    setSlotSaveState([slotId], 'saving')

    void onReplaceIngredient(slotId, index, nextId)
      .then(() => {
        triggerHaptic('light')
        showSaveFeedback('Ingrediente guardado')
        setSlotSaveState([slotId], 'saved', 1600)
      })
      .catch(() => {
        triggerHaptic('warning')
        showSaveError('No se pudo guardar el ingrediente')
        setSlotSaveState([slotId], 'error', 2400)
      })
      .finally(() => {
        setReplacingIngredients((prev) => {
          const next = { ...prev }
          delete next[replacingKey]
          return next
        })
      })
  }

  const isIngredientReplacing = (slotId: string, index: number): boolean => {
    return Boolean(replacingIngredients[`${slotId}::${index}`])
  }

  const mealGroupAdjustedGrams = (meal: WeeklyCardMeal, group: PlanGroupKey): number => {
    if (!meal.ingredientes || meal.ingredientes.length === 0) return 0

    const mealFactor = meal.id.startsWith('plan-') ? 1 : mealPortionFactor(meal.tipo)

    return meal.ingredientes.reduce((acc, ingredient, idx) => {
      const groupDetected = detectIngredientGroup(ingredient.id, `${ingredient.id} ${ingredient.presentacion || ''}`)
      if (groupDetected !== group) return acc

      const ingredientMultiplier = getIngredientMultiplier(meal.slotId, ingredient.id, idx)
      const grams = ingredientToEstimatedGrams(ingredient, group)
      return acc + grams * mealFactor * ingredientMultiplier
    }, 0)
  }

  const dailyGroupImpact = (dayMeals: WeeklyCardMeal[]) => {
    return (Object.keys(planPortionsByGroup) as PlanGroupKey[]).map((group) => {
      const targetPortions = planPortionsByGroup[group]
      const gramsPerPortion = GROUP_GRAMS_PER_PORTION[group]
      const adjustedGrams = Math.round(
        dayMeals.reduce((acc, meal) => acc + mealGroupAdjustedGrams(meal, group), 0)
      )
      const adjustedPortions = Number((adjustedGrams / gramsPerPortion).toFixed(2))

      return {
        group,
        label: GROUP_LABELS[group],
        targetPortions: Number(targetPortions.toFixed(2)),
        adjustedPortions,
        targetGrams: Math.round(targetPortions * gramsPerPortion),
        adjustedGrams,
        ...getGroupStatus(targetPortions, adjustedPortions),
      }
    })
  }

  const selectedMealsPerDay = useMemo(() => {
    const raw = Number(summary?.nutritionProfile?.meals_per_day || 5)
    if (!Number.isFinite(raw)) return 5
    return Math.max(3, Math.min(5, raw))
  }, [summary?.nutritionProfile?.meals_per_day])

  const distributionKeys = useMemo(() => {
    return mealDistributionKeys(selectedMealsPerDay)
  }, [selectedMealsPerDay])

  const distributionWeightsByKey = useMemo(() => {
    return mealDistributionWeightsMap(selectedMealsPerDay, {
      breakfast: distributionByMeal.breakfast,
      snackAm: distributionByMeal.snackAm,
      lunch: distributionByMeal.lunch,
      snackPm: distributionByMeal.snackPm,
      dinner: distributionByMeal.dinner,
    })
  }, [distributionByMeal.breakfast, distributionByMeal.dinner, distributionByMeal.lunch, distributionByMeal.snackAm, distributionByMeal.snackPm, selectedMealsPerDay])

  const mealGroupBreakdown = (meal: WeeklyCardMeal): MealGroupBreakdown[] => {
    const mealKey = mealDistributionKeyFromTipo(meal.tipo) as DistributionKey

    return (Object.keys(planPortionsByGroup) as PlanGroupKey[])
      .map((group) => {
        const goal = profileGoalToNutritionGoal(summary?.nutritionProfile?.objective_goal)
        const targetByMeal = distributeGroupPortionsByMeal(
          group,
          planPortionsByGroup[group],
          distributionKeys,
          distributionWeightsByKey,
          { goal }
        )
        const targetPortions = targetByMeal[mealKey] || 0
        const gramsPerPortion = GROUP_GRAMS_PER_PORTION[group]
        const adjustedGrams = Math.round(mealGroupAdjustedGrams(meal, group))
        const adjustedPortions = Number((adjustedGrams / gramsPerPortion).toFixed(2))

        return {
          group,
          label: GROUP_LABELS[group],
          targetPortions: Number(targetPortions.toFixed(2)),
          adjustedPortions,
          targetGrams: Math.round(targetPortions * gramsPerPortion),
          adjustedGrams,
          ...getGroupStatus(targetPortions, adjustedPortions),
        }
      })
      .filter((item) => item.targetPortions > 0)
  }

  const suggestedMealsBySlot: Record<string, MealMatchResult[]> = {}

  for (const meal of meals) {
    const target = Object.fromEntries(
      mealGroupBreakdown(meal).map((item) => [item.group, item.targetPortions])
    )

    const apiSuggestedMeals = (slotSuggestedMeals[meal.slotId] && slotSuggestedMeals[meal.slotId].length > 0)
      ? slotSuggestedMeals[meal.slotId]
      : (meal.suggestedMeals || [])
    const profileFoodRules = {
      allergies: summary?.nutritionProfile?.allergies,
      intolerances: summary?.nutritionProfile?.intolerances,
      foodPreferences: summary?.nutritionProfile?.food_preferences,
    }

    const rankedApiSuggestions = apiSuggestedMeals.length > 0
      ? rankMealsForGroupTarget(
        filterAndSortMealsForProfile(apiSuggestedMeals.filter((option) => option.id !== meal.id), profileFoodRules),
        target,
        { preferences: mealSuggestionPreferences }
      )
      : []

    const rankedCuratedSuggestions = rankMealsForGroupTarget(
      filterAndSortMealsForProfile(getCuratedExpandedMealsByType(meal.tipo).filter((option) => option.id !== meal.id), profileFoodRules),
      target,
      { preferences: mealSuggestionPreferences }
    )

    const combined = [...rankedApiSuggestions, ...rankedCuratedSuggestions]
    const deduped = combined.filter(
      (item, index) => combined.findIndex((candidate) => candidate.meal.id === item.meal.id) === index
    ).sort((left, right) => {
      if (left.rankScore !== right.rankScore) return left.rankScore - right.rankScore

      const preferenceDelta = mealPreferenceScore(right.meal, profileFoodRules) - mealPreferenceScore(left.meal, profileFoodRules)
      if (preferenceDelta !== 0) return preferenceDelta

      return left.meal.nombre.localeCompare(right.meal.nombre, 'es')
    })

    suggestedMealsBySlot[meal.slotId] = deduped
  }

  const toggleCard = (id: string) => {
    const next = new Set(expandedCards)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedCards(next)
  }

  const toggleDayImpact = (day: string) => {
    setExpandedImpactDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) {
        next.delete(day)
      } else {
        next.add(day)
      }
      return next
    })
  }

  const toggleMealCompleted = async (slotId: string, previousState: boolean) => {
    setSlotSaveState([slotId], 'saving')
    try {
      await onSetSlotCompleted(slotId, !previousState)
      triggerHaptic('success')
      setLastAction({ slotId, previousState })
      setSlotSaveState([slotId], 'saved', 1200)
    } catch {
      showSaveError('No se pudo actualizar el estado de la comida')
      setSlotSaveState([slotId], 'error', 2400)
    }
  }

  const toggleDayCompleted = async (day: string) => {
    const dayMeals = meals.filter((meal) => meal.day === day)
    if (dayMeals.length === 0) return

    const isCompleted = dayMeals.every((meal) => meal.completed)
    const daySlotIds = dayMeals.map((meal) => meal.slotId)
    setSlotSaveState(daySlotIds, 'saving')
    try {
      await Promise.all(dayMeals.map((meal) => onSetSlotCompleted(meal.slotId, !isCompleted)))
      triggerHaptic('light')
      setSlotSaveState(daySlotIds, 'saved', 1200)
    } catch {
      showSaveError('No se pudieron actualizar las comidas del día')
      setSlotSaveState(daySlotIds, 'error', 2400)
    }
  }

  const swapMeal = async (slotId: string, tipo: TipoComida, currentMealId: string) => {
    await onSwapMeal(slotId, tipo, currentMealId)
    triggerHaptic('warning')
  }

  const undoLastMealToggle = async () => {
    if (!lastAction) return

    setSlotSaveState([lastAction.slotId], 'saving')
    try {
      await onSetSlotCompleted(lastAction.slotId, lastAction.previousState)
      setSlotSaveState([lastAction.slotId], 'saved', 1200)
      setLastAction(null)
    } catch {
      showSaveError('No se pudo deshacer el cambio')
      setSlotSaveState([lastAction.slotId], 'error', 2400)
    }
  }

  const setSavedMealOverride = useCallback((slotId: string, meal: Comida) => {
    const override: Comida = {
      ...meal,
      realDishMetadata: {
        ...meal.realDishMetadata,
        source: 'curated' as const,
      },
    }
    const previousOverride = savedMealOverrides[slotId]
    const nextOverrides = {
      ...savedMealOverrides,
      [slotId]: override,
    }

    setSavedMealOverrides(nextOverrides)
    setSlotSaveState([slotId], 'saving')
    if (onSetSlotMeal) {
      void Promise.resolve(onSetSlotMeal(slotId, override)).then(async (saved) => {
        if (saved) {
          if (onRefreshPlan) {
            await onRefreshPlan()
          }
          showSaveFeedback('Alternativa guardada en backend')
          setSlotSaveState([slotId], 'saved', 1600)
        } else {
          setSavedMealOverrides((prev) => {
            const rollback = { ...prev }
            if (previousOverride) rollback[slotId] = previousOverride
            else delete rollback[slotId]
            return rollback
          })
          showSaveError('No se pudo guardar la alternativa en backend')
          setSlotSaveState([slotId], 'error', 2400)
        }
      })
      triggerHaptic('light')
      return
    }

    void Promise.resolve(onSyncWeekState?.({ mealOverrides: nextOverrides })).then(async (saved) => {
      if (saved) {
        if (onRefreshPlan) {
          await onRefreshPlan()
        }
        showSaveFeedback('Alternativa guardada en backend')
        setSlotSaveState([slotId], 'saved', 1600)
      } else if (onSyncWeekState) {
        setSavedMealOverrides((prev) => {
          const rollback = { ...prev }
          if (previousOverride) rollback[slotId] = previousOverride
          else delete rollback[slotId]
          return rollback
        })
        showSaveError('No se pudo guardar la alternativa en backend')
        setSlotSaveState([slotId], 'error', 2400)
      }
    })
    triggerHaptic('light')
  }, [onRefreshPlan, onSetSlotMeal, onSyncWeekState, savedMealOverrides, setSlotSaveState, showSaveError, showSaveFeedback])

  const clearSavedMealOverride = useCallback((slotId: string) => {
    const previousOverride = savedMealOverrides[slotId]
    const nextOverrides = { ...savedMealOverrides }
    delete nextOverrides[slotId]

    setSavedMealOverrides(nextOverrides)
    setSlotSaveState([slotId], 'saving')
    const slotBaseMeal = slots.find((slot) => slot.slot === slotId)?.meal || null

    if (onSetSlotMeal && slotBaseMeal) {
      void Promise.resolve(onSetSlotMeal(slotId, slotBaseMeal)).then(async (saved) => {
        if (saved) {
          if (onRefreshPlan) {
            await onRefreshPlan()
          }
          showSaveFeedback('Comida restaurada y confirmada en backend')
          setSlotSaveState([slotId], 'saved', 1600)
        } else {
          setSavedMealOverrides((prev) => {
            if (!previousOverride) return prev
            return {
              ...prev,
              [slotId]: previousOverride,
            }
          })
          showSaveError('No se pudo restaurar la comida en backend')
          setSlotSaveState([slotId], 'error', 2400)
        }
      })
      triggerHaptic('light')
      return
    }

    void Promise.resolve(onSyncWeekState?.({ mealOverrides: nextOverrides })).then(async (saved) => {
      if (saved) {
        if (onRefreshPlan) {
          await onRefreshPlan()
        }
        showSaveFeedback('Comida restaurada y confirmada en backend')
        setSlotSaveState([slotId], 'saved', 1600)
      } else if (onSyncWeekState) {
        setSavedMealOverrides((prev) => {
          if (!previousOverride) return prev
          return {
            ...prev,
            [slotId]: previousOverride,
          }
        })
        showSaveError('No se pudo restaurar la comida en backend')
        setSlotSaveState([slotId], 'error', 2400)
      }
    })
    triggerHaptic('light')
  }, [onRefreshPlan, onSetSlotMeal, onSyncWeekState, savedMealOverrides, setSlotSaveState, showSaveError, showSaveFeedback, slots])

  const loadSlotAlternatives = async (slotId: string, currentMealId: string | null) => {
    if (!onLoadSlotAlternatives) return

    const suggestionKey = `${slotId}::${currentMealId || 'none'}`
    if (loadingSlotSuggestions[slotId]) return
    if (loadedSuggestionKeyBySlot[slotId] === suggestionKey && Array.isArray(slotSuggestedMeals[slotId])) {
      return
    }

    setLoadingSlotSuggestions((prev) => ({ ...prev, [slotId]: true }))
    try {
      const suggestions = await onLoadSlotAlternatives(slotId, currentMealId)
      setSlotSuggestedMeals((prev) => ({ ...prev, [slotId]: suggestions }))
      setLoadedSuggestionKeyBySlot((prev) => ({ ...prev, [slotId]: suggestionKey }))
    } finally {
      setLoadingSlotSuggestions((prev) => ({ ...prev, [slotId]: false }))
    }
  }

  const toggleCuisinePreference = (tag: string) => {
    setMealSuggestionPreferences((prev) => {
      const current = prev.preferredCuisineTags || []
      const next = current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]

      const nextPreferences = {
        ...prev,
        preferredCuisineTags: next,
      }

      persistSuggestionPreferences(nextPreferences)

      return nextPreferences
    })
  }

  const autoAdjustDayToPlan = (day: string) => {
    const dayMeals = meals.filter((meal) => meal.day === day)
    if (dayMeals.length === 0) return

    const affectedKeys = new Set<string>()
    for (const meal of dayMeals) {
      for (const [idx, ingredient] of meal.ingredientes.entries()) {
        affectedKeys.add(makeIngredientKey(meal.slotId, ingredient.id, idx))
      }
    }

    const groupRatios: Record<PlanGroupKey, number> = {
      verduras: 1,
      frutas: 1,
      cereales_tuberculos: 1,
      leguminosas: 1,
      proteina_animal_o_alternativas: 1,
      lacteos_o_sustitutos: 1,
      grasas_saludables: 1,
    }

    const dayImpact = dailyGroupImpact(dayMeals)
    for (const item of dayImpact) {
      if (item.targetGrams <= 0) {
        groupRatios[item.group] = 0
        continue
      }

      if (item.adjustedGrams <= 0) {
        groupRatios[item.group] = 1
        continue
      }

      // Keep adjustments bounded to avoid extreme jumps in a single tap.
      const rawRatio = item.targetGrams / item.adjustedGrams
      groupRatios[item.group] = Math.max(0, Math.min(2, Number(rawRatio.toFixed(3))))
    }

    let snapshot: DayAdjustmentSnapshot = {}

    let nextOverridesSnapshot: PortionOverrides = {}

    setPortionOverrides((prev) => {
      const next = { ...prev }

       snapshot = {}
      for (const key of affectedKeys) {
        snapshot[key] = prev[key] ?? null
      }

      for (const meal of dayMeals) {
        for (const [idx, ingredient] of meal.ingredientes.entries()) {
          const group = detectIngredientGroup(ingredient.id, `${ingredient.id} ${ingredient.presentacion || ''}`)
          if (!group) continue

          const ratio = groupRatios[group] ?? 1
          const key = makeIngredientKey(meal.slotId, ingredient.id, idx)
          const current = prev[key] ?? 1
          const adjusted = quantizeMultiplier(current * ratio)

          if (Math.abs(adjusted - 1) < 0.01) {
            delete next[key]
          } else {
            next[key] = adjusted
          }
        }
      }

      nextOverridesSnapshot = next

      return next
    })

    const daySlotIds = dayMeals.map((meal) => meal.slotId)
    setSlotSaveState(daySlotIds, 'saving')
    void Promise.resolve(onSyncWeekState?.({ ingredientMultipliers: nextOverridesSnapshot })).then((saved) => {
      if (saved) {
        showSaveFeedback('Ajustes guardados')
        setSlotSaveState(daySlotIds, 'saved', 1600)
      } else if (onSyncWeekState) {
        showSaveError('No se pudieron guardar los ajustes')
        setSlotSaveState(daySlotIds, 'error', 2400)
      }
    })

    setLastAutoAdjustSnapshotByDay((prev) => ({
      ...prev,
      [day]: snapshot,
    }))

    setAutoAdjustMessage(`Ajuste aplicado para ${day}. Revisa el detalle por grupo y repite si hace falta afinar.`)
    triggerHaptic('success')
  }

  const revertAutoAdjustDay = (day: string) => {
    const snapshot = lastAutoAdjustSnapshotByDay[day]
    if (!snapshot) return

    let nextOverridesSnapshot: PortionOverrides = {}

    setPortionOverrides((prev) => {
      const next = { ...prev }
      for (const [key, value] of Object.entries(snapshot)) {
        if (value === null) {
          delete next[key]
        } else {
          next[key] = value
        }
      }
      nextOverridesSnapshot = next
      return next
    })

    const daySlotIds = meals.filter((meal) => meal.day === day).map((meal) => meal.slotId)
    setSlotSaveState(daySlotIds, 'saving')
    void Promise.resolve(onSyncWeekState?.({ ingredientMultipliers: nextOverridesSnapshot })).then((saved) => {
      if (saved) {
        showSaveFeedback('Ajustes revertidos')
        setSlotSaveState(daySlotIds, 'saved', 1600)
      } else if (onSyncWeekState) {
        showSaveError('No se pudieron revertir los ajustes')
        setSlotSaveState(daySlotIds, 'error', 2400)
      }
    })

    setLastAutoAdjustSnapshotByDay((prev) => {
      const next = { ...prev }
      delete next[day]
      return next
    })

    setAutoAdjustMessage(`Ajuste revertido para ${day}.`)
    triggerHaptic('light')
  }

  if (mode === 'combined') {
    return (
      <div className="px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-1">Vista combinada</p>
          <p className="text-xs text-gray-500">
            {myUserName || 'Tú'} + {otherUserName || 'Usuario compartido'}
          </p>
          <span className={`inline-block mt-2 text-[11px] px-2 py-1 rounded-full ${canEditRelationship ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {canEditRelationship ? 'Permiso: puede editar' : 'Permiso: solo lectura'}
          </span>
        </div>

        {displayedDays.map((day) => {
          const daySlots = combinedSlots.filter((slot) => slot.day === day)
          if (daySlots.length === 0) return null

          return (
            <div key={day} className="mb-10">
              <div className="uppercase text-xs font-semibold tracking-widest text-gray-500 mb-4 pl-1">
                {day}
              </div>
              <div className="space-y-3">
                {daySlots.map((slot) => {
                  const mine = myUserId ? slot.users[myUserId] : undefined
                  const other = otherUserId ? slot.users[otherUserId] : undefined

                  return (
                    <div key={slot.slot} className="bg-white border border-gray-200 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-xl bg-gray-100 text-gray-700">
                          {slot.hour}
                        </span>
                        <span className="inline-block px-3 py-1 text-xs font-medium rounded-xl bg-emerald-50 text-emerald-700">
                          {slot.tipo}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                          <p className="text-[11px] font-semibold text-green-700 mb-1">{myUserName || 'Tú'}</p>
                          <p className="text-sm text-gray-800">{mine?.meal?.nombre || 'Sin comida'}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                          <p className="text-[11px] font-semibold text-blue-700 mb-1">{otherUserName || 'Compartido'}</p>
                          <p className="text-sm text-gray-800">{other?.meal?.nombre || 'Sin comida'}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Progreso de hoy</p>
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
            {completedToday}/{todayMeals.length || 0}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${todayMeals.length ? (completedToday / todayMeals.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          Desliza derecha para completar. Las comidas se generan automáticamente desde tus porciones.
        </p>
        <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-3">
          <p className="text-xs font-semibold text-sky-900 mb-2">Preferencias de sugerencias</p>
          <p className="text-[11px] text-sky-700 mb-2">
            Al generar semana, se aplica automaticamente la alternativa mas compatible.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {['mexicana', 'casero', 'vegetal', 'snack'].map((tag) => {
              const active = (mealSuggestionPreferences.preferredCuisineTags || []).includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleCuisinePreference(tag)}
                  className={`px-2.5 py-1.5 min-h-8 rounded-full text-[11px] font-semibold ${
                    active
                      ? 'bg-sky-600 text-white'
                      : 'bg-white text-sky-800 border border-sky-200 active:bg-sky-100'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMealSuggestionPreferences((prev) => {
                  const nextPreferences = { ...prev, preferQuickMeals: !prev.preferQuickMeals }
                  persistSuggestionPreferences(nextPreferences)
                  return nextPreferences
                })
              }}
              className={`px-2.5 py-2 min-h-9 rounded-lg text-[11px] font-semibold ${
                mealSuggestionPreferences.preferQuickMeals
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-emerald-800 border border-emerald-200 active:bg-emerald-100'
              }`}
            >
              Rapidas (&lt;=20 min)
            </button>
            <button
              type="button"
              onClick={() => {
                setMealSuggestionPreferences((prev) => {
                  const nextPreferences = { ...prev, avoidFish: !prev.avoidFish }
                  persistSuggestionPreferences(nextPreferences)
                  return nextPreferences
                })
              }}
              className={`px-2.5 py-2 min-h-9 rounded-lg text-[11px] font-semibold ${
                mealSuggestionPreferences.avoidFish
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-rose-800 border border-rose-200 active:bg-rose-100'
              }`}
            >
              Evitar pescado
            </button>
          </div>
        </div>
        {
          /**
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setGroupFilter('all')}
              className={`text-xs py-2 min-h-10 rounded-lg font-semibold transition-colors ${groupFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 active:bg-gray-200'}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setGroupFilter('warn_alert')}
              className={`text-xs py-2 min-h-10 rounded-lg font-semibold transition-colors ${groupFilter === 'warn_alert' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800 active:bg-amber-200'}`}
            >
              Amarillo + Rojo
            </button>
            <button
              type="button"
              onClick={() => setGroupFilter('alert')}
              className={`text-xs py-2 min-h-10 rounded-lg font-semibold transition-colors ${groupFilter === 'alert' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800 active:bg-rose-200'}`}
            >
              Solo Rojo
            </button>
          </div> 
          */
        }
        {autoAdjustMessage && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[11px] text-emerald-800">{autoAdjustMessage}</p>
          </div>
        )}
      </div>

      {displayedDays.map((day) => {
        const dayMeals = meals.filter((meal) => meal.day === day)
        const isDayCompleted = dayMeals.length > 0 && dayMeals.every((meal) => meal.completed)
        const dayGroupImpact = dailyGroupImpact(dayMeals)
        const filteredDayGroupImpact = dayGroupImpact.filter((item) => passesGroupFilter(item.status, groupFilter))
        const adjustedPortions = Number(dayGroupImpact.reduce((acc, item) => acc + item.adjustedPortions, 0).toFixed(2))
        const adjustedGrams = dayGroupImpact.reduce((acc, item) => acc + item.adjustedGrams, 0)
        const dayImpactExpanded = expandedImpactDays.has(day)

        return (
          <div key={day} className="mb-10">
            <div className="flex items-center justify-between mb-4 pl-1">
              <div className="uppercase text-xs font-semibold tracking-widest text-gray-500">
                {day}
              </div>
              <button
                onClick={() => void toggleDayCompleted(day)}
                className={`px-4 py-2 min-h-10 rounded-full text-xs font-semibold transition-colors ${
                  isDayCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 active:bg-gray-300'
                }`}
              >
                {isDayCompleted ? '✓ Completo' : 'Completar hoy'}
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-3 mb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-emerald-900 font-semibold">Impacto diario</p>
                  <p className="text-[11px] text-emerald-800">Porciones (objetivo vs actual): {planDailyTotals.portions} vs {adjustedPortions}</p>
                  <p className="text-[11px] text-emerald-800">Gramos (objetivo vs actual): {planDailyTotals.grams}g vs {adjustedGrams}g</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleDayImpact(day)}
                  className="px-2.5 py-1.5 min-h-9 rounded-lg text-[11px] font-semibold bg-emerald-100 text-emerald-800 active:bg-emerald-200"
                >
                  {dayImpactExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                </button>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => autoAdjustDayToPlan(day)}
                  className="w-full px-3 py-2 min-h-9 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white active:bg-emerald-700"
                >
                  Ajustar comidas y medidas al objetivo
                </button>
                <button
                  type="button"
                  onClick={() => revertAutoAdjustDay(day)}
                  disabled={!lastAutoAdjustSnapshotByDay[day]}
                  className="w-full px-3 py-2 min-h-9 rounded-lg text-[11px] font-semibold bg-white text-gray-700 border border-gray-300 active:bg-gray-100 disabled:opacity-50"
                >
                  Revertir ajuste del día
                </button>
              </div>

              {dayImpactExpanded && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredDayGroupImpact.map((item) => (
                    <div key={item.group} className={`text-[10px] rounded-lg px-2 py-1.5 border ${statusClasses(item.status)}`}>
                      <p className="font-semibold">{item.label}</p>
                      <p>Objetivo: {item.targetGrams}g</p>
                      <p>Actual: {item.adjustedGrams}g</p>
                      <p className="font-semibold">{item.statusLabel}</p>
                    </div>
                  ))}
                  {filteredDayGroupImpact.length === 0 && (
                    <p className="text-[11px] text-gray-600 col-span-full">No hay grupos para el filtro seleccionado en este día.</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {dayMeals.map((comida) => {
                const cardId = comida.slotId
                return (
                  <MealCard
                    key={cardId}
                    comida={comida}
                    slotId={comida.slotId}
                    groupBreakdown={mealGroupBreakdown(comida).filter((item) => passesGroupFilter(item.status, groupFilter))}
                    hour={comida.hour}
                    swipeTrigger={SWIPE_TRIGGER}
                    isExpanded={expandedCards.has(cardId)}
                    onToggle={() => toggleCard(cardId)}
                    isCompleted={comida.completed}
                    mealPortionFactor={mealPortionFactor(comida.tipo)}
                    getIngredientMultiplier={getIngredientMultiplier}
                    onSetIngredientMultiplier={setIngredientMultiplier}
                    isIngredientReplacing={isIngredientReplacing}
                    getIngredientOptions={(ingredientId, ingredientText) => ingredientOptionsFor(ingredientId, ingredientText)}
                    onReplaceIngredient={(index, currentId, ingredientText, nextId) =>
                      setIngredientReplacement(comida.slotId, index, currentId, ingredientText, nextId)
                    }
                    onToggleCompleted={() => void toggleMealCompleted(cardId, comida.completed)}
                    onSwapMeal={() => void swapMeal(comida.slotId, comida.tipo, comida.id)}
                    onQuickComplete={() => void toggleMealCompleted(cardId, comida.completed)}
                    onQuickSwap={() => void swapMeal(comida.slotId, comida.tipo, comida.id)}
                    suggestedMeals={suggestedMealsBySlot[cardId] || []}
                    profileFoodRules={{
                      allergies: summary?.nutritionProfile?.allergies,
                      intolerances: summary?.nutritionProfile?.intolerances,
                      foodPreferences: summary?.nutritionProfile?.food_preferences,
                    }}
                    suggestionsLoading={Boolean(loadingSlotSuggestions[cardId])}
                    onOpenSuggestedMeals={() => loadSlotAlternatives(cardId, comida.id)}
                    hasSuggestedMealOverride={Boolean(savedMealOverrides[cardId])}
                    saveState={slotSaveStates[cardId]}
                    onApplySuggestedMeal={(meal) => setSavedMealOverride(cardId, meal)}
                    onClearSuggestedMeal={() => clearSavedMealOverride(cardId)}
                    swapEnabled={false}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {lastAction && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-40">
          <div className="max-w-107.5 mx-auto bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg">
            <span className="text-sm">Cambio aplicado</span>
            <button
              onClick={() => void undoLastMealToggle()}
              className="text-sm font-semibold text-emerald-300"
            >
              Deshacer
            </button>
          </div>
        </div>
      )}

      {saveFeedback && !lastAction && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-107.5 mx-auto bg-emerald-600 text-white rounded-2xl px-4 py-3 flex items-center justify-center shadow-lg">
            <span className="text-sm font-semibold">{saveFeedback}</span>
          </div>
        </div>
      )}

      {saveError && !lastAction && !saveFeedback && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-107.5 mx-auto bg-rose-600 text-white rounded-2xl px-4 py-3 flex items-center justify-center shadow-lg">
            <span className="text-sm font-semibold">{saveError}</span>
          </div>
        </div>
      )}
    </div>
  )
}
