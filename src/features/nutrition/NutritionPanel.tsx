import { useEffect, useMemo, useState } from 'react'
import {
  useNutritionApi,
  type NutritionPlanVersionInput,
  type NutritionProfileInput,
  type NutritionProgressInput,
} from '@/hooks/useNutritionApi'
import {
  DEFAULT_MEAL_DISTRIBUTION,
  distributeGroupPortionsByMeal,
  mealDistributionKeys,
  mealDistributionWeightsMap,
  profileGoalToNutritionGoal,
  type DistributionKey,
  type NutritionGoal,
  type PlanGroupKey,
} from '@/services/nutrition/professionalNutritionRules'
import {
  ALLERGY_OPTIONS,
  INTOLERANCE_OPTIONS,
  PREFERENCE_OPTIONS,
} from '@/services/profile-food/profileFoodRules'
import { CollapsibleCard } from './components/CollapsibleCard'
import { InputField, SelectField, TextareaField } from './components/formFields'
import { LoadingSpinner } from './components/LoadingSpinner'
import { StepIndicator } from './components/StepIndicator'
import type {
  ActivityLevel,
  CalculatorActivityLevel,
  CalculatorGoal,
  ObjectiveGoal,
} from './nutritionPanelConstants'
import {
  ACTIVITY_LEVEL_OPTIONS,
  GOAL_CALORIE_ADJUSTMENTS,
  GOAL_MACRO_RATIOS,
  MIN_CALORIES_BY_SEX,
  OBJECTIVE_OPTIONS,
} from './nutritionPanelConstants'

type Props = {
  accessToken?: string
  onPlanSaved?: () => boolean | Promise<boolean>
}

type FormMode = 'basico' | 'avanzado'
type MealDistributionForm = Record<DistributionKey, string>
type StepName = 'profile' | 'plan' | 'portions' | 'progress'
type CollapsibleState = Record<StepName, boolean>

function toNumberOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function MultiSelectChips({
  label,
  options,
  selected,
  onChange,
  activeClass = 'bg-emerald-600 text-white border-transparent',
  helper,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
  activeClass?: string
  helper?: string
}) {
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }
  return (
    <div className="col-span-2">
      <p className="text-xs font-medium text-gray-700 mb-1">{label}</p>
      {helper && <p className="text-[10px] text-gray-500 mb-1.5">{helper}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              selected.includes(opt.value)
                ? activeClass
                : 'bg-white text-gray-600 border-gray-300 active:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const GROUP_ALIASES: Record<string, string> = {
  vegetables: 'vegetables',
  verduras: 'vegetables',
  fruits: 'fruits',
  frutas: 'fruits',
  cereals: 'cereals',
  'cereales tuberculos': 'cereals',
  'cereales y tuberculos': 'cereals',
  cerealesytuberculos: 'cereals',
  legumes: 'legumes',
  leguminosas: 'legumes',
  proteina: 'animalProtein',
  proteinas: 'animalProtein',
  animalprotein: 'animalProtein',
  'proteina animal': 'animalProtein',
  'proteina animal o alternativas': 'animalProtein',
  dairy: 'dairy',
  lacteos: 'dairy',
  'lacteos o sustitutos': 'dairy',
  healthyfats: 'healthyFats',
  'grasas saludables': 'healthyFats',
}

const GRAMS_PER_PORTION: Record<string, number> = {
  vegetables: 75,
  fruits: 120,
  cereals: 25,
  legumes: 35,
  animalProtein: 30,
  dairy: 240,
  healthyFats: 5,
}

const GROUP_DISPLAY_META: Record<string, { label: string }> = {
  vegetables: { label: 'Verduras' },
  fruits: { label: 'Frutas' },
  cereals: { label: 'Cereales y tubérculos' },
  legumes: { label: 'Leguminosas' },
  animalProtein: { label: 'Proteína' },
  dairy: { label: 'Lácteos' },
  healthyFats: { label: 'Grasas saludables' },
}

function normalizeGroupText(group: string): string {
  return group
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toCanonicalGroupKey(group: string): string {
  const normalized = normalizeGroupText(group)
  return GROUP_ALIASES[normalized] ?? GROUP_ALIASES[normalized.replaceAll(' ', '')] ?? group
}

function portionsToHuman(group: string, value: number): { grams: string; casera: string } {
  const canonicalGroup = toCanonicalGroupKey(group)
  const g = GRAMS_PER_PORTION[canonicalGroup]
  const grams = g ? `${Math.round(value * g)} g` : `${roundToOne(value)} porciones`

  const casera: Record<string, string> = {
    vegetables: `${roundToOne(value * 0.5)} taza${value * 0.5 !== 1 ? 's' : ''} cocida`,
    fruits: `${value} pieza${value !== 1 ? 's' : ''} mediana`,
    cereals: `${roundToOne(value / 3)} taza avena o ${value} rebanada${value !== 1 ? 's' : ''} pan`,
    legumes: `${roundToOne(value * 0.5)} taza${value * 0.5 !== 1 ? 's' : ''} cocida`,
    animalProtein: value <= 1.5 ? '1–2 oz  ·  ~1 huevo o 60 g pollo' : `${Math.round(value * 30)} g pollo / res / pescado`,
    dairy: `${Math.round(value * 240)} ml leche  o  ${value} taza${value !== 1 ? 's' : ''} yogur`,
    healthyFats: `${Math.round(value)} cdta aceite  o  ${roundToOne(value * 0.25)} aguacate`,
  }

  return { grams, casera: casera[canonicalGroup] ?? 'Equivalencia casera no definida para este grupo.' }
}

function estimatePlanFromProfile(input: {
  sex: string
  activityLevel: ActivityLevel
  objectiveGoal: ObjectiveGoal
  age?: number
  heightCm?: number
  currentWeightKg?: number
  targetWeightKg?: number
}) {
  const age = input.age || 30
  const height = input.heightCm || 170
  const weight = input.currentWeightKg || 70
  void input.targetWeightKg

  const sexFactor = input.sex === 'female' ? -161 : 5
  const normalizedSex = input.sex === 'female' ? 'female' : 'male'
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexFactor
  const activityFactor = ACTIVITY_LEVEL_OPTIONS.find((item) => item.value === input.activityLevel)?.factor || 1.2
  const tdee = bmr * activityFactor
  const adjustment = GOAL_CALORIE_ADJUSTMENTS[input.objectiveGoal] ?? 0
  const kcal = Math.round(Math.max(MIN_CALORIES_BY_SEX[normalizedSex], tdee + adjustment))

  const ratios = GOAL_MACRO_RATIOS[input.objectiveGoal] || GOAL_MACRO_RATIOS.healthy_diet
  const proteinG = Math.round((kcal * ratios.protein) / 4)
  const carbsG = Math.round((kcal * ratios.carbs) / 4)
  const fatG = Math.round((kcal * ratios.fat) / 9)
  const hydrationMl = Math.round(weight * 35)

  const vegetables = kcal < 1900 ? 4 : kcal < 2500 ? 5 : 6
  const fruits = kcal < 1900 ? 2 : 3
  const cereals = kcal < 1900 ? 4 : kcal < 2500 ? 6 : 8
  const legumes = kcal < 2300 ? 1 : 2
  const animalProtein = Math.max(3, Math.round(proteinG / 25))
  const dairy = kcal < 2300 ? 1 : 2
  const healthyFats = Math.max(3, Math.round(fatG / 10))

  return {
    kcal,
    proteinG,
    fatG,
    carbsG,
    hydrationMl,
    portions: {
      vegetables,
      fruits,
      cereals,
      legumes,
      animalProtein,
      dairy,
      healthyFats,
    },
  }
}

function kcalFromCalculatedPlan(calculatedPlan: { meals?: Array<{ foodGroups?: Record<string, number> }> } | null) {
  const kcalByCanonical: Record<string, number> = {
    vegetables: 0,
    fruits: 0,
    cereals: 0,
    legumes: 0,
    animalProtein: 0,
    dairy: 0,
    healthyFats: 0,
  }

  if (!calculatedPlan?.meals || calculatedPlan.meals.length === 0) return kcalByCanonical

  for (const meal of calculatedPlan.meals) {
    const groups = meal.foodGroups || {}
    for (const [rawGroup, rawValue] of Object.entries(groups)) {
      if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue < 0) continue
      const canonical = toCanonicalGroupKey(rawGroup)
      if (canonical in kcalByCanonical) kcalByCanonical[canonical] += rawValue
    }
  }

  return kcalByCanonical
}

function objectiveGoalToCalculatorGoal(goal: ObjectiveGoal): CalculatorGoal {
  const map: Record<ObjectiveGoal, CalculatorGoal> = {
    weight_loss: 'lose',
    rapid_weight_loss: 'loseFast',
    weight_maintenance: 'maintain',
    muscle_gain: 'muscle',
    weight_gain: 'gain',
    endurance_improvement: 'endurance',
    healthy_diet: 'healthy',
  }

  return map[goal]
}

function activityLevelToCalculatorActivity(level: ActivityLevel): CalculatorActivityLevel {
  const map: Record<ActivityLevel, CalculatorActivityLevel> = {
    sedentary: 'sedentary',
    lightly_active: 'light',
    moderately_active: 'moderate',
    very_active: 'active',
  }

  return map[level]
}

function mealNameToDistributionKey(mealName: string): DistributionKey | null {
  if (mealName === 'Desayuno') return 'breakfast'
  if (mealName === 'Snack Mañana') return 'snackAm'
  if (mealName === 'Comida') return 'lunch'
  if (mealName === 'Snack Tarde') return 'snackPm'
  if (mealName === 'Cena') return 'dinner'
  return null
}

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10
}

function buildMealMoments(mealsPerDay: number): string[] {
  if (mealsPerDay <= 3) return ['Desayuno', 'Comida', 'Cena']
  if (mealsPerDay === 4) return ['Desayuno', 'Comida', 'Colacion', 'Cena']
  return ['Desayuno', 'Colacion AM', 'Comida', 'Colacion PM', 'Cena']
}

function buildMealExamples(mealName: string): string {
  if (mealName === 'Desayuno') return 'Ejemplo: omelette con verduras + fruta + avena.'
  if (mealName === 'Colacion' || mealName === 'Colacion AM' || mealName === 'Colacion PM') {
    return 'Ejemplo: yogur natural + fruta o sandwich pequeno de pavo.'
  }
  if (mealName === 'Comida') return 'Ejemplo: plato fuerte con proteina magra, cereal y ensalada grande.'
  return 'Ejemplo: pescado/pollo con verduras y grasa saludable.'
}

const DISTRIBUTION_LABELS: Record<DistributionKey, string> = {
  breakfast: 'Desayuno',
  snackAm: 'Colación AM',
  lunch: 'Comida',
  snackPm: 'Colación PM',
  dinner: 'Cena',
}

const DEFAULT_MEAL_DISTRIBUTION_FORM: MealDistributionForm = {
  breakfast: '25',
  snackAm: '10',
  lunch: '30',
  snackPm: '10',
  dinner: '25',
}

function distributionFormFromPlan(raw?: Record<string, number> | null): MealDistributionForm {
  if (!raw || typeof raw !== 'object') return DEFAULT_MEAL_DISTRIBUTION_FORM

  const read = (key: DistributionKey): string => {
    const value = raw[key]
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return String(value)
    return DEFAULT_MEAL_DISTRIBUTION_FORM[key]
  }

  return {
    breakfast: read('breakfast'),
    snackAm: read('snackAm'),
    lunch: read('lunch'),
    snackPm: read('snackPm'),
    dinner: read('dinner'),
  }
}

function buildProfessionalDietByMeal(
  totalPortions: Record<PlanGroupKey, number>,
  mealsPerDay: number,
  customDistribution?: Partial<Record<DistributionKey, number | undefined>>,
  goal: NutritionGoal = 'healthy'
): Array<{ meal: string; portions: Record<string, number>; example: string }> {
  const meals = buildMealMoments(Math.max(3, Math.min(mealsPerDay || 5, 5)))
  const keys = mealDistributionKeys(meals.length)
  const weightsByKey = mealDistributionWeightsMap(meals.length, customDistribution)

  const portionsByGroupAndMeal: Record<PlanGroupKey, Record<DistributionKey, number>> = {
    verduras: distributeGroupPortionsByMeal('verduras', totalPortions.verduras || 0, keys, weightsByKey, { goal }),
    frutas: distributeGroupPortionsByMeal('frutas', totalPortions.frutas || 0, keys, weightsByKey, { goal }),
    cereales_tuberculos: distributeGroupPortionsByMeal('cereales_tuberculos', totalPortions.cereales_tuberculos || 0, keys, weightsByKey, { goal }),
    leguminosas: distributeGroupPortionsByMeal('leguminosas', totalPortions.leguminosas || 0, keys, weightsByKey, { goal }),
    proteina_animal_o_alternativas: distributeGroupPortionsByMeal('proteina_animal_o_alternativas', totalPortions.proteina_animal_o_alternativas || 0, keys, weightsByKey, { goal }),
    lacteos_o_sustitutos: distributeGroupPortionsByMeal('lacteos_o_sustitutos', totalPortions.lacteos_o_sustitutos || 0, keys, weightsByKey, { goal }),
    grasas_saludables: distributeGroupPortionsByMeal('grasas_saludables', totalPortions.grasas_saludables || 0, keys, weightsByKey, { goal }),
  }

  return meals.map((meal, index) => {
    const key = keys[index]
    const portions: Record<string, number> = {
      verduras: roundToOne(portionsByGroupAndMeal.verduras[key] || 0),
      frutas: roundToOne(portionsByGroupAndMeal.frutas[key] || 0),
      cereales_tuberculos: roundToOne(portionsByGroupAndMeal.cereales_tuberculos[key] || 0),
      leguminosas: roundToOne(portionsByGroupAndMeal.leguminosas[key] || 0),
      proteina_animal_o_alternativas: roundToOne(portionsByGroupAndMeal.proteina_animal_o_alternativas[key] || 0),
      lacteos_o_sustitutos: roundToOne(portionsByGroupAndMeal.lacteos_o_sustitutos[key] || 0),
      grasas_saludables: roundToOne(portionsByGroupAndMeal.grasas_saludables[key] || 0),
    }

    return {
      meal,
      portions,
      example: buildMealExamples(meal),
    }
  })
}

export function NutritionPanel({ accessToken, onPlanSaved }: Props) {
  const {
    loading,
    saving,
    error,
    summary,
    progressLogs,
    loadSummary,
    loadProgressLogs,
    saveProfile,
    createPlanVersion,
    saveProgressLog,
    calculatePlan,
  } = useNutritionApi(accessToken)

  const [message, setMessage] = useState('')
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('basico')

  const [collapsed, setCollapsed] = useState<CollapsibleState>({
    profile: false,
    plan: true,
    portions: true,
    progress: true,
  })

  const openOnlyStep = (step: StepName) => {
    setCollapsed({
      profile: step !== 'profile',
      plan: step !== 'plan',
      portions: true,
      progress: step !== 'progress',
    })

    setTimeout(() => {
      const stepEl = document.getElementById(`nutri-step-${step}`)
      if (!stepEl) return

      const scrollContainer = stepEl.closest('.overflow-y-auto')
      if (scrollContainer instanceof HTMLElement) {
        scrollContainer.scrollTo({
          top: Math.max(stepEl.offsetTop - 8, 0),
          behavior: 'auto',
        })
        return
      }

      stepEl.scrollIntoView({ behavior: 'auto', block: 'start' })
    }, 140)
  }

  const toggleCollapsed = (step: StepName) => {
    setCollapsed((prev) => ({ ...prev, [step]: !prev[step] }))
  }

  // Validación progresiva de pasos
  const hasProfile = summary?.nutritionProfile !== null && summary?.nutritionProfile !== undefined
  const hasPlan = summary?.activePlanVersion !== null && summary?.activePlanVersion !== undefined
  const canAccessPlan = hasProfile
  const canAccessProgress = hasPlan

  useEffect(() => {
    if (!accessToken) return

    // Always start Nutri at Step 1 with the following steps collapsed.
    setCollapsed({
      profile: false,
      plan: true,
      portions: true,
      progress: true,
    })

    setTimeout(() => {
      const profileEl = document.getElementById('nutri-step-profile')
      if (!profileEl) return

      const scrollContainer = profileEl.closest('.overflow-y-auto')
      if (scrollContainer instanceof HTMLElement) {
        scrollContainer.scrollTo({ top: Math.max(profileEl.offsetTop - 8, 0), behavior: 'auto' })
        return
      }

      profileEl.scrollIntoView({ behavior: 'auto', block: 'start' })
    }, 80)
  }, [accessToken])

  const currentStep = useMemo(() => {
    if (!hasProfile) return 1
    if (!hasPlan) return 2
    return 3
  }, [hasProfile, hasPlan])

  const stepLabel = useMemo(() => {
    if (!hasProfile) return '1. Completa tu perfil nutricional'
    if (!hasPlan) return '2. Define tu plan y porciones'
    return `3. Registrando datos: ${progressLogs.length} seguimientos`
  }, [hasProfile, hasPlan, progressLogs.length])

  const [profileForm, setProfileForm] = useState({
    objectiveGoal: 'healthy_diet',
    activityLevel: 'sedentary',
    age: '',
    biologicalSex: 'prefer_not_to_say',
    heightCm: '',
    currentWeightKg: '',
    targetWeightKg: '',
    targetDate: '',
    mealsPerDay: '5',
    portionSystem: 'grams',
    foodPreferences: [] as string[],
    allergies: [] as string[],
    intolerances: [] as string[],
    notes: '',
  })

  const [planForm, setPlanForm] = useState({
    startDate: '',
    calorieTargetKcal: '',
    proteinG: '',
    fatG: '',
    carbsG: '',
    hydrationMl: '',
    portionsVegetables: '',
    portionsFruits: '',
    portionsCereals: '',
    portionsLegumes: '',
    portionsAnimalProtein: '',
    portionsDairy: '',
    portionsHealthyFats: '',
    adjustmentReason: '',
  })

  const [mealDistributionForm, setMealDistributionForm] = useState<MealDistributionForm>(DEFAULT_MEAL_DISTRIBUTION_FORM)
  const [lastCalculatedGroups, setLastCalculatedGroups] = useState<Record<string, number> | null>(null)
  const [lastCalculatedTargetKcal, setLastCalculatedTargetKcal] = useState<number | null>(null)

  const [progressForm, setProgressForm] = useState({
    logDate: new Date().toISOString().slice(0, 10),
    weightKg: '',
    adherencePercent: '',
    hungerScore: '',
    energyScore: '',
    weeklyNotes: '',
  })

  const runWeeklyGeneration = async () => {
    if (!onPlanSaved) return false

    setIsGeneratingWeek(true)
    try {
      return await onPlanSaved()
    } finally {
      setIsGeneratingWeek(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return
    void Promise.all([loadSummary(), loadProgressLogs(30)])
  }, [accessToken, loadProgressLogs, loadSummary])

  useEffect(() => {
    if (!summary?.nutritionProfile) return

    const profile = summary.nutritionProfile
    setProfileForm((prev) => ({
      ...prev,
      objectiveGoal: (profile.objective_goal || 'healthy_diet') as ObjectiveGoal,
      activityLevel: (profile.activity_level || 'sedentary') as ActivityLevel,
      age: profile.age?.toString() || '',
      biologicalSex: (profile.biological_sex || 'prefer_not_to_say') as 'female' | 'male' | 'intersex' | 'prefer_not_to_say',
      heightCm: profile.height_cm?.toString() || '',
      currentWeightKg: profile.current_weight_kg?.toString() || '',
      targetWeightKg: profile.target_weight_kg?.toString() || '',
      targetDate: profile.target_date || '',
      mealsPerDay: profile.meals_per_day?.toString() || '5',
      portionSystem: (profile.portion_system || 'grams') as 'grams' | 'exchanges',
      foodPreferences: profile.food_preferences || [],
      allergies: profile.allergies || [],
      intolerances: profile.intolerances || [],
      notes: profile.notes || '',
    }))
  }, [summary?.nutritionProfile])

  const activePlan = summary?.activePlanVersion || null

  useEffect(() => {
    if (!activePlan?.distribution_by_meal) {
      setMealDistributionForm(DEFAULT_MEAL_DISTRIBUTION_FORM)
      return
    }

    setMealDistributionForm(distributionFormFromPlan(activePlan.distribution_by_meal))
  }, [activePlan?.distribution_by_meal])

  const sortedProgress = useMemo(() => {
    return [...progressLogs].sort((a, b) => (a.log_date < b.log_date ? 1 : -1))
  }, [progressLogs])

  const metrics = useMemo(() => {
    const last7 = sortedProgress.slice(0, 7)
    const last21 = sortedProgress.slice(0, 21)

    const average = (values: number[]) => {
      if (values.length === 0) return null
      const sum = values.reduce((acc, value) => acc + value, 0)
      return Number((sum / values.length).toFixed(2))
    }

    const weight7 = average(last7.map((item) => item.weight_kg).filter((v): v is number => v !== null))
    const adherence7 = average(last7.map((item) => item.adherence_percent).filter((v): v is number => v !== null))
    const energy7 = average(last7.map((item) => item.energy_score).filter((v): v is number => v !== null))

    let stagnationAlert = ''
    const weight21 = last21.map((item) => item.weight_kg).filter((v): v is number => v !== null)
    if (weight21.length >= 6 && adherence7 !== null && adherence7 >= 80) {
      const newest = weight21[0]
      const oldest = weight21[weight21.length - 1]
      const delta = Math.abs(newest - oldest)
      if (delta < 0.2) {
        stagnationAlert = 'Posible estancamiento: alta adherencia y cambio de peso menor a 0.2 kg en ~3 semanas.'
      }
    }

    return {
      weight7,
      adherence7,
      energy7,
      stagnationAlert,
    }
  }, [sortedProgress])

  const totalPortionsForDiet = useMemo(() => {
    const fromActivePlan = activePlan?.portions_by_group
    if (fromActivePlan && typeof fromActivePlan === 'object') {
      return {
        verduras: Number(fromActivePlan.verduras || 0),
        frutas: Number(fromActivePlan.frutas || 0),
        cereales_tuberculos: Number(fromActivePlan.cereales_tuberculos || 0),
        leguminosas: Number(fromActivePlan.leguminosas || 0),
        proteina_animal_o_alternativas: Number(fromActivePlan.proteina_animal_o_alternativas || 0),
        lacteos_o_sustitutos: Number(fromActivePlan.lacteos_o_sustitutos || 0),
        grasas_saludables: Number(fromActivePlan.grasas_saludables || 0),
      }
    }

    return {
      verduras: toNumberOrUndefined(planForm.portionsVegetables) || 0,
      frutas: toNumberOrUndefined(planForm.portionsFruits) || 0,
      cereales_tuberculos: toNumberOrUndefined(planForm.portionsCereals) || 0,
      leguminosas: toNumberOrUndefined(planForm.portionsLegumes) || 0,
      proteina_animal_o_alternativas: toNumberOrUndefined(planForm.portionsAnimalProtein) || 0,
      lacteos_o_sustitutos: toNumberOrUndefined(planForm.portionsDairy) || 0,
      grasas_saludables: toNumberOrUndefined(planForm.portionsHealthyFats) || 0,
    }
  }, [activePlan?.portions_by_group, planForm.portionsAnimalProtein, planForm.portionsCereals, planForm.portionsDairy, planForm.portionsFruits, planForm.portionsHealthyFats, planForm.portionsLegumes, planForm.portionsVegetables])

  const selectedMealsPerDay = useMemo(() => {
    return Math.max(3, Math.min(toNumberOrUndefined(profileForm.mealsPerDay) || 5, 5))
  }, [profileForm.mealsPerDay])

  const activeDistributionKeys = useMemo(() => {
    return mealDistributionKeys(selectedMealsPerDay)
  }, [selectedMealsPerDay])

  const distributionTotal = useMemo(() => {
    return activeDistributionKeys.reduce((acc, key) => acc + (toNumberOrUndefined(mealDistributionForm[key]) || 0), 0)
  }, [activeDistributionKeys, mealDistributionForm])

  const professionalDietByMeal = useMemo(() => {
    const profileGoal = profileGoalToNutritionGoal(summary?.nutritionProfile?.objective_goal)
    return buildProfessionalDietByMeal(totalPortionsForDiet, selectedMealsPerDay, {
      breakfast: toNumberOrUndefined(mealDistributionForm.breakfast),
      snackAm: toNumberOrUndefined(mealDistributionForm.snackAm),
      lunch: toNumberOrUndefined(mealDistributionForm.lunch),
      snackPm: toNumberOrUndefined(mealDistributionForm.snackPm),
      dinner: toNumberOrUndefined(mealDistributionForm.dinner),
    }, profileGoal)
  }, [mealDistributionForm.breakfast, mealDistributionForm.dinner, mealDistributionForm.lunch, mealDistributionForm.snackAm, mealDistributionForm.snackPm, selectedMealsPerDay, summary?.nutritionProfile?.objective_goal, totalPortionsForDiet])

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')

    const age = toNumberOrUndefined(profileForm.age)
    const heightCm = toNumberOrUndefined(profileForm.heightCm)
    const currentWeightKg = toNumberOrUndefined(profileForm.currentWeightKg)

    if (!age || !heightCm || !currentWeightKg) {
      setMessage('Completa al menos edad, estatura y peso actual.')
      return
    }

    const payload: NutritionProfileInput = {
      objectiveGoal: profileForm.objectiveGoal as NutritionProfileInput['objectiveGoal'],
      activityLevel: profileForm.activityLevel as NutritionProfileInput['activityLevel'],
      age,
      biologicalSex: profileForm.biologicalSex as NutritionProfileInput['biologicalSex'],
      heightCm,
      currentWeightKg,
      targetWeightKg: toNumberOrUndefined(profileForm.targetWeightKg),
      targetDate: profileForm.targetDate || undefined,
      mealsPerDay: toNumberOrUndefined(profileForm.mealsPerDay),
      portionSystem: profileForm.portionSystem as NutritionProfileInput['portionSystem'],
      foodPreferences: profileForm.foodPreferences,
      allergies: profileForm.allergies,
      intolerances: profileForm.intolerances,
      notes: profileForm.notes.trim() || undefined,
    }

    const saved = await saveProfile(payload)
    if (saved) {
      setMessage('Perfil nutricional guardado.')
      openOnlyStep('plan')
    }
  }

  const handlePlanSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')

    const buildPlanPayload = (
      sourcePlanForm: typeof planForm,
      sourceDistribution: MealDistributionForm
    ): NutritionPlanVersionInput | null => {
      if (!sourcePlanForm.startDate) {
        return null
      }

      const portionsByGroup = {
        verduras: toNumberOrUndefined(sourcePlanForm.portionsVegetables) || 0,
        frutas: toNumberOrUndefined(sourcePlanForm.portionsFruits) || 0,
        cereales_tuberculos: toNumberOrUndefined(sourcePlanForm.portionsCereals) || 0,
        leguminosas: toNumberOrUndefined(sourcePlanForm.portionsLegumes) || 0,
        proteina_animal_o_alternativas: toNumberOrUndefined(sourcePlanForm.portionsAnimalProtein) || 0,
        lacteos_o_sustitutos: toNumberOrUndefined(sourcePlanForm.portionsDairy) || 0,
        grasas_saludables: toNumberOrUndefined(sourcePlanForm.portionsHealthyFats) || 0,
      }

      return {
        startDate: sourcePlanForm.startDate,
        calorieTargetKcal: toNumberOrUndefined(sourcePlanForm.calorieTargetKcal),
        proteinG: toNumberOrUndefined(sourcePlanForm.proteinG),
        fatG: toNumberOrUndefined(sourcePlanForm.fatG),
        carbsG: toNumberOrUndefined(sourcePlanForm.carbsG),
        hydrationMl: toNumberOrUndefined(sourcePlanForm.hydrationMl),
        portionsByGroup,
        distributionByMeal: {
          breakfast: toNumberOrUndefined(sourceDistribution.breakfast) || DEFAULT_MEAL_DISTRIBUTION.breakfast,
          snackAm: toNumberOrUndefined(sourceDistribution.snackAm) || DEFAULT_MEAL_DISTRIBUTION.snackAm,
          lunch: toNumberOrUndefined(sourceDistribution.lunch) || DEFAULT_MEAL_DISTRIBUTION.lunch,
          snackPm: toNumberOrUndefined(sourceDistribution.snackPm) || DEFAULT_MEAL_DISTRIBUTION.snackPm,
          dinner: toNumberOrUndefined(sourceDistribution.dinner) || DEFAULT_MEAL_DISTRIBUTION.dinner,
        },
        adjustmentReason: sourcePlanForm.adjustmentReason.trim() || undefined,
      }
    }

    if (!planForm.startDate) {
      setMessage('La fecha de inicio del plan es obligatoria.')
      return
    }

    const payload = buildPlanPayload(planForm, mealDistributionForm)
    if (!payload) {
      setMessage('La fecha de inicio del plan es obligatoria.')
      return
    }

    const saved = await createPlanVersion(payload)
    if (saved) {
      setMessage(`Plan v${saved.version_number} guardado y activado. Generando comidas de la semana...`)
      const generated = await runWeeklyGeneration()
      if (generated) {
        setMessage(`Plan v${saved.version_number} guardado, activado y semana generada.`)
      } else {
        setMessage(`Plan v${saved.version_number} guardado y activado, pero no se pudo generar la semana automaticamente. Intenta de nuevo en Dieta.`)
      }
      openOnlyStep('progress')
    }
  }

  const suggestInitialPlan = async ({ autoSave = false }: { autoSave?: boolean } = {}) => {
    const buildPlanPayload = (
      sourcePlanForm: typeof planForm,
      sourceDistribution: MealDistributionForm
    ): NutritionPlanVersionInput | null => {
      if (!sourcePlanForm.startDate) return null

      return {
        startDate: sourcePlanForm.startDate,
        calorieTargetKcal: toNumberOrUndefined(sourcePlanForm.calorieTargetKcal),
        proteinG: toNumberOrUndefined(sourcePlanForm.proteinG),
        fatG: toNumberOrUndefined(sourcePlanForm.fatG),
        carbsG: toNumberOrUndefined(sourcePlanForm.carbsG),
        hydrationMl: toNumberOrUndefined(sourcePlanForm.hydrationMl),
        portionsByGroup: {
          verduras: toNumberOrUndefined(sourcePlanForm.portionsVegetables) || 0,
          frutas: toNumberOrUndefined(sourcePlanForm.portionsFruits) || 0,
          cereales_tuberculos: toNumberOrUndefined(sourcePlanForm.portionsCereals) || 0,
          leguminosas: toNumberOrUndefined(sourcePlanForm.portionsLegumes) || 0,
          proteina_animal_o_alternativas: toNumberOrUndefined(sourcePlanForm.portionsAnimalProtein) || 0,
          lacteos_o_sustitutos: toNumberOrUndefined(sourcePlanForm.portionsDairy) || 0,
          grasas_saludables: toNumberOrUndefined(sourcePlanForm.portionsHealthyFats) || 0,
        },
        distributionByMeal: {
          breakfast: toNumberOrUndefined(sourceDistribution.breakfast) || DEFAULT_MEAL_DISTRIBUTION.breakfast,
          snackAm: toNumberOrUndefined(sourceDistribution.snackAm) || DEFAULT_MEAL_DISTRIBUTION.snackAm,
          lunch: toNumberOrUndefined(sourceDistribution.lunch) || DEFAULT_MEAL_DISTRIBUTION.lunch,
          snackPm: toNumberOrUndefined(sourceDistribution.snackPm) || DEFAULT_MEAL_DISTRIBUTION.snackPm,
          dinner: toNumberOrUndefined(sourceDistribution.dinner) || DEFAULT_MEAL_DISTRIBUTION.dinner,
        },
        adjustmentReason: sourcePlanForm.adjustmentReason.trim() || undefined,
      }
    }

    const localSuggestion = estimatePlanFromProfile({
      sex: profileForm.biologicalSex,
      activityLevel: profileForm.activityLevel as ActivityLevel,
      objectiveGoal: profileForm.objectiveGoal as ObjectiveGoal,
      age: toNumberOrUndefined(profileForm.age),
      heightCm: toNumberOrUndefined(profileForm.heightCm),
      currentWeightKg: toNumberOrUndefined(profileForm.currentWeightKg),
      targetWeightKg: toNumberOrUndefined(profileForm.targetWeightKg),
    })

    const age = toNumberOrUndefined(profileForm.age) || 30
    const height = toNumberOrUndefined(profileForm.heightCm) || 170
    const weight = toNumberOrUndefined(profileForm.currentWeightKg) || 70
    const mealCount = Math.max(3, Math.min(5, toNumberOrUndefined(profileForm.mealsPerDay) || 5)) as 3 | 4 | 5

    const calculatedPlan = await calculatePlan({
      weight,
      height,
      age,
      gender: profileForm.biologicalSex === 'female' ? 'female' : 'male',
      activityLevel: activityLevelToCalculatorActivity(profileForm.activityLevel as ActivityLevel),
      goal: objectiveGoalToCalculatorGoal(profileForm.objectiveGoal as ObjectiveGoal),
      mealCount,
    })

    setLastCalculatedGroups(kcalFromCalculatedPlan(calculatedPlan))
    setLastCalculatedTargetKcal(typeof calculatedPlan?.targetCalories === 'number' ? calculatedPlan.targetCalories : null)

    const nextDistribution = { ...mealDistributionForm }

    if (calculatedPlan) {
      const calculatedDistribution = { ...DEFAULT_MEAL_DISTRIBUTION_FORM }
      for (const meal of calculatedPlan.meals || []) {
        const key = mealNameToDistributionKey(meal.nombre)
        if (!key) continue
        calculatedDistribution[key] = String(Math.round((meal.percent || 0) * 100))
      }
      Object.assign(nextDistribution, calculatedDistribution)
    }

    setMealDistributionForm(nextDistribution)

    const suggestedPortions = localSuggestion.portions

    const nextPlanForm = {
      ...planForm,
      startDate: planForm.startDate || new Date().toISOString().slice(0, 10),
      calorieTargetKcal: String(Math.round(calculatedPlan?.targetCalories || localSuggestion.kcal)),
      proteinG: String(Math.round(calculatedPlan?.dailyMacros?.protein || localSuggestion.proteinG)),
      fatG: String(Math.round(calculatedPlan?.dailyMacros?.fat || localSuggestion.fatG)),
      carbsG: String(Math.round(calculatedPlan?.dailyMacros?.carbs || localSuggestion.carbsG)),
      hydrationMl: String(localSuggestion.hydrationMl),
      portionsVegetables: String(suggestedPortions.vegetables),
      portionsFruits: String(suggestedPortions.fruits),
      portionsCereals: String(suggestedPortions.cereals),
      portionsLegumes: String(suggestedPortions.legumes),
      portionsAnimalProtein: String(suggestedPortions.animalProtein),
      portionsDairy: String(suggestedPortions.dairy),
      portionsHealthyFats: String(suggestedPortions.healthyFats),
      adjustmentReason: planForm.adjustmentReason || 'Plan inicial sugerido automaticamente segun perfil y actividad.',
    }

    setPlanForm(nextPlanForm)

    if (!autoSave) {
      setMessage('Sugerencia inicial aplicada desde calculate-plan. Guarda el plan para que Impacto diario use estos valores.')
      return
    }

    const payload = buildPlanPayload(nextPlanForm, nextDistribution)
    if (!payload) {
      setMessage('Sugerencia aplicada, pero falta fecha de inicio para guardar el plan.')
      return
    }

    const saved = await createPlanVersion(payload)
    if (saved) {
      setMessage(`Plan sugerido guardado y activado (v${saved.version_number}). Generando comidas de la semana...`)
      const generated = await runWeeklyGeneration()
      if (generated) {
        setMessage(`Plan sugerido guardado y activado (v${saved.version_number}). La semana ya fue generada.`)
      } else {
        setMessage(`Plan sugerido guardado y activado (v${saved.version_number}), pero no se pudo generar la semana automaticamente. Intenta de nuevo en Dieta.`)
      }
      openOnlyStep('progress')
    }
  }

  const handleProgressSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')

    if (!progressForm.logDate) {
      setMessage('La fecha del seguimiento es obligatoria.')
      return
    }

    const hungerScore = toNumberOrUndefined(progressForm.hungerScore)
    const energyScore = toNumberOrUndefined(progressForm.energyScore)

    if (hungerScore !== undefined && (hungerScore < 1 || hungerScore > 10)) {
      setMessage('Hambre debe estar entre 1 y 10.')
      return
    }

    if (energyScore !== undefined && (energyScore < 1 || energyScore > 10)) {
      setMessage('Energía debe estar entre 1 y 10.')
      return
    }

    const payload: NutritionProgressInput = {
      logDate: progressForm.logDate,
      weightKg: toNumberOrUndefined(progressForm.weightKg),
      adherencePercent: toNumberOrUndefined(progressForm.adherencePercent),
      hungerScore,
      energyScore,
      weeklyNotes: progressForm.weeklyNotes.trim() || undefined,
    }

    const saved = await saveProgressLog(payload)
    if (saved) {
      setMessage('Seguimiento guardado correctamente.')
      setCollapsed((prev) => ({ ...prev, progress: true }))
    }
  }

  if (!accessToken) {
    return (
      <div className="px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-600">
          Inicia sesión para completar tu perfil nutricional y seguimiento.
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={3} stepLabel={stepLabel} />

      {/* Mode Selector */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-900">Modo: {formMode === 'basico' ? 'Básico' : 'Avanzado'}</p>
          <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setFormMode('basico')}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${formMode === 'basico' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}
            >
              Básico
            </button>
            <button
              type="button"
              onClick={() => setFormMode('avanzado')}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${formMode === 'avanzado' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}
            >
              Avanzado
            </button>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3">
        <p className="text-xs font-semibold text-gray-900 mb-2">📊 Resumen</p>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className={`rounded-lg p-2 ${hasProfile ? 'bg-emerald-50' : 'bg-gray-50'}`}>
            <p className="text-gray-600">Perfil</p>
            <p className={`font-bold ${hasProfile ? 'text-emerald-700' : 'text-gray-500'}`}>{hasProfile ? '✓ Completo' : '○ Vacío'}</p>
          </div>
          <div className={`rounded-lg p-2 ${hasPlan ? 'bg-emerald-50' : 'bg-gray-50'}`}>
            <p className="text-gray-600">Plan</p>
            <p className={`font-bold ${hasPlan ? 'text-emerald-700' : 'text-gray-500'}`}>{hasPlan ? `v${summary?.activePlanVersion?.version_number}` : '○ Sin plan'}</p>
          </div>
          <div className="rounded-lg p-2 bg-gray-50">
            <p className="text-gray-600">Peso 7d</p>
            <p className="font-bold text-gray-700">{metrics.weight7 === null ? '--' : `${metrics.weight7} kg`}</p>
          </div>
          <div className="rounded-lg p-2 bg-gray-50">
            <p className="text-gray-600">Adherencia 7d</p>
            <p className="font-bold text-gray-700">{metrics.adherence7 === null ? '--' : `${metrics.adherence7}%`}</p>
          </div>
        </div>
        {error && <p className="text-[10px] text-red-600 mt-2">⚠️ {error}</p>}
        {message && <p className="text-[10px] text-emerald-700 mt-2">✓ {message}</p>}
        {(loading || saving || isGeneratingWeek) && (
          <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
            <LoadingSpinner />
            <span>{isGeneratingWeek ? 'Generando la semana...' : 'Sincronizando...'}</span>
          </div>
        )}
      </div>

      {/* STEP 1: Formulario Perfil */}
      <div id="nutri-step-profile">
        <CollapsibleCard
          title="1. Tu Perfil Nutricional"
          stepNumber={1}
          isExpanded={collapsed.profile}
          onToggle={() => toggleCollapsed('profile')}
          isComplete={hasProfile}
        >
        <p className="text-[11px] text-gray-600 mb-2">Captura tu base clínica para calcular porciones y objetivos personalizados.</p>
        <form onSubmit={(event) => void handleProfileSubmit(event)} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              id="profile-objective-goal"
              label="Objetivo"
              value={profileForm.objectiveGoal}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, objectiveGoal: value as ObjectiveGoal }))}
              helper="Principal para tu plan."
            >
              {OBJECTIVE_OPTIONS.map((objective) => (
                <option key={objective.value} value={objective.value}>
                  {objective.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="profile-activity-level"
              label="Actividad"
              value={profileForm.activityLevel}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, activityLevel: value as ActivityLevel }))}
              helper="Ejercicio semanal."
            >
              {ACTIVITY_LEVEL_OPTIONS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </SelectField>
            <InputField id="profile-age" label="Edad" value={profileForm.age} onChange={(value) => setProfileForm((prev) => ({ ...prev, age: value }))} placeholder="32" />
            <InputField id="profile-height" label="Estatura (cm)" value={profileForm.heightCm} onChange={(value) => setProfileForm((prev) => ({ ...prev, heightCm: value }))} placeholder="168" />
            <InputField id="profile-current-weight" label="Peso actual (kg)" value={profileForm.currentWeightKg} onChange={(value) => setProfileForm((prev) => ({ ...prev, currentWeightKg: value }))} placeholder="72" />
            <SelectField
              id="profile-meals-per-day"
              label="Comidas/día"
              value={profileForm.mealsPerDay}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, mealsPerDay: value }))}
              helper="Mín 3, máx 5."
            >
              <option value="3">3 (Básico)</option>
              <option value="4">4 (+ Colación)</option>
              <option value="5">5 (+ 2 Colaciones)</option>
            </SelectField>
            <SelectField id="profile-sex" label="Sexo biológico" value={profileForm.biologicalSex} onChange={(value) => setProfileForm((prev) => ({ ...prev, biologicalSex: value }))}>
              <option value="prefer_not_to_say">Prefiero no decir</option>
              <option value="female">Mujer</option>
              <option value="male">Hombre</option>
            </SelectField>
          </div>

          {formMode === 'avanzado' && (
            <>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                <InputField id="profile-target-weight" label="Peso meta (kg)" value={profileForm.targetWeightKg} onChange={(value) => setProfileForm((prev) => ({ ...prev, targetWeightKg: value }))} placeholder="66" />
                <InputField id="profile-target-date" label="Fecha meta" type="date" value={profileForm.targetDate} onChange={(value) => setProfileForm((prev) => ({ ...prev, targetDate: value }))} />
              </div>
              <MultiSelectChips
                label="Preferencias"
                options={PREFERENCE_OPTIONS}
                selected={profileForm.foodPreferences}
                onChange={(next) => setProfileForm((prev) => ({ ...prev, foodPreferences: next }))}
                helper="Alimentos que más te gustan o consumes frecuentemente."
              />
              <MultiSelectChips
                label="Alergias"
                options={ALLERGY_OPTIONS}
                selected={profileForm.allergies}
                onChange={(next) => setProfileForm((prev) => ({ ...prev, allergies: next }))}
                activeClass="bg-red-600 text-white border-transparent"
                helper="Estos ingredientes no aparecerán como opciones de reemplazo."
              />
              <MultiSelectChips
                label="Intolerancias"
                options={INTOLERANCE_OPTIONS}
                selected={profileForm.intolerances}
                onChange={(next) => setProfileForm((prev) => ({ ...prev, intolerances: next }))}
                activeClass="bg-amber-500 text-white border-transparent"
                helper="Ingredientes que te caen mal o debes limitar."
              />
              <TextareaField id="profile-notes" label="Notas clínicas" value={profileForm.notes} onChange={(value) => setProfileForm((prev) => ({ ...prev, notes: value }))} placeholder="Medicamentos o contexto importante" helper="Opcional." />
            </>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={saving || isGeneratingWeek} className="flex-1 bg-emerald-600 text-white rounded-xl py-2 text-xs font-semibold disabled:opacity-50">
              {saving || isGeneratingWeek ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingSpinner />
                  <span>{isGeneratingWeek ? 'Generando semana...' : 'Guardando...'}</span>
                </div>
              ) : (
                'Guardar perfil'
              )}
            </button>
          </div>
        </form>
        </CollapsibleCard>
      </div>

      {/* STEP 2: Plan y Porciones */}
      <div id="nutri-step-plan">
        <CollapsibleCard
          title="2. Plan y Porciones"
          stepNumber={2}
          isExpanded={collapsed.plan}
          onToggle={() => toggleCollapsed('plan')}
          isDisabled={!canAccessPlan}
          isComplete={hasPlan}
        >
        <p className="text-[11px] text-gray-600 mb-2">Define objetivos diarios y distribución por grupo alimenticio.</p>
        <form onSubmit={(event) => void handlePlanSubmit(event)} className="space-y-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-[10px] text-amber-800">
            💡 Usa el botón para una sugerencia automática basada en tu perfil, luego ajusta si es necesario.
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void suggestInitialPlan()}
              disabled={saving || isGeneratingWeek}
              className="w-full bg-amber-100 text-amber-900 rounded-xl py-2 text-xs font-semibold disabled:opacity-50"
            >
              {saving || isGeneratingWeek ? <LoadingSpinner /> : '💡 Sugerir plan inicial'}
            </button>
            <button
              type="button"
              onClick={() => void suggestInitialPlan({ autoSave: true })}
              disabled={saving || isGeneratingWeek}
              className="w-full bg-emerald-100 text-emerald-900 rounded-xl py-2 text-xs font-semibold disabled:opacity-50"
            >
              {saving || isGeneratingWeek ? <LoadingSpinner /> : '✅ Sugerir y guardar'}
            </button>
          </div>

          {lastCalculatedGroups && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-2 text-[10px] text-sky-900">
              <p className="font-semibold mb-1">Diagnóstico calculate-plan (kcal por grupo)</p>
              <p className="mb-2 text-sky-700">
                Este endpoint devuelve distribución energética por grupo (kcal), no porciones directas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {Object.entries(lastCalculatedGroups).map(([key, kcal]) => {
                  const meta = GROUP_DISPLAY_META[key] || { label: key }
                  const pct = lastCalculatedTargetKcal && lastCalculatedTargetKcal > 0
                    ? roundToOne((kcal / lastCalculatedTargetKcal) * 100)
                    : null
                  return (
                    <div key={key} className="rounded-lg bg-white/70 border border-sky-100 px-2 py-1">
                      <p className="font-semibold">{meta.label}</p>
                      <p>{roundToOne(kcal)} kcal</p>
                      {pct !== null && <p className="text-sky-700">{pct}% del objetivo diario</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-2">
            <p className="text-[11px] font-semibold text-gray-900 mb-2">Objetivos diarios</p>
            <div className="grid grid-cols-2 gap-2">
              <InputField id="plan-start-date" label="Inicio" type="date" value={planForm.startDate} onChange={(value) => setPlanForm((prev) => ({ ...prev, startDate: value }))} />
              <InputField id="plan-kcal" label="Calorías" value={planForm.calorieTargetKcal} onChange={(value) => setPlanForm((prev) => ({ ...prev, calorieTargetKcal: value }))} placeholder="2100" />
              <InputField id="plan-protein" label="Proteína (g)" value={planForm.proteinG} onChange={(value) => setPlanForm((prev) => ({ ...prev, proteinG: value }))} placeholder="130" />
              <InputField id="plan-fat" label="Grasa (g)" value={planForm.fatG} onChange={(value) => setPlanForm((prev) => ({ ...prev, fatG: value }))} placeholder="58" />
              <InputField id="plan-carbs" label="Carbos (g)" value={planForm.carbsG} onChange={(value) => setPlanForm((prev) => ({ ...prev, carbsG: value }))} placeholder="220" />
              {formMode === 'avanzado' && (
                <InputField id="plan-hydration" label="Hidra (ml)" value={planForm.hydrationMl} onChange={(value) => setPlanForm((prev) => ({ ...prev, hydrationMl: value }))} placeholder="2500" />
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-2">
            <p className="text-[11px] font-semibold text-gray-900 mb-2">Porciones por grupo</p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <InputField id="plan-portions-vegetables" label="Verduras" value={planForm.portionsVegetables} onChange={(value) => setPlanForm((prev) => ({ ...prev, portionsVegetables: value }))} placeholder="5" />
              <InputField id="plan-portions-fruits" label="Frutas" value={planForm.portionsFruits} onChange={(value) => setPlanForm((prev) => ({ ...prev, portionsFruits: value }))} placeholder="3" />
              <InputField id="plan-portions-cereals" label="Cereales" value={planForm.portionsCereals} onChange={(value) => setPlanForm((prev) => ({ ...prev, portionsCereals: value }))} placeholder="6" />
              {formMode === 'avanzado' && (
                <InputField id="plan-portions-legumes" label="Leguminosas" value={planForm.portionsLegumes} onChange={(value) => setPlanForm((prev) => ({ ...prev, portionsLegumes: value }))} placeholder="1" />
              )}
              <InputField id="plan-portions-protein" label="Proteína" value={planForm.portionsAnimalProtein} onChange={(value) => setPlanForm((prev) => ({ ...prev, portionsAnimalProtein: value }))} placeholder="5" />
              {formMode === 'avanzado' && (
                <InputField id="plan-portions-dairy" label="Lácteos" value={planForm.portionsDairy} onChange={(value) => setPlanForm((prev) => ({ ...prev, portionsDairy: value }))} placeholder="2" />
              )}
              <InputField id="plan-portions-fats" label="Grasas" value={planForm.portionsHealthyFats} onChange={(value) => setPlanForm((prev) => ({ ...prev, portionsHealthyFats: value }))} placeholder="6" className="col-span-2" />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-2">
            <p className="text-[11px] font-semibold text-gray-900 mb-1">Distribución % por comida</p>
            <p className="text-[10px] text-gray-500 mb-2">Estándar: 25/10/35/10/20</p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {activeDistributionKeys.map((key) => (
                <InputField
                  key={key}
                  id={`plan-distribution-${key}`}
                  label={DISTRIBUTION_LABELS[key]}
                  type="number"
                  value={mealDistributionForm[key]}
                  onChange={(value) => setMealDistributionForm((prev) => ({ ...prev, [key]: value }))}
                  placeholder={`${DEFAULT_MEAL_DISTRIBUTION[key]}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Total: {roundToOne(distributionTotal)}%</p>
          </div>

          {formMode === 'avanzado' && (
            <TextareaField
              id="plan-adjustment-reason"
              label="Motivo del cambio"
              value={planForm.adjustmentReason}
              onChange={(value) => setPlanForm((prev) => ({ ...prev, adjustmentReason: value }))}
              placeholder="Objetivo del cambio"
              helper="Se guarda como historial."
            />
          )}

          <button type="submit" disabled={saving || isGeneratingWeek} className="w-full bg-emerald-600 text-white rounded-xl py-2 text-xs font-semibold disabled:opacity-50">
            {saving || isGeneratingWeek ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                <span>{isGeneratingWeek ? 'Generando semana...' : 'Guardando...'}</span>
              </div>
            ) : (
              'Guardar plan'
            )}
          </button>
        </form>
        </CollapsibleCard>
      </div>

      {/* STEP 3: Dieta Profesional (solo lectura) */}
      {hasPlan && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
          <p className="text-xs font-semibold text-emerald-900 mb-2">📋 Tu prescripción por comida</p>
          <p className="text-[10px] text-emerald-700 mb-3">Distribución de porciones según tu plan:</p>
          <div className="space-y-2">
            {professionalDietByMeal.map((item) => (
              <div key={item.meal} className="border border-emerald-200 rounded-lg p-2 bg-white">
                <p className="text-[11px] font-bold text-emerald-900">{item.meal}</p>
                <div className="grid grid-cols-2 gap-1 mt-1 text-[10px]">
                  {Object.entries(item.portions)
                    .filter(([, value]) => value > 0)
                    .map(([group, value]) => {
                      const humanPortion = portionsToHuman(group, value)
                      return (
                        <div key={group}>
                          <p className="text-gray-700 font-semibold">{humanPortion.grams}</p>
                          <p className="text-gray-500 text-[9px] leading-tight">{humanPortion.casera}</p>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: Seguimiento */}
      <div id="nutri-step-progress">
        <CollapsibleCard
          title="3. Seguimiento Semanal"
          stepNumber={3}
          isExpanded={collapsed.progress}
          onToggle={() => toggleCollapsed('progress')}
          isDisabled={!canAccessProgress}
        >
        <p className="text-[11px] text-gray-600 mb-2">Registra solo métricas relevantes para ajustar tu plan.</p>
        <form onSubmit={(event) => void handleProgressSubmit(event)} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <InputField id="progress-date" label="Fecha" type="date" value={progressForm.logDate} onChange={(value) => setProgressForm((prev) => ({ ...prev, logDate: value }))} />
            <InputField id="progress-weight" label="Peso (kg)" value={progressForm.weightKg} onChange={(value) => setProgressForm((prev) => ({ ...prev, weightKg: value }))} placeholder="71.4" />
            <InputField id="progress-adherence" label="Adherencia (%)" value={progressForm.adherencePercent} onChange={(value) => setProgressForm((prev) => ({ ...prev, adherencePercent: value }))} placeholder="90" />
            <InputField id="progress-hunger" label="Hambre (1-10)" value={progressForm.hungerScore} onChange={(value) => setProgressForm((prev) => ({ ...prev, hungerScore: value }))} placeholder="4" />
            <InputField id="progress-energy" label="Energía (1-10)" value={progressForm.energyScore} onChange={(value) => setProgressForm((prev) => ({ ...prev, energyScore: value }))} placeholder="7" />
          </div>

          <TextareaField
            id="progress-weekly-notes"
            label="Notas de la semana"
            value={progressForm.weeklyNotes}
            onChange={(value) => setProgressForm((prev) => ({ ...prev, weeklyNotes: value }))}
            placeholder="Resumen de adherencia, antojos o dificultades"
          />

          <button type="submit" disabled={saving || isGeneratingWeek} className="w-full bg-emerald-600 text-white rounded-xl py-2 text-xs font-semibold disabled:opacity-50">
            {saving || isGeneratingWeek ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                <span>{isGeneratingWeek ? 'Generando semana...' : 'Guardando...'}</span>
              </div>
            ) : (
              'Guardar seguimiento'
            )}
          </button>
        </form>

        {progressLogs.length > 0 && (
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="text-[11px] font-semibold text-gray-900 mb-2">Últimos 8 registros</p>
            <div className="space-y-1">
              {progressLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-[10px] bg-gray-50 rounded-lg px-2 py-1">
                  <span className="text-gray-600">{log.log_date}</span>
                  <span className="font-medium">{log.weight_kg === null ? '--' : `${log.weight_kg} kg`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </CollapsibleCard>
      </div>
    </div>
  )
}
