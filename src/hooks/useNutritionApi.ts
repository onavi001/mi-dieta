import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getApiBaseUrl } from '../utils/apiBaseUrl'
import { logApiRequestFailed } from '../utils/clientLog'
import { startApiRequest } from './apiActivity'
import { writeStoredSession } from './dietApi/model'
import { refreshStoredSession } from './dietApi/refreshStoredSession'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
const UNAUTHORIZED_EVENT = 'mi-dieta:unauthorized'

function getNutritionRequestLabel(path: string, method: HttpMethod): string {
  if (path.includes('/api/nutrition/summary')) return 'Cargando resumen nutricional...'
  if (path.includes('/api/nutrition/profile')) return 'Guardando perfil nutricional...'
  if (path.includes('/api/nutrition/plans') && method === 'POST') return 'Guardando plan nutricional...'
  if (path.includes('/api/nutrition/plans')) return 'Cargando planes nutricionales...'
  if (path.includes('/api/nutrition/progress')) return 'Guardando progreso nutricional...'
  if (path.includes('/api/nutrition/calculate-plan')) return 'Calculando plan nutricional...'
  return method === 'GET' ? 'Cargando datos de nutricion...' : 'Guardando datos de nutricion...'
}

interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

export interface NutritionProfileInput {
  objectiveGoal?:
    | 'weight_loss'
    | 'rapid_weight_loss'
    | 'weight_maintenance'
    | 'muscle_gain'
    | 'weight_gain'
    | 'endurance_improvement'
    | 'healthy_diet'
  age?: number
  biologicalSex?: 'female' | 'male' | 'intersex' | 'prefer_not_to_say'
  heightCm?: number
  currentWeightKg?: number
  targetWeightKg?: number
  targetDate?: string
  avgDailySteps?: number
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
  sleepHours?: number
  diagnoses?: string[]
  allergies?: string[]
  intolerances?: string[]
  foodPreferences?: string[]
  foodDislikes?: string[]
  mealsPerDay?: number
  portionSystem?: 'grams' | 'exchanges'
  notes?: string
}

export interface NutritionPlanVersionInput {
  startDate: string
  calorieTargetKcal?: number
  proteinG?: number
  fatG?: number
  carbsG?: number
  hydrationMl?: number
  portionsByGroup: Record<string, number>
  distributionByMeal?: Record<string, number>
  adjustmentReason?: string
  coachNotes?: string
}

export interface NutritionProgressInput {
  logDate: string
  weightKg?: number
  waistCm?: number
  adherencePercent?: number
  hungerScore?: number
  energyScore?: number
  sleepHours?: number
  steps?: number
  trainingDone?: boolean
  digestiveNotes?: string
  stressScore?: number
  weeklyNotes?: string
}

export interface NutritionProfile {
  user_id: string
  objective_goal:
    | 'weight_loss'
    | 'rapid_weight_loss'
    | 'weight_maintenance'
    | 'muscle_gain'
    | 'weight_gain'
    | 'endurance_improvement'
    | 'healthy_diet'
    | null
  age: number | null
  biological_sex: string | null
  height_cm: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
  target_date: string | null
  avg_daily_steps: number | null
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | null
  sleep_hours: number | null
  meals_per_day: number | null
  portion_system: string | null
  food_preferences: string[]
  allergies: string[]
  intolerances: string[]
  notes: string | null
  updated_at: string
}

export interface NutritionPlanVersion {
  id: string
  user_id: string
  version_number: number
  is_active: boolean
  start_date: string
  end_date: string | null
  calorie_target_kcal: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  hydration_ml: number | null
  portions_by_group: Record<string, number>
  distribution_by_meal: Record<string, number> | null
  adjustment_reason: string | null
  coach_notes: string | null
  created_at: string
}

export interface NutritionProgressLog {
  id: string
  user_id: string
  log_date: string
  weight_kg: number | null
  waist_cm: number | null
  adherence_percent: number | null
  hunger_score: number | null
  energy_score: number | null
  sleep_hours: number | null
  steps: number | null
  training_done: boolean | null
  digestive_notes: string | null
  stress_score: number | null
  weekly_notes: string | null
  created_at: string
}

export interface NutritionCalculatedMeal {
  nombre: string
  calories: number
  percent: number
  foodGroups: Record<string, number>
}

export interface NutritionCalculatedPlan {
  bmr: number
  tdee: number
  targetCalories: number
  activityLevel: string
  goal: string
  mealCount: number
  dailyMacros: {
    protein: number
    carbs: number
    fat: number
  }
  meals: NutritionCalculatedMeal[]
}

export interface NutritionSummaryResponse {
  nutritionProfile: NutritionProfile | null
  activePlanVersion: NutritionPlanVersion | null
  recentProgress: NutritionProgressLog[]
}

export function useNutritionApi(accessToken?: string) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<NutritionSummaryResponse | null>(null)
  const [planVersions, setPlanVersions] = useState<NutritionPlanVersion[]>([])
  const [progressLogs, setProgressLogs] = useState<NutritionProgressLog[]>([])
  const hasHandledUnauthorizedRef = useRef(false)

  const baseUrl = useMemo(() => getApiBaseUrl(), [])

  useEffect(() => {
    hasHandledUnauthorizedRef.current = false
  }, [accessToken])

  const request = useCallback(async <T,>(path: string, method: HttpMethod, body?: unknown): Promise<T> => {
    if (!accessToken) throw new Error('No authenticated session')

    const endRequest = startApiRequest(getNutritionRequestLabel(path, method))

    try {
      const runFetch = (token: string) =>
        fetch(`${baseUrl}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        })

      let response = await runFetch(accessToken)

      if (response.status === 401) {
        const next = await refreshStoredSession(baseUrl)
        if (next) {
          hasHandledUnauthorizedRef.current = false
          response = await runFetch(next.accessToken)
        }
      }

      if (response.status === 401) {
        if (!hasHandledUnauthorizedRef.current) {
          hasHandledUnauthorizedRef.current = true
          writeStoredSession(null)
          window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
        }

        throw new Error('Sesion expirada. Inicia sesion nuevamente.')
      }

      const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

      if (!response.ok || !payload?.ok || payload.data === undefined) {
        throw new Error(payload?.error || 'Nutrition request failed')
      }

      return payload.data
    } catch (err) {
      logApiRequestFailed(path, method, err)
      throw err
    } finally {
      endRequest()
    }
  }, [accessToken, baseUrl])

  const withLoading = useCallback(async <T,>(
    action: () => Promise<T>,
    fallbackMessage: string
  ): Promise<T | null> => {
    setLoading(true)
    setError('')

    try {
      return await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const withSaving = useCallback(async <T,>(
    action: () => Promise<T>,
    fallbackMessage: string
  ): Promise<T | null> => {
    setSaving(true)
    setError('')

    try {
      return await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackMessage)
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  const loadSummary = useCallback(async () => {
    if (!accessToken) return

    return await withLoading(async () => {
      const data = await request<NutritionSummaryResponse>('/api/nutrition/summary', 'GET')
      setSummary(data)
      setProgressLogs(data.recentProgress || [])
      return data
    }, 'Error loading nutrition summary')
  }, [accessToken, request, withLoading])

  const loadPlanVersions = useCallback(async () => {
    if (!accessToken) return

    await withLoading(async () => {
      const data = await request<{ planVersions: NutritionPlanVersion[] }>('/api/nutrition/plans', 'GET')
      setPlanVersions(data.planVersions || [])
      return data
    }, 'Error loading nutrition plans')
  }, [accessToken, request, withLoading])

  const loadProgressLogs = useCallback(async (limit = 30) => {
    if (!accessToken) return

    await withLoading(async () => {
      const data = await request<{ progressLogs: NutritionProgressLog[] }>(`/api/nutrition/progress?limit=${limit}`, 'GET')
      setProgressLogs(data.progressLogs || [])
      return data
    }, 'Error loading nutrition progress')
  }, [accessToken, request, withLoading])

  const saveProfile = useCallback(async (payload: NutritionProfileInput) => {
    if (!accessToken) return null

    return withSaving(async () => {
      const data = await request<{ nutritionProfile: NutritionProfile }>('/api/nutrition/profile', 'PUT', payload)
      setSummary((prev) => ({
        nutritionProfile: data.nutritionProfile,
        activePlanVersion: prev?.activePlanVersion || null,
        recentProgress: prev?.recentProgress || [],
      }))

      return data.nutritionProfile
    }, 'Error saving nutrition profile')
  }, [accessToken, request, withSaving])

  const createPlanVersion = useCallback(async (payload: NutritionPlanVersionInput) => {
    if (!accessToken) return null

    return withSaving(async () => {
      const data = await request<{ planVersion: NutritionPlanVersion }>('/api/nutrition/plans', 'POST', payload)
      await Promise.all([loadSummary(), loadPlanVersions()])
      return data.planVersion
    }, 'Error creating nutrition plan version')
  }, [accessToken, loadPlanVersions, loadSummary, request, withSaving])

  const saveProgressLog = useCallback(async (payload: NutritionProgressInput) => {
    if (!accessToken) return null

    return withSaving(async () => {
      const data = await request<{ progressLog: NutritionProgressLog }>('/api/nutrition/progress', 'PUT', payload)
      await Promise.all([loadSummary(), loadProgressLogs(30)])
      return data.progressLog
    }, 'Error saving nutrition progress')
  }, [accessToken, loadProgressLogs, loadSummary, request, withSaving])

  const calculatePlan = useCallback(async (payload: {
    weight: number
    height: number
    age: number
    gender: 'male' | 'female'
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active'
    goal: 'lose' | 'loseFast' | 'maintain' | 'muscle' | 'gain' | 'endurance' | 'healthy'
    mealCount: 3 | 4 | 5
  }) => {
    if (!accessToken) return null

    return withSaving(async () => {
      const data = await request<{ plan: NutritionCalculatedPlan }>('/api/nutrition/calculate-plan', 'POST', payload)
      return data.plan
    }, 'Error calculating nutrition plan')
  }, [accessToken, request, withSaving])

  return {
    loading,
    saving,
    error,
    summary,
    planVersions,
    progressLogs,
    loadSummary,
    loadPlanVersions,
    loadProgressLogs,
    saveProfile,
    createPlanVersion,
    saveProgressLog,
    calculatePlan,
  }
}
