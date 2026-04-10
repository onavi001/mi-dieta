import type { PlanGroupKey } from './ingredientReference'

export type Tab = 'dieta' | 'super' | 'nutricion'

export type TipoComida =
  | 'Desayuno'
  | 'Snack Mañana'
  | 'Comida'
  | 'Snack Tarde'
  | 'Cena'

export interface MealIngredient {
  id: string
  presentacion: string
  cantidad: number
  unidad: string
}

export type MealGroupPortions = Partial<Record<PlanGroupKey, number>>

export interface RealDishMetadata {
  source?: 'curated' | 'generated' | 'legacy'
  cuisineTags?: string[]
  searchKeywords?: string[]
  prepTimeMinutes?: number
  difficulty?: 'easy' | 'medium' | 'advanced'
  servingNote?: string
}

export interface Comida {
  id: string
  tipo: TipoComida
  nombre: string
  receta: string
  tip: string
  tags: string[]
  forbiddenIngredients: string[]
  ingredientes: MealIngredient[]
  groupPortions?: MealGroupPortions
  realDishMetadata?: RealDishMetadata
}

export interface ProductoSuper {
  name: string
  qty: string
  note: string
}

export interface CategoriaSuper {
  cat: string
  items: ProductoSuper[]
}

// Almacenar ajustes manuales de cantidades en localStorage
export interface GroceryAdjustment {
  productName: string
  customQty: string
  customNote?: string
}