import type { CategoriaSuper } from './types'

export const SUPER: CategoriaSuper[] = [
  {
    cat: 'Proteínas',
    items: [
      { name: 'Pechuga de pollo',               qty: '3 kg',              note: 'Sin piel' },
      { name: 'Res magra (opcional)',             qty: '400–500 g',         note: 'Solo 1 vez por semana' },
      { name: 'Huevos',                           qty: '2–3 docenas',       note: '' },
      { name: 'Yogurt griego natural sin azúcar', qty: '2.5 kg (5–6 envases)', note: 'Sin azúcar ni sabores' },
    ],
  },
  {
    cat: 'Leguminosas',
    items: [
      { name: 'Frijoles bayos o negros (secos)', qty: '600 g',  note: '' },
      { name: 'Lentejas',                         qty: '500 g',  note: '' },
      { name: 'Garbanzos (secos o de lata)',       qty: '500 g',  note: '' },
    ],
  },
  {
    cat: 'Verduras',
    items: [
      { name: 'Espinaca',     qty: '2 manojos', note: '' },
      { name: 'Lechuga',      qty: '2–3 piezas', note: '' },
      { name: 'Calabacita',   qty: '1.2 kg',    note: '' },
      { name: 'Brócoli',      qty: '2 piezas',  note: '' },
      { name: 'Nopales',      qty: '1 kg',      note: '' },
      { name: 'Pepino',       qty: '10 piezas', note: '' },
      { name: 'Zanahoria',    qty: '1 kg',      note: '' },
      { name: 'Champiñones',  qty: '600 g',     note: '' },
      { name: 'Jitomate',     qty: '1 kg',      note: 'Preferir cocido por reflujo' },
      { name: 'Chayote',      qty: '5 piezas',  note: '' },
    ],
  },
  {
    cat: 'Frutas',
    items: [
      { name: 'Manzanas',        qty: '10 piezas',          note: '' },
      { name: 'Peras',           qty: '8 piezas',           note: '' },
      { name: 'Plátanos',        qty: '8–10 piezas',        note: '' },
      { name: 'Papaya o melón',  qty: '1–2 piezas medianas', note: '' },
    ],
  },
  {
    cat: 'Granos',
    items: [
      { name: 'Tortillas de maíz', qty: '2–3 paquetes grandes', note: 'Frescas del tianguis' },
      { name: 'Avena natural',      qty: '400 g',               note: '' },
      { name: 'Arroz integral',     qty: '1 kg',                note: '' },
      { name: 'Papa',               qty: '1.5 kg',              note: '' },
    ],
  },
  {
    cat: 'Lácteos y grasas',
    items: [
      { name: 'Leche de avena sin azúcar (opcional)', qty: '1–2 litros',      note: 'Solo si la usan en avena' },
      { name: 'Aceite de oliva',                       qty: '1 botella pequeña', note: 'Medir siempre (1–2 cditas)' },
    ],
  },
  {
    cat: 'Otros',
    items: [
      { name: 'Semillas de chía',                   qty: '100 g',    note: '' },
      { name: 'Limones',                             qty: '12 piezas', note: '' },
      { name: 'Cilantro',                            qty: '3 manojos', note: '' },
      { name: 'Hierbas y especias (orégano, comino, pimienta)', qty: 'Al gusto', note: '' },
    ],
  },
]