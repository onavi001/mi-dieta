import { normalizeIngredientText } from './ingredientReference'

export type HumanPortionUnit = 'g' | 'ml' | 'piece' | 'slice' | 'cup' | 'tbsp' | 'tsp'

export type IngredientPortionProfile = {
  ingredientId: string
  aliases?: string[]
  defaultUnit: HumanPortionUnit
  unitGrams?: number
  allowedSteps: number[]
  minUsefulAmount: number
  maxUsefulAmount: number
}

const PROFILES: IngredientPortionProfile[] = [
  {
    ingredientId: 'pan integral',
    aliases: ['pan de caja integral', 'pan de caja', 'pan bimbo integral'],
    defaultUnit: 'slice',
    unitGrams: 28,
    allowedSteps: [0.5, 1, 1.5, 2, 2.5, 3],
    minUsefulAmount: 0.5,
    maxUsefulAmount: 4,
  },
  {
    ingredientId: 'tortilla maiz',
    aliases: ['tortilla de maiz', 'tortilla'],
    defaultUnit: 'piece',
    unitGrams: 25,
    allowedSteps: [1, 2, 3, 4, 5],
    minUsefulAmount: 1,
    maxUsefulAmount: 6,
  },
  {
    ingredientId: 'tortilla nopal',
    aliases: ['tortilla de nopal'],
    defaultUnit: 'piece',
    unitGrams: 18,
    allowedSteps: [1, 2, 3, 4, 5],
    minUsefulAmount: 1,
    maxUsefulAmount: 6,
  },
  {
    ingredientId: 'manzana',
    defaultUnit: 'piece',
    unitGrams: 120,
    allowedSteps: [0.5, 1, 1.5, 2],
    minUsefulAmount: 0.5,
    maxUsefulAmount: 3,
  },
  {
    ingredientId: 'jitomate',
    aliases: ['tomate'],
    defaultUnit: 'g',
    allowedSteps: [15, 20, 30, 40, 50, 60, 80, 100],
    minUsefulAmount: 15,
    maxUsefulAmount: 250,
  },
  {
    ingredientId: 'yogurt',
    aliases: ['yogur'],
    defaultUnit: 'cup',
    unitGrams: 245,
    allowedSteps: [0.25, 0.5, 0.75, 1, 1.25],
    minUsefulAmount: 0.25,
    maxUsefulAmount: 2,
  },
]

const profileByKey = new Map<string, IngredientPortionProfile>()
for (const profile of PROFILES) {
  profileByKey.set(normalizeIngredientText(profile.ingredientId), profile)
  for (const alias of profile.aliases || []) {
    profileByKey.set(normalizeIngredientText(alias), profile)
  }
}

export function findIngredientPortionProfile(ingredientId: string, presentacion = ''): IngredientPortionProfile | null {
  const normalizedId = normalizeIngredientText(ingredientId)
  const direct = profileByKey.get(normalizedId)
  if (direct) return direct

  const normalizedPresentation = normalizeIngredientText(`${ingredientId} ${presentacion}`)
  for (const [key, profile] of profileByKey.entries()) {
    if (normalizedPresentation.includes(key)) return profile
  }

  return null
}
