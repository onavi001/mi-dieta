import type { Comida, TipoComida } from '../../data/types'

const SESSION_KEY = 'miDietaApiSession'

export type RawMeal = {
  id: string
  tipo: TipoComida
  nombre: string
  receta?: string | null
  tip?: string | null
  tags?: string[] | null
  forbidden_ingredients?: string[] | null
  forbiddenIngredients?: string[] | null
  ingredientes?: unknown
  groupPortions?: unknown
  realDishMetadata?: unknown
}

type RawIngredient = {
  id?: unknown
  presentacion?: unknown
  cantidad?: unknown
  unidad?: unknown
}

type RawSlot = {
  slot?: unknown
  day?: unknown
  tipo?: unknown
  hour?: unknown
  mealId?: unknown
  meal?: RawMeal | null
  suggestedMeals?: unknown
  completed?: unknown
}

export type RawPlan = {
  id?: unknown
  userId?: unknown
  week?: unknown
  groceryState?: unknown
  weekState?: unknown
  slots?: unknown
}

export interface WeekState {
  mealOverrides: Record<string, Comida>
  ingredientMultipliers: Record<string, number>
  groceryAdjustments: Array<{ productName: string; customQty: string; customNote?: string }>
  suggestionPreferences: {
    preferredCuisineTags: string[]
    preferQuickMeals: boolean
    avoidFish: boolean
    preferMeasuredMeals: boolean
    autoApplyToGeneratedWeek: boolean
  }
}

export type WeekStatePatch = Partial<WeekState> & { week?: string }

export type RawCombinedSlot = {
  slot?: unknown
  day?: unknown
  tipo?: unknown
  hour?: unknown
  users?: Record<string, { mealId?: unknown; meal?: RawMeal | null; completed?: unknown }>
}

export interface ApiSession {
  accessToken: string
  user: {
    id: string
    email?: string
  }
}

export type AuthPayload = {
  user: {
    id: string
    email?: string
  }
  session: {
    access_token: string
  } | null
}

export interface DietSlot {
  slot: string
  day: string
  tipo: TipoComida
  hour: string
  mealId: string | null
  meal: Comida | null
  suggestedMeals?: Comida[]
  completed: boolean
}

export interface SlotMealAlternativesPayload {
  slotId: string
  currentMealId: string | null
  suggestedMeals: Comida[]
}

export interface WeekPlan {
  id: string
  userId: string
  week: string
  groceryState: {
    checked: string[]
    onlyPending: boolean
  }
  weekState: WeekState
  slots: DietSlot[]
}

export interface CombinedSlot {
  slot: string
  day: string
  tipo: TipoComida
  hour: string
  users: Record<string, { mealId: string | null; meal: Comida | null; completed: boolean }>
}

export interface ShareUser {
  profile: {
    id: string
    name: string
    role: string
  }
  relation: {
    ownerUserId: string
    sharedWithUserId: string
    canEdit: boolean
  } | null
}

export interface ShareCandidate {
  id: string
  email: string
  name: string
  role: string
}

export interface ShareInvite {
  id: string
  ownerUserId: string
  targetUserId: string
  canEdit: boolean
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export interface AuthProfile {
  id: string
  name: string
  role: string
}

export interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

export function normalizeMeal(raw: RawMeal | null | undefined): Comida | null {
  if (!raw) return null

  const normalizedGroupPortions =
    raw.groupPortions && typeof raw.groupPortions === 'object' && !Array.isArray(raw.groupPortions)
      ? Object.fromEntries(
        Object.entries(raw.groupPortions as Record<string, unknown>).filter(
          ([, value]) => typeof value === 'number' && Number.isFinite(value)
        )
      )
      : undefined

  const normalizedDishMetadata =
    raw.realDishMetadata && typeof raw.realDishMetadata === 'object' && !Array.isArray(raw.realDishMetadata)
      ? raw.realDishMetadata
      : undefined

  const normalizedIngredients = Array.isArray(raw.ingredientes)
    ? raw.ingredientes.map((item) => {
      const ingredient = item as RawIngredient
      return {
        id: String(ingredient.id || ''),
        presentacion: String(ingredient.presentacion || ''),
        cantidad: typeof ingredient.cantidad === 'number' ? ingredient.cantidad : 0,
        unidad: String(ingredient.unidad || ''),
      }
    })
    : []

  return {
    id: raw.id,
    tipo: raw.tipo,
    nombre: raw.nombre,
    receta: raw.receta || '',
    tip: raw.tip || '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    forbiddenIngredients: Array.isArray(raw.forbiddenIngredients)
      ? raw.forbiddenIngredients
      : Array.isArray(raw.forbidden_ingredients)
        ? raw.forbidden_ingredients
        : [],
    ingredientes: normalizedIngredients,
    groupPortions: normalizedGroupPortions,
    realDishMetadata: normalizedDishMetadata,
  }
}

function normalizeGroceryState(value: unknown): { checked: string[]; onlyPending: boolean } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { checked: [], onlyPending: false }
  }

  const record = value as { checked?: unknown; onlyPending?: unknown }

  return {
    checked: Array.isArray(record.checked)
      ? record.checked.filter((item): item is string => typeof item === 'string')
      : [],
    onlyPending: typeof record.onlyPending === 'boolean' ? record.onlyPending : false,
  }
}

function normalizeWeekState(value: unknown): WeekState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      mealOverrides: {},
      ingredientMultipliers: {},
      groceryAdjustments: [],
      suggestionPreferences: {
        preferredCuisineTags: [],
        preferQuickMeals: false,
        avoidFish: false,
        preferMeasuredMeals: true,
        autoApplyToGeneratedWeek: true,
      },
    }
  }

  const record = value as Record<string, unknown>

  const mealOverrides: Record<string, Comida> = {}
  if (record.mealOverrides && typeof record.mealOverrides === 'object' && !Array.isArray(record.mealOverrides)) {
    for (const [slotId, rawMeal] of Object.entries(record.mealOverrides as Record<string, unknown>)) {
      const meal = normalizeMeal(rawMeal as RawMeal | null)
      if (meal) mealOverrides[slotId] = meal
    }
  }

  const ingredientMultipliers: Record<string, number> = {}
  if (record.ingredientMultipliers && typeof record.ingredientMultipliers === 'object' && !Array.isArray(record.ingredientMultipliers)) {
    for (const [key, val] of Object.entries(record.ingredientMultipliers as Record<string, unknown>)) {
      if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
        ingredientMultipliers[key] = val
      }
    }
  }

  const groceryAdjustments: WeekState['groceryAdjustments'] = []
  if (Array.isArray(record.groceryAdjustments)) {
    for (const item of record.groceryAdjustments) {
      if (
        item &&
        typeof item === 'object' &&
        'productName' in item &&
        'customQty' in item &&
        typeof (item as Record<string, unknown>).productName === 'string' &&
        typeof (item as Record<string, unknown>).customQty === 'string'
      ) {
        groceryAdjustments.push({
          productName: (item as Record<string, string>).productName,
          customQty: (item as Record<string, string>).customQty,
          customNote: typeof (item as Record<string, unknown>).customNote === 'string'
            ? (item as Record<string, string>).customNote
            : undefined,
        })
      }
    }
  }

  const suggestionPreferencesRecord =
    record.suggestionPreferences && typeof record.suggestionPreferences === 'object' && !Array.isArray(record.suggestionPreferences)
      ? record.suggestionPreferences as Record<string, unknown>
      : {}

  const suggestionPreferences: WeekState['suggestionPreferences'] = {
    preferredCuisineTags: Array.isArray(suggestionPreferencesRecord.preferredCuisineTags)
      ? suggestionPreferencesRecord.preferredCuisineTags.filter((item): item is string => typeof item === 'string')
      : [],
    preferQuickMeals: Boolean(suggestionPreferencesRecord.preferQuickMeals),
    avoidFish: Boolean(suggestionPreferencesRecord.avoidFish),
    preferMeasuredMeals:
      typeof suggestionPreferencesRecord.preferMeasuredMeals === 'boolean'
        ? suggestionPreferencesRecord.preferMeasuredMeals
        : typeof suggestionPreferencesRecord.preferCurated === 'boolean'
          ? suggestionPreferencesRecord.preferCurated
          : true,
    autoApplyToGeneratedWeek:
      typeof suggestionPreferencesRecord.autoApplyToGeneratedWeek === 'boolean'
        ? suggestionPreferencesRecord.autoApplyToGeneratedWeek
        : true,
  }

  return { mealOverrides, ingredientMultipliers, groceryAdjustments, suggestionPreferences }
}

export function normalizePlan(raw: RawPlan | null | undefined): WeekPlan | null {
  if (!raw) return null

  const slots = Array.isArray(raw.slots) ? raw.slots as RawSlot[] : []

  return {
    id: String(raw.id),
    userId: String(raw.userId),
    week: String(raw.week),
    groceryState: normalizeGroceryState(raw.groceryState),
    weekState: normalizeWeekState(raw.weekState),
    slots: slots.map((slot) => ({
      slot: String(slot.slot),
      day: String(slot.day),
      tipo: slot.tipo as TipoComida,
      hour: String(slot.hour),
      mealId: slot.mealId ? String(slot.mealId) : null,
      meal: normalizeMeal(slot.meal as RawMeal | null),
      suggestedMeals: Array.isArray(slot.suggestedMeals)
        ? slot.suggestedMeals
          .map((item) => normalizeMeal(item as RawMeal | null))
          .filter((item): item is Comida => Boolean(item))
        : undefined,
      completed: Boolean(slot.completed),
    })),
  }
}

export function readStoredSession(): ApiSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as ApiSession
    if (!parsed.accessToken || !parsed.user?.id) return null

    return parsed
  } catch {
    return null
  }
}

export function writeStoredSession(session: ApiSession | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}