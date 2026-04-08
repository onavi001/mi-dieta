# Reglas del proyecto Mi Dieta

## 1) Objetivo del producto
- Construir una app simple para que Oscar y Paulina sigan su dieta semanal en pareja.
- La app debe ayudar a: planear comidas, seguir horarios, marcar avance y comprar sin olvidar nada.
- Prioridad: adherencia diaria, claridad y seguridad alimentaria.

## 2) Perfil y restricciones (reglas no negociables)
- Personas:
  - Oscar: objetivo de deficit moderado, con reflujo.
  - Paulina: deficit suave.
- Alergias/restricciones obligatorias para ambos:
  - Sin pescado.
  - Sin atun.
  - Sin mariscos.
  - Sin nuez y sin almendra.
- Lactosa:
  - Evitar lacteos regulares.
  - Yogurt griego natural sin azucar si esta permitido.
- Reflujo (Oscar):
  - Evitar picante fuerte y frituras.
  - Preferir jitomate cocido.
  - Cenas ligeras y terminar antes de las 20:00.

## 3) Reglas de contenido nutricional
- Misma comida base para ambos, porciones diferentes por persona.
- Estructura diaria fija: desayuno, snack manana, comida, snack tarde, cena.
- Cada comida debe incluir:
  - Nombre claro.
  - Porcion para Oscar.
  - Porcion para Paulina.
  - Preparacion corta (pasos accionables).
  - Nota opcional para reflujo/alergias.
- Todas las recetas deben ser:
  - Con ingredientes faciles de conseguir en Guadalajara.
  - Rapidas (ideal 15-35 min en dia laboral).
  - Sin ingredientes prohibidos.

## 4) Reglas de horarios
- Ventana diaria objetivo:
  - Desayuno: 08:00-09:00
  - Snack manana: 10:30-11:00
  - Comida: 14:00-15:00
  - Snack tarde: 17:30-18:00
  - Cena: 19:30-20:00
- Regla de reflujo:
  - No cenar despues de las 20:00.
  - Dejar 2.5-3 horas antes de dormir.

## 5) Reglas de lista del super
- La lista debe estar agrupada por categorias.
- Cada producto debe incluir:
  - nombre,
  - cantidad exacta semanal,
  - presentacion recomendada,
  - nota de compra/uso.
- El pollo debe aparecer por presentacion cuando aplique:
  - pechuga (plancha/horno),
  - piezas o pollo entero (deshebrar/sopas).
- La lista debe reflejar exactamente lo que aparece en el plan semanal (sin sobrantes ficticios).
- Si un ingrediente se elimina del plan, debe eliminarse automaticamente de la lista del super.

## 6) Reglas de UX funcional
- Acciones minimas obligatorias:
  - Marcar comida completada.
  - Marcar dia completado.
  - Filtrar por persona (ambos/Oscar/Paulina).
  - Ver solo hoy / ver semana completa.
  - Checklist del super con progreso y limpiar marcas.
- Persistencia local:
  - Toda marca de avance debe sobrevivir recarga (localStorage).
- Claridad:
  - Evitar texto ambiguo como "igual que lunes" en la vista final de usuario.
  - Mostrar contenido completo o referencia explicita con enlace interno.

## 7) Reglas tecnicas (UI con @navi01/react)
- Libreria base de UI: @navi01/react.
- Stack visual:
  - React 19 + TypeScript estricto.
  - Tailwind disponible y alineado con la libreria.
- Regla de componentes:
  - Priorizar componentes de @navi01/react sobre HTML custom para botones, cards, badges, alerts, tabs y layouts.
  - Mantener consistencia visual y de accesibilidad (WCAG AA) usando la libreria.
- No introducir componentes custom si ya existe equivalente en @navi01/react, salvo justificacion documentada.

## 8) Regla de fuente unica de verdad
- Debe existir una sola fuente de datos para:
  - comidas de la semana,
  - porciones por persona,
  - horarios,
  - ingredientes del super.
- La lista del super debe derivarse de los datos de comidas cuando sea posible, para evitar contradicciones.
- Prohibido duplicar datos manuales en multiples archivos si representan lo mismo.

## 9) Reglas de calidad
- Criterios de aceptacion por cambio:
  - Sin violar alergias/restricciones.
  - Sin regresiones en marcados/persistencia.
  - Sin inconsistencias entre plan y super.
  - Copy claro en espanol.
- Criterios minimos de codigo:
  - TypeScript sin errores.
  - Lint sin errores nuevos.
  - Componentes pequenos y tipados.

## 10) Roadmap de mejora (orden sugerido)
1. Migrar UI existente a @navi01/react manteniendo funcionalidad.
2. Normalizar modelo de datos (comidas + horarios + ingredientes).
3. Generar lista del super desde los datos del plan.
4. Agregar validaciones automticas de restricciones (alergenos prohibidos).
5. Mejorar experiencia movil y estados vacios.

## 11) Definition of Done (DoD)
- Vista semanal utilizable de lunes a domingo.
- Horarios visibles por bloque de comida.
- Lista del super 100% consistente con plan semanal.
- Flujo de marcado completado sin perdida al recargar.
- UI principal usando @navi01/react en componentes clave.
