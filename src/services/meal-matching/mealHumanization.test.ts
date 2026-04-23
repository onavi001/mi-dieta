import { describe, expect, it } from 'vitest'
import type { Comida } from '@/types/domain'
import { convertAmountToHumanHint, humanizeMealIngredientAmounts } from './mealHumanization'

describe('mealHumanization', () => {
  it('rounds integral bread to human slice steps', () => {
    const meal: Comida = {
      id: 'test-bread',
      tipo: 'Desayuno',
      nombre: 'Pan con yogurt',
      receta: '',
      tip: '',
      tags: [],
      forbiddenIngredients: [],
      ingredientes: [
        { id: 'pan integral', presentacion: 'pan de caja', cantidad: 2.35, unidad: 'slice' },
      ],
    }

    const humanized = humanizeMealIngredientAmounts(meal)
    expect(humanized.ingredientes[0].unidad).toBe('slice')
    expect(humanized.ingredientes[0].cantidad).toBe(2.5)
  })

  it('raises tiny jitomate grams to useful floor', () => {
    const meal: Comida = {
      id: 'test-jitomate',
      tipo: 'Comida',
      nombre: 'Bowl',
      receta: '',
      tip: '',
      tags: [],
      forbiddenIngredients: [],
      ingredientes: [
        { id: 'jitomate', presentacion: 'picado', cantidad: 3, unidad: 'g' },
      ],
    }

    const humanized = humanizeMealIngredientAmounts(meal)
    expect(humanized.ingredientes[0].cantidad).toBeGreaterThanOrEqual(15)
    expect(humanized.ingredientes[0].unidad).toBe('g')
  })

  it('provides human serving hints for tortilla', () => {
    const hint = convertAmountToHumanHint(
      { id: 'tortilla maiz', presentacion: '', cantidad: 1, unidad: 'piece' },
      2,
      'piece'
    )

    expect(hint).toContain('piezas')
  })
})
