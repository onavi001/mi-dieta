# Mi Dieta

Frontend web (React + Vite + TypeScript) para plan semanal de comidas, seguimiento nutricional y lista del super.

Demo: https://mi-dieta.netlify.app/

## Qué hace hoy

- Autenticación y sesión contra **mi-dieta-api** (Supabase detrás).
- Vista de dieta por día o por semana.
- Generación de semana desde perfil y plan nutricional activo.
- Tras generar, el cliente puede **sustituir** por platos del catálogo y **alinear porciones** con el reparto del plan (objetivos por grupo y por tipo de comida), escalando cantidades y, si hace falta, añadiendo líneas de ajuste por grupo.
- Selección de platos cercanos al objetivo por slot (ranking por grupos alimentarios).
- Sustitución de ingredientes por alergias e intolerancias cuando aplica.
- Alternativas por comida (modal) y lista del super derivada del plan activo.
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

Crea `.env.local` (puedes partir de `.env.example`):

```env
VITE_DIETA_API_BASE=http://localhost:3000
# Opcional: correo mostrado en Privacidad / Contacto
# VITE_CONTACT_EMAIL=tu-correo@dominio.com
```

Si no defines `VITE_DIETA_API_BASE`, la app usa `http://localhost:3000` por defecto. En producción debe apuntar a la URL HTTPS del backend (por ejemplo `https://mi-dieta-api.onrender.com`).

**Contacto y soporte:** en Netlify añade `VITE_CONTACT_EMAIL` con tu correo, o edita `LOCAL_CONTACT_EMAIL` en `src/constants/contact.ts`.

### Logs y errores (opcional)

- **Sentry (navegador):** crea un proyecto *Browser* en [sentry.io](https://sentry.io), copia el DSN y define `VITE_SENTRY_DSN` en Netlify. `VITE_SENTRY_TRACES_SAMPLE_RATE` puede quedar en `0` si no necesitas trazas de rendimiento.
- Los errores no capturados en cliente se envían solo si Sentry está configurado.

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

1. Levanta el backend en `mi-dieta-api` (`npm run dev`).
2. Levanta el frontend en este repo (`npm run dev`).
3. Crea cuenta o inicia sesión.
4. En Nutri guarda perfil + plan con porciones.
5. Genera la semana desde Dieta.

## Estructura principal

```text
mi-dieta/
  src/
    app/                 # App shell, rutas de alto nivel
    features/
      diet-planner/      # WeeklyDiet, MealCard, modales
      nutrition/         # NutritionPanel
      grocery/           # GroceryList
    services/
      nutrition/         # professionalNutritionRules, portionTargetEngine
      meal-matching/     # mealCatalogMatching (ranking, alineación de porciones)
      plan-generator/    # applyPostPlanGenerationOptimizations
      grocery/           # groceryEngineV2
      profile-food/      # reglas por perfil
    hooks/               # useDietApi, useNutritionApi, dietApi/client
    data/reference/      # ingredientReference, conversiones
    types/               # dominio (Comida, etc.)
```

## Generación de comidas y porciones

1. La **generación base** de la semana la hace el backend a partir del plan activo (porciones y reparto por comida).
2. El frontend puede **sustituir** por platos del catálogo y **ajustar** cantidades para acercarse al objetivo por slot (`computeSlotTargetGroupPortions`, `alignMealPortionsToGroupTargets`, `fillMissingGroupPortionsFromTargets`).
3. La lógica de reparto por grupo/comida está **alineada** con el backend: en la API ver `src/utils/mealPortionTargets.js` (debe mantenerse coherente con `src/services/nutrition/professionalNutritionRules.ts` en este repo).

## Deploy

- Frontend: Netlify (u otro hosting estático).
- Define `VITE_DIETA_API_BASE` en el panel del hosting con la URL del API en producción.
- **Previews de Netlify:** cada preview tiene su propia URL; el backend debe permitirla en CORS (`CLIENT_URLS` en **mi-dieta-api**, lista separada por comas).

---

## Hacia producción y uso por otras personas

Esto es una guía de lo que suele faltar para pasar de “funciona en local/demo” a un **producto usable por usuarios reales**; prioriza según tu alcance.

### Infraestructura y configuración

- **Entornos**: al menos `staging` y `producción`, con variables de entorno distintas (nunca commitear secretos).
- **Dominio y HTTPS** en frontend y API; **CORS** del API limitado a orígenes conocidos (`CLIENT_URL` / lista de orígenes en producción).
- **Base de datos (Supabase)**: revisar **RLS** en todas las tablas expuestas; backups y, si aplica, plan de restauración.
- **Observabilidad**: logs estructurados en el API, monitor de errores (p. ej. Sentry) en front y back, alertas si el servicio cae.

### Seguridad y abuso

- **Rate limiting** en rutas sensibles (login, registro, recuperación).
- Revisión de **cabeceras** (Helmet ya en API; CSP en el hosting del front si puedes).
- Rotación y alcance mínimo de **claves** (service role solo en servidor).

### Producto y confianza

- **Política de privacidad** y **términos de uso** (obligatorio si guardas datos personales o de salud).
- Flujo claro de **verificación de email** y recuperación de contraseña (según lo que exponga Supabase Auth).
- Canal de **soporte** o contacto (aunque sea un correo).

### Calidad y operación

- **CI** (GitHub Actions u otro): `lint` + `test` en cada PR o push a `main` (incluido en `.github/workflows/ci.yml` en este repo).
- Proceso de **migraciones** SQL (versionado; no solo editar a mano en prod sin registro).
- **Runbook** breve: cómo desplegar, cómo revertir, a quién escalar.

### Escala y coste

- Límites y **costes** en Supabase / hosting; evitar sorpresas con tráfico o almacenamiento.

### Opcional

- Pruebas **e2e** críticas (login + generar plan).
- **Analytics** con consentimiento (si mides uso real).

Nada de lo anterior reemplaza el asesoramiento legal o médico: la app es una herramienta de organización; el mensaje para usuarios finales debe ser coherente con eso.
