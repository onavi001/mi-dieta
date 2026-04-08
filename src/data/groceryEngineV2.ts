import { buildWeeklyMeals } from './mealEngine'
import type { CategoriaSuper, MealIngredient, ProductoSuper } from './types'

interface IngredientMap {
  displayName: string
  category: string
  note: string
}

// Mapeo de IDs de ingredientes (como están en meal-database.json) a información de display
const INGREDIENT_MAPPING: Record<string, IngredientMap> = {
  'pollo': { displayName: 'Pollo', category: 'Proteínas', note: 'Elegir corte según presentación' },
  'res': { displayName: 'Carne de res', category: 'Proteínas', note: 'Corte magro' },
  'pavo': { displayName: 'Pavo', category: 'Proteínas', note: 'Más magro que pollo' },
  'huevo': { displayName: 'Huevos', category: 'Proteínas', note: 'Libres de jaula si es posible' },
  'yogurt': { displayName: 'Yogurt griego natural sin azúcar', category: 'Proteínas', note: 'Sin azúcar ni sabores' },
  
  'frijol': { displayName: 'Frijoles bayos o negros (secos)', category: 'Leguminosas', note: '' },
  'lenteja': { displayName: 'Lentejas', category: 'Leguminosas', note: '' },
  'garbanzo': { displayName: 'Garbanzos (secos o de lata)', category: 'Leguminosas', note: '' },
  
  'espinaca': { displayName: 'Espinaca', category: 'Verduras', note: '' },
  'lechuga': { displayName: 'Lechuga', category: 'Verduras', note: 'Preferir romana' },
  'calabacita': { displayName: 'Calabacita', category: 'Verduras', note: '' },
  'brócoli': { displayName: 'Brócoli', category: 'Verduras', note: '' },
  'nopal': { displayName: 'Nopales', category: 'Verduras', note: 'Frescos o envasados' },
  'pepino': { displayName: 'Pepino', category: 'Verduras', note: 'Frescos' },
  'zanahoria': { displayName: 'Zanahoria', category: 'Verduras', note: 'Para picar o rallada' },
  'jitomate': { displayName: 'Jitomate', category: 'Verduras', note: 'Preferir cocido por reflujo' },
  'chayote': { displayName: 'Chayote', category: 'Verduras', note: '' },
  'jicama': { displayName: 'Jicama', category: 'Verduras', note: 'Cruda, con limón' },
  'cebolla': { displayName: 'Cebolla blanca', category: 'Verduras', note: 'Para guisos' },
  
  'manzana': { displayName: 'Manzanas', category: 'Frutas', note: 'Verdes o rojas según preferencia' },
  'pera': { displayName: 'Peras', category: 'Frutas', note: 'Duras o blandas' },
  'platano': { displayName: 'Plátanos', category: 'Frutas', note: 'Frescos' },
  'papaya': { displayName: 'Papaya', category: 'Frutas', note: 'Facilita digestión' },
  'melón': { displayName: 'Melón', category: 'Frutas', note: 'De temporada' },
  'aguacate': { displayName: 'Aguacate', category: 'Grasas y condimentos', note: 'Cuidar oxidación' },
  
  'tortilla': { displayName: 'Tortillas de maíz', category: 'Granos', note: 'Frescas del tianguis' },
  'pan': { displayName: 'Pan integral o blanco', category: 'Granos', note: 'Preferir integral' },
  'avena': { displayName: 'Avena natural', category: 'Granos', note: 'Sin azúcar' },
  'arroz': { displayName: 'Arroz integral', category: 'Granos', note: 'O blanco si lo prefieren' },
  'papa': { displayName: 'Papa', category: 'Granos', note: 'Blancas o amarillas' },
  
  'leche de avena': { displayName: 'Leche de avena sin azúcar', category: 'Grasas y condimentos', note: 'Si la usan' },
  'aceite': { displayName: 'Aceite de oliva', category: 'Grasas y condimentos', note: 'Medir siempre 1-2 cditas' },
  
  'chia': { displayName: 'Semillas de chía', category: 'Otros', note: '' },
  'limon': { displayName: 'Limones', category: 'Otros', note: '' },
  'cilantro': { displayName: 'Cilantro', category: 'Otros', note: '' },
  'canela': { displayName: 'Canela en polvo', category: 'Otros', note: 'Para desayunos' },
  'hierba': { displayName: 'Hierbas y especias (orégano, comino, pimienta)', category: 'Otros', note: '' },
  'caldo': { displayName: 'Caldo de pollo casero o cubos', category: 'Otros', note: 'Casero congelado preferible' },
  'chipotle': { displayName: 'Chiles chipotles en adobo', category: 'Otros', note: 'Uso suave por reflujo' },
}

interface AggregatedIngredient {
  key: string
  displayName: string
  category: string
  totalQuantity: number
  unit: string
  note: string
}

function formatDisplayName(baseName: string, presentacion?: string): string {
  if (!presentacion || presentacion.trim().length === 0) {
    return baseName
  }

  return `${baseName} (${presentacion.trim()})`
}

export function generateGroceryListFromDb(
  selectedMealsBySlot: Record<string, string>
): CategoriaSuper[] {
  // Aggregated map: { ingredientId: { qty: sum, unit: '...', category: '...', ... } }
  const aggregatedMap = new Map<string, AggregatedIngredient>()
  const weeklyMeals = buildWeeklyMeals(selectedMealsBySlot)

  // Iterate through weekly plan meals (selected or default)
  for (const meal of weeklyMeals) {
    // Sum quantities from ingredientes array
    for (const ing of meal.ingredientes as MealIngredient[]) {
      const ingredientId = ing.id
      const mapping = INGREDIENT_MAPPING[ingredientId]
      const presentacion = ing.presentacion?.trim() || ''
      const aggregateKey = `${ingredientId}::${presentacion}`
      
      if (!mapping) {
        console.warn(`Ingrediente no mapeado: ${ingredientId}`)
        continue
      }

      // Total quantity = Ivan's quantity + Paulina's quantity
      const totalQty = ing.cantidadIvan + ing.cantidadPaulina
      const unit = ing.unidad

      if (aggregatedMap.has(aggregateKey)) {
        const existing = aggregatedMap.get(aggregateKey)!
        
        // Si unidades coinciden, sumar directamente
        if (existing.unit === unit) {
          existing.totalQuantity += totalQty
        } else {
          // Si unidades no coinciden, crear entrada aparte (esto no debería pasar normalmente)
          console.warn(`Unidades inconsistentes para ${ingredientId}: ${existing.unit} vs ${unit}`)
          existing.totalQuantity += totalQty
        }
      } else {
        aggregatedMap.set(aggregateKey, {
          key: aggregateKey,
          displayName: formatDisplayName(mapping.displayName, presentacion),
          category: mapping.category,
          totalQuantity: totalQty,
          unit,
          note: mapping.note,
        })
      }
    }
  }

  // Group by category
  const categoriesMap = new Map<string, ProductoSuper[]>()

  aggregatedMap.forEach((ingredient) => {
    const { displayName, category, totalQuantity, unit, note } = ingredient

    if (!categoriesMap.has(category)) {
      categoriesMap.set(category, [])
    }

    const qty = unit === 'piezas' 
      ? `${Math.round(totalQuantity * 10) / 10} ${unit}`
      : `${Math.round(totalQuantity)}${unit}`

    categoriesMap.get(category)!.push({
      name: displayName,
      qty,
      note,
    })
  })

  // Generar estructura de categorías
  const categories: CategoriaSuper[] = []
  const categoryOrder = [
    'Proteínas',
    'Leguminosas',
    'Verduras',
    'Frutas',
    'Granos',
    'Grasas y condimentos',
    'Otros',
  ]

  for (const cat of categoryOrder) {
    const items = categoriesMap.get(cat) || []
    if (items.length > 0) {
      categories.push({
        cat,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      })
    }
  }

  return categories
}
