export type Persona = 'ambos' | 'ivan' | 'paulina'
export type Tab = 'dieta' | 'super'

export type TipoComida =
  | 'Desayuno'
  | 'Snack Mañana'
  | 'Comida'
  | 'Snack Tarde'
  | 'Cena'

export interface MealIngredient {
  id: string
  presentacion: string
  cantidadIvan: number
  cantidadPaulina: number
  unidad: string
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
}

export interface ComidaLegacy {
  day: string
  tipo: TipoComida
  nombre: string
  ivan: string
  paulina: string
  receta: string
  tip: string
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