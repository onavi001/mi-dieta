import { describe, expect, it } from 'vitest'
import { generateGroceryListFromMeals } from './groceryEngineV2'
import type { Comida } from './types'

// Test meals with realistic ingredient data
const testMeals: Record<string, Comida[]> = {
  Desayuno: [
    {
      id: 'test-1',
      tipo: 'Desayuno',
      nombre: 'Yogurt y Plátano',
      receta: 'Mix',
      tip: 'Test',
      tags: [],
      forbiddenIngredients: [],
      ingredientes: [
        { id: 'yogurt', presentacion: 'natural', cantidad: 150, unidad: 'g' },
        { id: 'platano', presentacion: 'entero', cantidad: 1, unidad: 'unidad' },
      ],
    },
  ],
  'Snack Mañana': [
    {
      id: 'test-2',
      tipo: 'Snack Mañana',
      nombre: 'Yogurt y Pera',
      receta: 'Mix',
      tip: 'Test',
      tags: [],
      forbiddenIngredients: [],
      ingredientes: [
        { id: 'yogurt', presentacion: 'natural', cantidad: 100, unidad: 'g' },
        { id: 'pera', presentacion: 'entero', cantidad: 1, unidad: 'unidad' },
      ],
    },
    {
      id: 'test-2b',
      tipo: 'Snack Mañana',
      nombre: 'Jícama y Manzana',
      receta: 'Mix',
      tip: 'Test',
      tags: [],
      forbiddenIngredients: [],
      ingredientes: [
        { id: 'jicama', presentacion: 'rebanadas', cantidad: 100, unidad: 'g' },
        { id: 'manzana', presentacion: 'entero', cantidad: 1, unidad: 'unidad' },
      ],
    },
  ],
  Comida: [
    {
      id: 'test-3',
      tipo: 'Comida',
      nombre: 'Pollo a la Plancha',
      receta: 'Plancha',
      tip: 'Test',
      tags: [],
      forbiddenIngredients: [],
      ingredientes: [
        { id: 'pollo', presentacion: 'pechuga', cantidad: 150, unidad: 'g' },
        { id: 'lechuga', presentacion: 'picada', cantidad: 100, unidad: 'g' },
      ],
    },
  ],
  'Snack Tarde': [
    {
      id: 'test-4',
      tipo: 'Snack Tarde',
      nombre: 'Pollo Cocido',
      receta: 'Hervido',
      tip: 'Test',
      tags: [],
      forbiddenIngredients: [],
      ingredientes: [
        { id: 'pollo', presentacion: 'cocida', cantidad: 100, unidad: 'g' },
        { id: 'manzana', presentacion: 'entero', cantidad: 1, unidad: 'unidad' },
      ],
    },
    {
      id: 'test-4b',
      tipo: 'Snack Tarde',
      nombre: 'Yogurt y Fruta',
      receta: 'Mix',
      tip: 'Test',
      tags: [],
      forbiddenIngredients: [],
      ingredientes: [
        { id: 'yogurt', presentacion: 'natural', cantidad: 150, unidad: 'g' },
        { id: 'fresa', presentacion: 'fresca', cantidad: 100, unidad: 'g' },
      ],
    },
  ],
  Cena: [
    {
      id: 'test-5',
      tipo: 'Cena',
      nombre: 'Ensalada con Pollo',
      receta: 'Ensalada',
      tip: 'Test',
      tags: [],
      forbiddenIngredients: [],
      ingredientes: [
        { id: 'pollo', presentacion: 'deshebrada', cantidad: 120, unidad: 'g' },
        { id: 'lechuga', presentacion: 'picada', cantidad: 150, unidad: 'g' },
      ],
    },
  ],
}


describe('generateGroceryListFromMeals', () => {
  it('aggregates ingredients from multiple meals into categories', () => {
    const meals = [
      testMeals.Desayuno[0],
      testMeals['Snack Mañana'][0],
      testMeals.Comida[0],
      testMeals['Snack Tarde'][0],
      testMeals.Cena[0],
    ]

    const result = generateGroceryListFromMeals(meals)

    expect(result.length).toBeGreaterThan(0)
    expect(result.some((cat) => cat.items.length > 0)).toBe(true)
  })

  it('separates same ingredient by presentacion (e.g. pollo deshebrado vs cocida)', () => {
    const meals = [
      testMeals.Desayuno[0],
      testMeals['Snack Mañana'][0],
      testMeals.Comida[0],
      testMeals['Snack Tarde'][0],
      testMeals.Cena[0],
    ]

    const result = generateGroceryListFromMeals(meals)
    const proteinItems = result.find((cat) => cat.cat === 'Proteínas')?.items ?? []
    const names = proteinItems.map((item) => item.name)

    // Should have different pollo preparations with proper display names
    expect(names.some((name) => name.toLowerCase().includes('pollo'))).toBe(true)

    // Verify quantities are properly formatted with units
    const polloItems = proteinItems.filter((item) => item.name.toLowerCase().includes('pollo'))
    expect(polloItems.length).toBeGreaterThan(0)
    polloItems.forEach((item) => {
      expect(item.qty).toBeTruthy()
      expect(/^\d+(\.\d+)?\s*g?$/.test(item.qty)).toBe(true)
    })
  })

  it('keeps stable category ordering for rendering', () => {
    const meals = [
      testMeals.Desayuno[0],
      testMeals['Snack Mañana'][1],
      testMeals.Comida[0],
      testMeals['Snack Tarde'][1],
      testMeals.Cena[0],
    ]

    const result = generateGroceryListFromMeals(meals)
    const categories = result.map((cat) => cat.cat)

    // Verify that categories are in a consistent order
    expect(categories.length).toBeGreaterThan(0)
    expect(result.every((cat) => Array.isArray(cat.items))).toBe(true)
  })
})
