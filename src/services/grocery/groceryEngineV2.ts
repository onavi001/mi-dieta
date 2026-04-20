import type { CategoriaSuper, Comida, MealIngredient, ProductoSuper } from '../../types/domain'
import { detectIngredientGroup } from '../../data/reference/ingredientConversionUtils'
import { normalizeIngredientText, type PlanGroupKey } from '../../data/reference/ingredientReference'

interface IngredientMap {
  displayName: string
  category: string
  note: string
}

const GROUP_TO_CATEGORY: Record<PlanGroupKey, string> = {
  proteina_animal_o_alternativas: 'Proteínas',
  verduras: 'Verduras',
  frutas: 'Frutas',
  cereales_tuberculos: 'Granos',
  leguminosas: 'Leguminosas',
  lacteos_o_sustitutos: 'Lácteos y sustitutos',
  grasas_saludables: 'Grasas y condimentos',
}

// Mapeo de IDs de ingredientes a información de display (usados por la API backend)
const RAW_INGREDIENT_MAPPING: Record<string, IngredientMap> = {
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

const INGREDIENT_MAPPING: Record<string, IngredientMap> = Object.fromEntries(
  Object.entries(RAW_INGREDIENT_MAPPING).map(([key, value]) => [normalizeIngredientText(key), value])
)

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

function prettifyIngredientName(ingredientId: string): string {
  return ingredientId
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

function resolveIngredientCategory(normalizedId: string, ingredientText: string): string {
  const group = detectIngredientGroup(normalizedId, ingredientText)
  return group ? GROUP_TO_CATEGORY[group] : 'Otros'
}

export function generateGroceryListFromMeals(meals: Comida[]): CategoriaSuper[] {
  const aggregatedMap = new Map<string, AggregatedIngredient>()

  for (const meal of meals) {
    for (const ing of meal.ingredientes as MealIngredient[]) {
      const ingredientId = ing.id
      const normalizedId = normalizeIngredientText(ingredientId)
      const mapping = INGREDIENT_MAPPING[normalizedId]
      const presentacion = ing.presentacion?.trim() || ''
      const unit = ing.unidad
      const aggregateKey = `${normalizedId}::${presentacion}::${unit}`

      const fallbackDisplayName = prettifyIngredientName(ingredientId)
      const displayName = mapping?.displayName || fallbackDisplayName
      const category = mapping?.category || resolveIngredientCategory(normalizedId, `${ingredientId} ${presentacion}`)
      const note = mapping?.note || ''

      const totalQty = typeof ing.cantidad === 'number' ? ing.cantidad : 0

      if (aggregatedMap.has(aggregateKey)) {
        const existing = aggregatedMap.get(aggregateKey)!
        existing.totalQuantity += totalQty
      } else {
        aggregatedMap.set(aggregateKey, {
          key: aggregateKey,
          displayName: formatDisplayName(displayName, presentacion),
          category,
          totalQuantity: totalQty,
          unit,
          note,
        })
      }
    }
  }

  const categoriesMap = new Map<string, ProductoSuper[]>()

  aggregatedMap.forEach((ingredient) => {
    const { displayName, category, totalQuantity, unit, note } = ingredient

    if (!categoriesMap.has(category)) {
      categoriesMap.set(category, [])
    }

    const rounded = Math.round(totalQuantity * 10) / 10
    const qty = unit === 'piezas' ? `${rounded} ${unit}` : `${rounded}${unit}`

    categoriesMap.get(category)!.push({
      name: displayName,
      qty,
      note,
    })
  })

  const categories: CategoriaSuper[] = []
  const categoryOrder = [
    'Proteínas',
    'Lácteos y sustitutos',
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

