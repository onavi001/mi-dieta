import type { TipoComida } from './types'

export interface MealSlot {
  id: string
  day: string
  tipo: TipoComida
  hour: string
}

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const

const SLOT_HOURS: Record<TipoComida, string> = {
  Desayuno: '08:30',
  'Snack Mañana': '10:45',
  Comida: '14:30',
  'Snack Tarde': '17:45',
  Cena: '19:45',
}

const DAILY_ORDER: TipoComida[] = ['Desayuno', 'Snack Mañana', 'Comida', 'Snack Tarde', 'Cena']

export const WEEKLY_SLOTS: MealSlot[] = DAYS.flatMap((day) =>
  DAILY_ORDER.map((tipo) => ({
    id: `${day.toLowerCase()}-${tipo.toLowerCase().replace(/\s+/g, '-')}`,
    day,
    tipo,
    hour: SLOT_HOURS[tipo],
  }))
)
