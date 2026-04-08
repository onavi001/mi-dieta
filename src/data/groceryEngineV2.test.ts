import { describe, expect, it } from 'vitest'
import { generateGroceryListFromDb } from './groceryEngineV2'
import { WEEKLY_SLOTS } from './weeklySlots'
import type { TipoComida } from './types'

function selectionByType(mealByType: Record<TipoComida, string>): Record<string, string> {
  const selected: Record<string, string> = {}

  for (const slot of WEEKLY_SLOTS) {
    selected[slot.id] = mealByType[slot.tipo]
  }

  return selected
}

describe('generateGroceryListFromDb', () => {
  it('returns a non-empty list even with empty selection (fallback weekly meals)', () => {
    const result = generateGroceryListFromDb({})

    expect(result.length).toBeGreaterThan(0)
    expect(result.some((cat) => cat.items.length > 0)).toBe(true)
  })

  it('separates same ingredient by presentacion (e.g. pollo milanesa vs deshebrado)', () => {
    const selected = selectionByType({
      Desayuno: 'desayuno-yogurt-platano',
      'Snack Mañana': 'snack-am-yogurt-pera',
      Comida: 'comida-pollo-plancha',
      'Snack Tarde': 'snack-pm-pollo-cocido',
      Cena: 'cena-ensalada-pollo',
    })

    const result = generateGroceryListFromDb(selected)
    const proteinItems = result.find((cat) => cat.cat === 'Proteínas')?.items ?? []
    const names = proteinItems.map((item) => item.name)

    expect(names).toContain('Pollo (milanesa)')
    expect(names).toContain('Pollo (deshebrado)')

    const milanesa = proteinItems.find((item) => item.name === 'Pollo (milanesa)')
    const deshebrado = proteinItems.find((item) => item.name === 'Pollo (deshebrado)')

    expect(milanesa?.qty.endsWith('g')).toBe(true)
    expect(deshebrado?.qty.endsWith('g')).toBe(true)
  })

  it('keeps stable category ordering for rendering', () => {
    const selected = selectionByType({
      Desayuno: 'desayuno-yogurt-platano',
      'Snack Mañana': 'snack-am-jicama-manzana',
      Comida: 'comida-pollo-plancha',
      'Snack Tarde': 'snack-pm-yogurt-fruta',
      Cena: 'cena-ensalada-pollo',
    })

    const result = generateGroceryListFromDb(selected)
    const categories = result.map((cat) => cat.cat)

    // Verify that if both categories exist, Proteínas is before Verduras
    const proteinsIndex = categories.indexOf('Proteínas')
    const veggiesIndex = categories.indexOf('Verduras')

    expect(proteinsIndex).toBeGreaterThanOrEqual(0)
    expect(veggiesIndex).toBeGreaterThanOrEqual(0)
    expect(proteinsIndex).toBeLessThan(veggiesIndex)
  })
})
