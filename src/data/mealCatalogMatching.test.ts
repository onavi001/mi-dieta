import { describe, expect, it } from 'vitest'
import {
  estimateMealGroupPortions,
  rankMealsForGroupTarget,
  scoreMealAgainstGroupTarget,
} from './mealCatalogMatching'
import type { Comida } from './types'

const balancedLunch: Comida = {
  id: 'balanced-lunch',
  tipo: 'Comida',
  nombre: 'Pollo con arroz y ensalada',
  receta: 'Mezclar',
  tip: '',
  tags: ['curated'],
  forbiddenIngredients: [],
  ingredientes: [
    { id: 'pollo', presentacion: 'pechuga', cantidad: 90, unidad: 'g' },
    { id: 'arroz blanco', presentacion: 'cocido', cantidad: 75, unidad: 'g' },
    { id: 'lechuga', presentacion: 'picada', cantidad: 80, unidad: 'g' },
  ],
  groupPortions: {
    proteina_animal_o_alternativas: 3,
    cereales_tuberculos: 3,
    verduras: 1,
  },
  realDishMetadata: {
    source: 'curated',
    cuisineTags: ['mexicana'],
    prepTimeMinutes: 20,
  },
}

const fruitSnack: Comida = {
  id: 'fruit-snack',
  tipo: 'Snack Tarde',
  nombre: 'Fruta simple',
  receta: 'Servir',
  tip: '',
  tags: [],
  forbiddenIngredients: [],
  ingredientes: [
    { id: 'manzana', presentacion: 'entera', cantidad: 1, unidad: 'piece' },
  ],
}

describe('mealCatalogMatching', () => {
  it('uses explicit groupPortions when the curated dish already defines them', () => {
    const portions = estimateMealGroupPortions(balancedLunch)

    expect(portions.proteina_animal_o_alternativas).toBe(3)
    expect(portions.cereales_tuberculos).toBe(3)
    expect(portions.verduras).toBe(1)
  })

  it('scores curated dishes better when they fit the target groups', () => {
    const target = {
      proteina_animal_o_alternativas: 3,
      cereales_tuberculos: 3,
      verduras: 1,
    }

    const ranked = rankMealsForGroupTarget([fruitSnack, balancedLunch], target)

    expect(ranked[0].meal.id).toBe('balanced-lunch')
    expect(ranked[0].score).toBeLessThan(ranked[1].score)
  })

  it('flags missing groups in the match result', () => {
    const result = scoreMealAgainstGroupTarget(fruitSnack, {
      frutas: 1,
      lacteos_o_sustitutos: 1,
    })

    expect(result.missingGroups).toContain('lacteos_o_sustitutos')
    expect(result.mealPortions.frutas).toBeGreaterThan(0)
  })
})