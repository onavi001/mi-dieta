export type PlanGroupKey =
  | 'verduras'
  | 'frutas'
  | 'cereales_tuberculos'
  | 'leguminosas'
  | 'proteina_animal_o_alternativas'
  | 'lacteos_o_sustitutos'
  | 'grasas_saludables'

export type IngredientReference = {
  group: PlanGroupKey
  unitToGrams?: Record<string, number>
  pieceSizeGrams?: {
    small: number
    medium: number
    large: number
  }
}

// Keep unit keys normalized via normalizeIngredientUnit().
export const INGREDIENT_REFERENCE: Record<string, IngredientReference> = {
  aceite: { group: 'grasas_saludables', unitToGrams: { tsp: 5, ml: 1 } },
  aguacate: {
    group: 'grasas_saludables',
    unitToGrams: { piece: 150, g: 1 },
    pieceSizeGrams: { small: 120, medium: 150, large: 180 },
  },
  arroz: { group: 'cereales_tuberculos', unitToGrams: { cup: 150, g: 1 } },
  avena: { group: 'cereales_tuberculos', unitToGrams: { cup: 80, g: 1 } },
  calabacita: { group: 'verduras', unitToGrams: { cup: 120, piece: 120, g: 1 } },
  caldo: { group: 'verduras', unitToGrams: { ml: 1, cup: 240 } },
  cebolla: { group: 'verduras', unitToGrams: { piece: 110, g: 1, cup: 160 } },
  chia: { group: 'grasas_saludables', unitToGrams: { tsp: 3, g: 1 } },
  espinaca: { group: 'verduras', unitToGrams: { cup: 30, g: 1 } },
  frijol: { group: 'leguminosas', unitToGrams: { cup: 170, g: 1 } },
  huevo: { group: 'proteina_animal_o_alternativas', unitToGrams: { piece: 50, g: 1 } },
  jicama: { group: 'frutas', unitToGrams: { piece: 180, g: 1, cup: 120 } },
  jitomate: { group: 'verduras', unitToGrams: { piece: 120, g: 1, cup: 180 } },
  'leche de avena': { group: 'lacteos_o_sustitutos', unitToGrams: { ml: 1, cup: 240 } },
  lechuga: { group: 'verduras', unitToGrams: { cup: 35, g: 1 } },
  lenteja: { group: 'leguminosas', unitToGrams: { cup: 180, g: 1 } },
  manzana: {
    group: 'frutas',
    unitToGrams: { piece: 180, g: 1 },
    pieceSizeGrams: { small: 150, medium: 180, large: 220 },
  },
  nopal: { group: 'verduras', unitToGrams: { piece: 80, g: 1 } },
  pan: { group: 'cereales_tuberculos', unitToGrams: { slice: 30, g: 1 } },
  papa: { group: 'cereales_tuberculos', unitToGrams: { piece: 170, g: 1 } },
  papaya: {
    group: 'frutas',
    unitToGrams: { cup: 140, g: 1, piece: 300 },
    pieceSizeGrams: { small: 220, medium: 300, large: 380 },
  },
  pavo: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1 } },
  pepino: { group: 'verduras', unitToGrams: { piece: 250, g: 1, cup: 120 } },
  pera: {
    group: 'frutas',
    unitToGrams: { piece: 170, g: 1 },
    pieceSizeGrams: { small: 140, medium: 170, large: 210 },
  },
  platano: {
    group: 'frutas',
    unitToGrams: { piece: 120, g: 1 },
    pieceSizeGrams: { small: 100, medium: 120, large: 140 },
  },
  pollo: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 120 } },
  res: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1 } },
  tortilla: { group: 'cereales_tuberculos', unitToGrams: { piece: 30, g: 1 } },
  yogurt: { group: 'lacteos_o_sustitutos', unitToGrams: { g: 1, ml: 1, cup: 245 } },
  zanahoria: { group: 'verduras', unitToGrams: { piece: 70, g: 1, cup: 130 } },

  // ── proteína animal o alternativas ──────────────────────────────────
  // Pollo
  'pollo entero': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, kg: 1000 } },
  'pollo deshebrado': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 140 } },
  'pechuga de pollo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 150 } },
  'muslo de pollo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 120 } },
  'pierna de pollo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 90 } },
  'ala de pollo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 45 } },
  'filete de pollo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 130 } },
  'pollo molido': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 225 } },
  // Res
  'carne molida de res': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 225 } },
  'filete de res': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 180 } },
  'bistec de res': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 120 } },
  arrachera: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 180 } },
  'milanesa de res': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 120 } },
  'costilla de res': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 100 } },
  'falda de res': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 150 } },
  'res deshebrada': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 140 } },
  // Cerdo
  'lomo de cerdo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 150 } },
  'chuleta de cerdo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 120 } },
  'milanesa de cerdo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 120 } },
  carnitas: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 140 } },
  'jamon de pavo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, slice: 30 } },
  'jamon de cerdo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, slice: 30 } },
  // Pavo
  'pechuga de pavo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 150 } },
  'pavo deshebrado': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 140 } },
  'pavo molido': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 225 } },
  // Pescado y mariscos
  salmon: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 150 } },
  'filete de salmon': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 150 } },
  tilapia: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 120 } },
  'filete de tilapia': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 120 } },
  'atun en agua': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, can: 140 } },
  'atun en aceite': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, can: 140 } },
  sardina: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, can: 90 } },
  camaron: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 145 } },
  basa: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 120 } },
  mojarra: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 200 } },
  cazon: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 120 } },
  // Huevo
  'clara de huevo': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 33 } },
  'huevo entero': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, piece: 50 } },
  // Alternativas vegetales
  tofu: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 250 } },
  'tofu firme': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 250 } },
  tempeh: { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 165 } },
  'soya texturizada': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 95 } },
  'proteina de soya': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 95 } },
  'queso panela': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, slice: 30, cup: 150 } },
  'queso cottage': { group: 'proteina_animal_o_alternativas', unitToGrams: { g: 1, cup: 225 } },

  // ── lácteos o sustitutos ─────────────────────────────────────────────
  'leche entera': { group: 'lacteos_o_sustitutos', unitToGrams: { ml: 1, cup: 240 } },
  'leche descremada': { group: 'lacteos_o_sustitutos', unitToGrams: { ml: 1, cup: 240 } },
  'leche semidescremada': { group: 'lacteos_o_sustitutos', unitToGrams: { ml: 1, cup: 240 } },
  'leche de soya': { group: 'lacteos_o_sustitutos', unitToGrams: { ml: 1, cup: 240 } },
  'leche de almendra': { group: 'lacteos_o_sustitutos', unitToGrams: { ml: 1, cup: 240 } },
  'leche de coco': { group: 'lacteos_o_sustitutos', unitToGrams: { ml: 1, cup: 240 } },
  'yogurt griego': { group: 'lacteos_o_sustitutos', unitToGrams: { g: 1, cup: 245 } },
  'yogurt natural': { group: 'lacteos_o_sustitutos', unitToGrams: { g: 1, cup: 245 } },
  'yogurt bajo en grasa': { group: 'lacteos_o_sustitutos', unitToGrams: { g: 1, cup: 245 } },
  'queso fresco': { group: 'lacteos_o_sustitutos', unitToGrams: { g: 1, slice: 30, cup: 150 } },
  'queso oaxaca': { group: 'lacteos_o_sustitutos', unitToGrams: { g: 1, cup: 120 } },
  'queso manchego': { group: 'lacteos_o_sustitutos', unitToGrams: { g: 1, slice: 30 } },
  'queso cheddar': { group: 'lacteos_o_sustitutos', unitToGrams: { g: 1, slice: 28 } },
  'queso ricotta': { group: 'lacteos_o_sustitutos', unitToGrams: { g: 1, cup: 246 } },
  kefir: { group: 'lacteos_o_sustitutos', unitToGrams: { ml: 1, cup: 240 } },

  // ── cereales y tubérculos ────────────────────────────────────────────
  // Cereales
  'arroz blanco': { group: 'cereales_tuberculos', unitToGrams: { cup: 150, g: 1 } },
  'arroz integral': { group: 'cereales_tuberculos', unitToGrams: { cup: 150, g: 1 } },
  'arroz salvaje': { group: 'cereales_tuberculos', unitToGrams: { cup: 150, g: 1 } },
  pasta: { group: 'cereales_tuberculos', unitToGrams: { cup: 140, g: 1 } },
  espagueti: { group: 'cereales_tuberculos', unitToGrams: { cup: 140, g: 1 } },
  'pasta integral': { group: 'cereales_tuberculos', unitToGrams: { cup: 140, g: 1 } },
  'pan integral': { group: 'cereales_tuberculos', unitToGrams: { slice: 30, g: 1 } },
  'pan de caja': { group: 'cereales_tuberculos', unitToGrams: { slice: 25, g: 1 } },
  'pan pita': { group: 'cereales_tuberculos', unitToGrams: { piece: 60, g: 1 } },
  'pan pita integral': { group: 'cereales_tuberculos', unitToGrams: { piece: 60, g: 1 } },
  'tortilla de maiz': { group: 'cereales_tuberculos', unitToGrams: { piece: 30, g: 1 } },
  'tortilla de harina': { group: 'cereales_tuberculos', unitToGrams: { piece: 45, g: 1 } },
  tostada: { group: 'cereales_tuberculos', unitToGrams: { piece: 12, g: 1 } },
  'avena integral': { group: 'cereales_tuberculos', unitToGrams: { cup: 80, g: 1 } },
  'avena instantanea': { group: 'cereales_tuberculos', unitToGrams: { cup: 80, g: 1 } },
  granola: { group: 'cereales_tuberculos', unitToGrams: { cup: 120, g: 1 } },
  quinoa: { group: 'cereales_tuberculos', unitToGrams: { cup: 170, g: 1 } },
  amaranto: { group: 'cereales_tuberculos', unitToGrams: { cup: 95, g: 1 } },
  'maiz pozolero': { group: 'cereales_tuberculos', unitToGrams: { cup: 150, g: 1 } },
  elote: { group: 'cereales_tuberculos', unitToGrams: { piece: 90, g: 1, cup: 150 } },
  // Tubérculos
  camote: { group: 'cereales_tuberculos', unitToGrams: { piece: 130, g: 1, cup: 200 } },
  'papa cocida': { group: 'cereales_tuberculos', unitToGrams: { piece: 170, g: 1 } },
  'papa al horno': { group: 'cereales_tuberculos', unitToGrams: { piece: 170, g: 1 } },
  yuca: { group: 'cereales_tuberculos', unitToGrams: { piece: 200, g: 1, cup: 206 } },
  'platano macho': { group: 'cereales_tuberculos', unitToGrams: { piece: 200, g: 1 } },

  // ── verduras ──────────────────────────────────────────────────────────
  brocoli: { group: 'verduras', unitToGrams: { cup: 91, g: 1, piece: 350 } },
  coliflor: { group: 'verduras', unitToGrams: { cup: 100, g: 1, piece: 600 } },
  chayote: { group: 'verduras', unitToGrams: { piece: 200, g: 1, cup: 160 } },
  calabaza: { group: 'verduras', unitToGrams: { piece: 200, g: 1, cup: 116 } },
  ejote: { group: 'verduras', unitToGrams: { cup: 100, g: 1 } },
  betabel: { group: 'verduras', unitToGrams: { piece: 82, g: 1, cup: 136 } },
  'chiles poblanos': { group: 'verduras', unitToGrams: { piece: 80, g: 1 } },
  'chile serrano': { group: 'verduras', unitToGrams: { piece: 6, g: 1 } },
  'chile jalapeno': { group: 'verduras', unitToGrams: { piece: 14, g: 1 } },
  apio: { group: 'verduras', unitToGrams: { piece: 40, g: 1, cup: 101 } },
  'pimiento rojo': { group: 'verduras', unitToGrams: { piece: 120, g: 1, cup: 92 } },
  'pimiento verde': { group: 'verduras', unitToGrams: { piece: 120, g: 1, cup: 92 } },
  'pimiento amarillo': { group: 'verduras', unitToGrams: { piece: 120, g: 1, cup: 92 } },
  champinon: { group: 'verduras', unitToGrams: { cup: 70, g: 1, piece: 18 } },
  'hongo portobello': { group: 'verduras', unitToGrams: { piece: 85, g: 1 } },
  kale: { group: 'verduras', unitToGrams: { cup: 67, g: 1 } },
  acelga: { group: 'verduras', unitToGrams: { cup: 36, g: 1 } },
  col: { group: 'verduras', unitToGrams: { cup: 89, g: 1, piece: 900 } },
  repollo: { group: 'verduras', unitToGrams: { cup: 89, g: 1 } },
  rabano: { group: 'verduras', unitToGrams: { piece: 10, g: 1, cup: 116 } },
  poro: { group: 'verduras', unitToGrams: { piece: 90, g: 1 } },
  ajo: { group: 'verduras', unitToGrams: { piece: 3, g: 1 } },
  'jitomate cherry': { group: 'verduras', unitToGrams: { cup: 150, g: 1, piece: 17 } },
  verdolagas: { group: 'verduras', unitToGrams: { cup: 58, g: 1 } },
  huazontle: { group: 'verduras', unitToGrams: { cup: 90, g: 1 } },
  quelites: { group: 'verduras', unitToGrams: { cup: 56, g: 1 } },
  'nopales cocidos': { group: 'verduras', unitToGrams: { piece: 80, g: 1, cup: 149 } },

  // ── frutas ────────────────────────────────────────────────────────────
  naranja: { group: 'frutas', unitToGrams: { piece: 130, g: 1 } },
  mandarina: { group: 'frutas', unitToGrams: { piece: 88, g: 1 } },
  toronja: { group: 'frutas', unitToGrams: { piece: 230, g: 1 } },
  limon: { group: 'frutas', unitToGrams: { piece: 45, g: 1 } },
  kiwi: { group: 'frutas', unitToGrams: { piece: 75, g: 1 } },
  fresa: { group: 'frutas', unitToGrams: { cup: 152, g: 1, piece: 12 } },
  mango: { group: 'frutas', unitToGrams: { piece: 200, g: 1, cup: 165 } },
  melon: { group: 'frutas', unitToGrams: { cup: 160, g: 1, piece: 900 } },
  sandia: { group: 'frutas', unitToGrams: { cup: 152, g: 1, piece: 9000 } },
  pina: { group: 'frutas', unitToGrams: { cup: 165, g: 1, piece: 900 } },
  uva: { group: 'frutas', unitToGrams: { cup: 150, g: 1, piece: 5 } },
  ciruela: { group: 'frutas', unitToGrams: { piece: 66, g: 1 } },
  durazno: { group: 'frutas', unitToGrams: { piece: 150, g: 1 } },
  chabacano: { group: 'frutas', unitToGrams: { piece: 35, g: 1 } },
  guayaba: { group: 'frutas', unitToGrams: { piece: 90, g: 1, cup: 165 } },
  granada: { group: 'frutas', unitToGrams: { piece: 282, g: 1, cup: 174 } },
  higo: { group: 'frutas', unitToGrams: { piece: 50, g: 1 } },
  tuna: { group: 'frutas', unitToGrams: { piece: 103, g: 1 } },
  tamarindo: { group: 'frutas', unitToGrams: { piece: 2, g: 1 } },
  zarzamora: { group: 'frutas', unitToGrams: { cup: 144, g: 1 } },
  arandano: { group: 'frutas', unitToGrams: { cup: 148, g: 1 } },
  frambuesa: { group: 'frutas', unitToGrams: { cup: 123, g: 1 } },
  'platano dominico': { group: 'frutas', unitToGrams: { piece: 60, g: 1 } },

  // ── leguminosas ───────────────────────────────────────────────────────
  garbanzo: { group: 'leguminosas', unitToGrams: { cup: 164, g: 1 } },
  'garbanzo cocido': { group: 'leguminosas', unitToGrams: { cup: 164, g: 1 } },
  'lenteja cocida': { group: 'leguminosas', unitToGrams: { cup: 180, g: 1 } },
  'frijol negro': { group: 'leguminosas', unitToGrams: { cup: 170, g: 1 } },
  'frijol pinto': { group: 'leguminosas', unitToGrams: { cup: 170, g: 1 } },
  'frijol bayo': { group: 'leguminosas', unitToGrams: { cup: 170, g: 1 } },
  'frijol peruano': { group: 'leguminosas', unitToGrams: { cup: 170, g: 1 } },
  'frijol ayocote': { group: 'leguminosas', unitToGrams: { cup: 170, g: 1 } },
  haba: { group: 'leguminosas', unitToGrams: { cup: 170, g: 1 } },
  alverjon: { group: 'leguminosas', unitToGrams: { cup: 164, g: 1 } },
  soya: { group: 'leguminosas', unitToGrams: { cup: 172, g: 1 } },
  edamame: { group: 'leguminosas', unitToGrams: { cup: 155, g: 1 } },
  hummus: { group: 'leguminosas', unitToGrams: { tbsp: 30, g: 1, cup: 246 } },

  // ── grasas saludables ─────────────────────────────────────────────────
  'aceite de oliva': { group: 'grasas_saludables', unitToGrams: { tsp: 5, tbsp: 14, ml: 1 } },
  'aceite de aguacate': { group: 'grasas_saludables', unitToGrams: { tsp: 5, tbsp: 14, ml: 1 } },
  'aceite de coco': { group: 'grasas_saludables', unitToGrams: { tsp: 5, tbsp: 14, ml: 1 } },
  'aceite de canola': { group: 'grasas_saludables', unitToGrams: { tsp: 5, tbsp: 14, ml: 1 } },
  'aguacate maduro': { group: 'grasas_saludables', unitToGrams: { piece: 150, g: 1, cup: 150 } },
  guacamole: { group: 'grasas_saludables', unitToGrams: { tbsp: 30, g: 1, cup: 230 } },
  nuez: { group: 'grasas_saludables', unitToGrams: { piece: 7, g: 1, cup: 100 } },
  almendra: { group: 'grasas_saludables', unitToGrams: { piece: 1, g: 1, cup: 92 } },
  cacahuate: { group: 'grasas_saludables', unitToGrams: { cup: 146, g: 1 } },
  'mantequilla de cacahuate': { group: 'grasas_saludables', unitToGrams: { tbsp: 16, g: 1 } },
  'mantequilla de almendra': { group: 'grasas_saludables', unitToGrams: { tbsp: 16, g: 1 } },
  'semilla de girasol': { group: 'grasas_saludables', unitToGrams: { cup: 140, g: 1, tbsp: 9 } },
  'semilla de calabaza': { group: 'grasas_saludables', unitToGrams: { cup: 129, g: 1, tbsp: 8 } },
  linaza: { group: 'grasas_saludables', unitToGrams: { tsp: 3, tbsp: 10, g: 1 } },
  ajonjoli: { group: 'grasas_saludables', unitToGrams: { tsp: 3, tbsp: 9, g: 1 } },
  'coco rallado': { group: 'grasas_saludables', unitToGrams: { cup: 80, g: 1, tbsp: 5 } },
  tahini: { group: 'grasas_saludables', unitToGrams: { tbsp: 15, g: 1 } },
  pistache: { group: 'grasas_saludables', unitToGrams: { cup: 123, g: 1, piece: 1 } },
  'nuez de la india': { group: 'grasas_saludables', unitToGrams: { cup: 137, g: 1, piece: 6 } },
  pecan: { group: 'grasas_saludables', unitToGrams: { cup: 109, g: 1, piece: 4 } },
}

export const INGREDIENT_GROUP_KEYWORDS: Record<PlanGroupKey, string[]> = {
  verduras: [
    'espinaca', 'lechuga', 'jitomate', 'tomate', 'pepino', 'brocoli', 'zanahoria',
    'verdura', 'ensalada', 'calabaza', 'pimiento', 'champi', 'cebolla',
    'coliflor', 'chayote', 'ejote', 'betabel', 'apio', 'kale', 'acelga',
    'col', 'rabano', 'poro', 'ajo', 'chile', 'hongo', 'verdolaga', 'quelite',
    'huazontle', 'nopales',
  ],
  frutas: [
    'manzana', 'platano', 'banana', 'fruta', 'fresa', 'pera', 'naranja',
    'papaya', 'melon', 'mango', 'pina', 'uva', 'berries',
    'mandarina', 'toronja', 'limon', 'kiwi', 'sandia', 'ciruela', 'durazno',
    'guayaba', 'granada', 'higo', 'tuna', 'tamarindo', 'zarzamora', 'arandano',
    'frambuesa', 'chabacano', 'jicama',
  ],
  cereales_tuberculos: [
    'avena', 'arroz', 'pasta', 'pan', 'tortilla', 'cereal', 'quinoa',
    'papa', 'camote', 'granola', 'maiz',
    'espagueti', 'amaranto', 'yuca', 'tostada', 'elote',
  ],
  leguminosas: [
    'frijol', 'lenteja', 'garbanzo', 'leguminosa', 'hummus',
    'haba', 'edamame', 'alverjon', 'soya',
  ],
  proteina_animal_o_alternativas: [
    'pollo', 'res', 'carne', 'pescado', 'atun', 'huevo', 'pavo', 'tofu', 'queso panela', 'jamon',
    'salmon', 'sardina', 'camaron', 'tilapia', 'cerdo', 'carnitas',
    'arrachera', 'bistec', 'milanesa', 'tempeh', 'mojarra', 'cazon', 'clara',
  ],
  lacteos_o_sustitutos: [
    'leche', 'yogur', 'yoghurt', 'queso', 'kefir', 'bebida vegetal',
    'ricotta', 'cottage', 'oaxaca', 'manchego',
  ],
  grasas_saludables: [
    'aceite', 'aguacate', 'nuez', 'almendra', 'cacahuate', 'semilla', 'chia', 'linaza', 'mantequilla de mani',
    'tahini', 'pistache', 'ajonjoli', 'guacamole', 'pecan',
  ],
}

const UNIT_ALIASES: Record<string, string> = {
  g: 'g',
  gr: 'g',
  gramo: 'g',
  gramos: 'g',
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  ml: 'ml',
  l: 'l',
  lt: 'l',
  litro: 'l',
  litros: 'l',
  oz: 'oz',
  onza: 'oz',
  onzas: 'oz',
  cda: 'tbsp',
  cucharada: 'tbsp',
  cucharadas: 'tbsp',
  tbsp: 'tbsp',
  cdta: 'tsp',
  cdita: 'tsp',
  cucharadita: 'tsp',
  cucharaditas: 'tsp',
  tsp: 'tsp',
  taza: 'cup',
  tazas: 'cup',
  cup: 'cup',
  cups: 'cup',
  pieza: 'piece',
  piezas: 'piece',
  unidad: 'piece',
  unidades: 'piece',
  pza: 'piece',
  pzas: 'piece',
  rebanada: 'slice',
  rebanadas: 'slice',
  slice: 'slice',
  slices: 'slice',
  pizca: 'pinch',
  pizcas: 'pinch',
  pinch: 'pinch',
  can: 'can',
  lata: 'can',
  latas: 'can',
}

export const GROUP_GRAMS_PER_PORTION: Record<PlanGroupKey, number> = {
  verduras: 75,
  frutas: 120,
  cereales_tuberculos: 25,
  leguminosas: 35,
  proteina_animal_o_alternativas: 30,
  lacteos_o_sustitutos: 240,
  grasas_saludables: 5,
}

export const GROUP_LABELS: Record<PlanGroupKey, string> = {
  verduras: 'Verduras',
  frutas: 'Frutas',
  cereales_tuberculos: 'Cereales y tubérculos',
  leguminosas: 'Leguminosas',
  proteina_animal_o_alternativas: 'Proteína animal o alternativas',
  lacteos_o_sustitutos: 'Lácteos o sustitutos',
  grasas_saludables: 'Grasas saludables',
}

export function normalizeIngredientText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeIngredientUnit(value: string): string {
  const key = normalizeIngredientText(value).replace(/\./g, '')
  return UNIT_ALIASES[key] || key
}
