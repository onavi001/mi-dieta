export type Persona = 'ambos' | 'ivan' | 'paulina'
export type Tab = 'dieta' | 'super'

export type TipoComida =
  | 'Desayuno'
  | 'Snack Mañana'
  | 'Comida'
  | 'Snack Tarde'
  | 'Cena'

export interface Comida {
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