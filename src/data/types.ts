export type Persona = 'ambos' | 'oscar' | 'paulina'
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
  oscar: string
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