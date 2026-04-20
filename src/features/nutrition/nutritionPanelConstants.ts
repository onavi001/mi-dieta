export type ObjectiveGoal =
  | 'weight_loss'
  | 'rapid_weight_loss'
  | 'weight_maintenance'
  | 'muscle_gain'
  | 'weight_gain'
  | 'endurance_improvement'
  | 'healthy_diet'

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
export type CalculatorActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active'
export type CalculatorGoal = 'lose' | 'loseFast' | 'maintain' | 'muscle' | 'gain' | 'endurance' | 'healthy'

export const OBJECTIVE_OPTIONS: Array<{ value: ObjectiveGoal; label: string; description: string }> = [
  { value: 'weight_loss', label: 'Perder peso', description: 'Déficit calórico moderado' },
  { value: 'rapid_weight_loss', label: 'Perder peso rápido', description: 'Déficit calórico agresivo' },
  { value: 'weight_maintenance', label: 'Mantener peso', description: 'Equilibrio calórico' },
  { value: 'muscle_gain', label: 'Ganar músculo', description: 'Superávit calórico + proteína alta' },
  { value: 'weight_gain', label: 'Ganar peso', description: 'Superávit calórico general' },
  { value: 'endurance_improvement', label: 'Mejorar resistencia', description: 'Carbohidratos altos, moderado todo lo demás' },
  { value: 'healthy_diet', label: 'Dieta saludable', description: 'Sin objetivo específico, solo equilibrio' },
]

export const ACTIVITY_LEVEL_OPTIONS: Array<{ value: ActivityLevel; label: string; factor: number; description: string }> = [
  { value: 'sedentary', label: 'Sedentario', factor: 1.2, description: 'Trabajo de oficina, poco o nada de ejercicio' },
  { value: 'lightly_active', label: 'Ligeramente activo', factor: 1.375, description: 'Ejercicio ligero 1-3 días a la semana' },
  { value: 'moderately_active', label: 'Moderamente activo', factor: 1.55, description: 'Ejercicio moderado 3-5 días a la semana' },
  { value: 'very_active', label: 'Muy activo', factor: 1.725, description: 'Ejercicio intenso 6-7 días a la semana' },
]

export const GOAL_CALORIE_ADJUSTMENTS: Record<ObjectiveGoal, number> = {
  weight_loss: -500,
  rapid_weight_loss: -750,
  weight_maintenance: 0,
  muscle_gain: 250,
  weight_gain: 500,
  endurance_improvement: 100,
  healthy_diet: 0,
}

export const GOAL_MACRO_RATIOS: Record<ObjectiveGoal, { protein: number; carbs: number; fat: number }> = {
  weight_loss: { protein: 0.35, carbs: 0.35, fat: 0.3 },
  rapid_weight_loss: { protein: 0.4, carbs: 0.3, fat: 0.3 },
  weight_maintenance: { protein: 0.25, carbs: 0.5, fat: 0.25 },
  muscle_gain: { protein: 0.3, carbs: 0.5, fat: 0.2 },
  weight_gain: { protein: 0.2, carbs: 0.55, fat: 0.25 },
  endurance_improvement: { protein: 0.2, carbs: 0.6, fat: 0.2 },
  healthy_diet: { protein: 0.25, carbs: 0.5, fat: 0.25 },
}

export const MIN_CALORIES_BY_SEX = {
  male: 1500,
  female: 1200,
}
