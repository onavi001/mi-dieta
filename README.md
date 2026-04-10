# Mi Dieta 🥗

App de dieta semanal y lista del súper pensada para uso diario en el celular. Permite a dos personas (Ivan y Paulina) ver su plan de comidas, marcar comidas completadas, intercambiar opciones y gestionar el súper — todo sincronizado en tiempo real entre dispositivos.

**Demo:** https://mi-dieta.netlify.app/

---

## Características

- **Vista "Hoy"** — muestra solo las comidas del día actual con barra de progreso
- **Vista "Semana"** — plan completo de lunes a domingo
- **Filtro por persona** — ver comidas de Ivan, Paulina, o ambos a la vez
- **Marcar comidas** — checkbox por comida con soporte de deshacer la última acción
- **Intercambiar comida** — cambia una comida por otra opción equivalente del mismo tipo (desliza a la izquierda o usa el botón en la tarjeta expandida)
- **Gestos swipe** — desliza a la derecha para completar, a la izquierda para intercambiar
- **Feedback háptico** — vibración sutil en cada acción táctil
- **Lista del súper** — generada automáticamente a partir del plan de comidas activo, con cantidades por persona
- **Ajustes de cantidades** — edita, incrementa o decrementa cualquier cantidad de la lista
- **Filtro "Solo pendientes"** — oculta los ítems ya chequeados
- **Sincronización entre dispositivos** — el estado se guarda en Netlify Blobs y se sincroniza cada 3 segundos entre todos los dispositivos abiertos

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript 5.9 |
| Build | Vite 8 |
| Estilos | Tailwind CSS 4 |
| Componentes | `@navi01/react` |
| Backend / sync | Netlify Functions + Netlify Blobs |
| Tests | Vitest |
| Deploy | Netlify |

---

## Estructura del proyecto

```
mi-dieta/
├── netlify/
│   └── functions/
│       └── shared-state.mjs   # Netlify Function: GET/PUT de estado por clave
├── public/
├── scripts/
│   └── report-bundle.mjs            # Reporte de tamaño del bundle
├── src/
│   ├── App.tsx                      # Root: layout, navegación inferior, selector de persona
│   ├── components/
│   │   ├── WeeklyDiet.tsx           # Vista de dieta (hoy / semana), swipe, progreso
│   │   ├── MealCard.tsx             # Tarjeta individual de comida con gestos
│   │   └── GroceryList.tsx          # Lista del súper con ajustes y filtros
│   ├── data/
│   │   ├── weeklySlots.ts           # Define los 35 slots semanales (7 días × 5 comidas)
│   │   ├── ingredientReference.ts   # Ingredientes: referencias, conversiones, grupos
│   │   ├── ingredientConversionUtils.ts # Utilidades compartidas de conversión
│   │   ├── groceryEngineV2.ts       # Genera la lista del súper desde comidas de la API
│   │   ├── groceryEngineV2.test.ts  # Tests del motor de lista
│   │   ├── profesionalNutritionRules.ts # Reglas: distribución de porciones por grupo
│   │   ├── mealEngine.ts            # Validación y selección de comidas
│   │   └── types.ts                 # Tipos compartidos (Comida, Persona, TipoComida)
│   ├── hooks/
│   │   ├── useDietApi.ts            # Manejo de plan de dieta desde API
│   │   ├── useNutritionApi.ts       # Manejo de perfil nutricional desde API
│   │   ├── useLocalStorage.ts       # Estado persistente con sincronización
│   │   ├── useGroceryAdjustments.ts # Ajustes manuales de cantidades
│   │   └── localStorageMigrations.ts # Migración de datos al evolucionar schema
│   └── utils/
│       └── haptics.ts               # Feedback háptico (navigator.vibrate)
├── netlify.toml                     # Redirect /api/state → Netlify Function
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## Cómo funciona el plan de comidas

El plan de dieta se **genera dinámicamente en el backend de la API** basándose en el perfil nutricional del usuario (porciones por grupo alimenticio, meta calórica, preferencias).

Las comidas se estructuran así:

- `id` — identificador único asignado por el backend
- `tipo` — `Desayuno | Snack Mañana | Comida | Snack Tarde | Cena`
- `nombre`, `receta`, `tip` — contenido visible
- `ingredientes` — lista con cantidades en gramos
- `forbiddenIngredients` — ingredientes a evitar por el usuario

La frontend obtiene el plan mediante `useDietApi.loadMyPlan()` que trae los slots semanales con sus comidas ya asignadas. Cada slot contiene la comida específica (generada por el backend) con sus ingredientes y cantidades.

---

## Sincronización entre dispositivos

La app usa `useLocalStorage` como fuente única de verdad. El hook:

1. Inicializa desde `localStorage` (lectura inmediata, sin esperar red)
2. Cada 3 segundos hace `GET /api/state?key=<clave>` para actualizar desde el servidor
3. Al cambiar cualquier dato, hace `PUT /api/state?key=<clave>` con el nuevo valor
4. Mientras haya un `PUT` en vuelo, el polling no sobreescribe el estado local (evita revertir cambios recientes)

La Netlify Function (`netlify/functions/shared-state.mjs`) persiste los valores con `@netlify/blobs`.

Las claves sincronizadas son:
| Clave localStorage | Contenido |
|---|---|
| `selectedMealsBySlot` | Comida seleccionada por slot (intercambios) |
| `completedMeals` | IDs de comidas completadas |
| `completedDays` | Días marcados como completados |
| `superChecked` | IDs de ítems del súper chequeados |
| `superOnlyPending` | Filtro "solo pendientes" |
| `groceryAdjustments` | Ajustes manuales de cantidades |

---

## Arranque local

### Requisitos

- Node.js 20+
- npm 10+

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev        # Servidor local en http://localhost:5173
npm run host       # Visible en la red local (para probar en el celular)
```

> **Nota:** En local, las llamadas a `/api/state` fallaran porque la Netlify Function no está corriendo. La app funciona igual usando solo `localStorage`. Para probar la sincronización, haz deploy en Netlify.

### Build de producción

```bash
npm run build      # Valida la base de comidas + TypeScript + Vite build
npm run preview    # Previsualiza el build local
```

### Tests

```bash
npm test           # Corre todos los tests con Vitest
```

### Otros scripts

```bash
npm run lint                # ESLint
npm run build:report        # Build + reporte de tamaño del bundle
```

---

## Deploy en Netlify

El proyecto está configurado para deploy automático desde `main`. El `netlify.toml` define:

- Carpeta de funciones: `netlify/functions/`
- Redirect: `GET/PUT /api/state` → `/.netlify/functions/shared-state`

Para que la sincronización funcione, Netlify Blobs se activa automáticamente en proyectos con Netlify Functions — no requiere configuración adicional.

### Variable de entorno opcional

Si necesitas apuntar a una API de estado propia (no la Netlify Function):

```bash
# .env.local
VITE_SHARED_STATE_API=https://tu-dominio.com/api/state
```

---

## API de estado compartido

La Netlify Function expone dos endpoints:

### `GET /api/state?key=<clave>`

Devuelve el valor guardado.

```json
{ "value": { ... } }
```

### `PUT /api/state?key=<clave>`

Guarda un nuevo valor.

**Body:**
```json
{ "value": { ... } }
```

**Respuesta:**
```json
{ "ok": true }
```

---

## Generación de comidas (Backend)

Las comidas se generan dinámicamente en el backend de la API (`mi-dieta-api`) basándose en:

1. **Perfil nutricional del usuario**: Porciones recomendadas por grupo alimenticio
2. **Meta calórica**: Distribución energética por comida
3. **Preferencias y restricciones**: Alergias, ingredientes prohibidos, etiquetas de dieta
4. **Pool de recetas disponibles**: Combinaciones válidas de ingredientes

El backend asigna automáticamente comidas a cada slot semanal considerando:
- Variedad (no repetir la misma comida en la misma semana)
- Balance nutricional
- Disponibilidad de ingredientes

Para **modificar la lógica de generación** o agregar nuevas recetas, edita los archivos en `mi-dieta-api/src/`:
- Controladores de planes: `planController.js`
- Reglas de generación: archivos en `services/`
- Recetas base: archivos en `data/recipes/` o base de datos

La frontend consume el plan generado mediante `useDietApi.loadMyPlan()` y permite ajustes manuales si está habilitado el intercambio de comidas.