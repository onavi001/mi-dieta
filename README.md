# Mi Dieta

Frontend web (React + Vite + TypeScript) para plan semanal de comidas, seguimiento nutricional y lista del super.

Demo: https://mi-dieta.netlify.app/

## Que hace hoy

- Autenticacion y sesion contra mi-dieta-api.
- Vista de dieta por dia o por semana.
- Generacion de semana desde perfil/plan nutricional.
- Seleccion automatica de comidas similares por slot.
- Regla actual de generacion: siempre intenta dejar una comida por slot; si no puede igualar impacto diario perfecto, toma la opcion mas cercana disponible.
- Ajuste de ingredientes por alergias e intolerancias.
- Popup de alternativas con ver mas/ver menos.
- Lista del super derivada del plan activo.
- Flujo Nutri por pasos (perfil, plan, seguimiento).

## Stack

- React 19
- TypeScript 5
- Vite 8
- Tailwind CSS 4
- ESLint + Vitest

## Requisitos

- Node.js 20+
- npm 10+

## Variables de entorno

Crea `.env.local`:

```env
VITE_DIETA_API_BASE=http://localhost:3000
```

Si no se define, la app usa `http://localhost:3000` por defecto.

## Scripts

```bash
npm install
npm run dev
npm run host
npm run lint
npm test
npm run build
npm run preview
npm run build:report
```

## Flujo recomendado local

1. Levanta backend en `mi-dieta-api` (`npm run dev`).
2. Levanta frontend en este repo (`npm run dev`).
3. Crea/entra con usuario.
4. En Nutri guarda perfil + plan.
5. Genera semana desde Dieta.

## Estructura principal

```text
mi-dieta/
	src/
		App.tsx
		components/
			WeeklyDiet.tsx
			MealCard.tsx
			GroceryList.tsx
			NutritionPanel.tsx
		hooks/
			useDietApi.ts
			useNutritionApi.ts
		data/
			curatedMealCatalog.ts
			mealCatalogMatching.ts
			professionalNutritionRules.ts
			groceryEngineV2.ts
```

## Notas de generacion de comidas

- La generacion base se solicita al backend.
- Luego el frontend puede ajustar con catalogo curado local para acercarse al objetivo por slot.
- Si el impacto diario no coincide exacto, prevalece continuidad operativa: se asigna la opcion mas cercana disponible para no dejar huecos sin comida.

## Deploy

- Frontend: Netlify.
- Asegura que `VITE_DIETA_API_BASE` apunte a tu backend desplegado.