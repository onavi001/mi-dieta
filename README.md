# Mi Dieta

App de dieta y lista del super con React + Vite, pensada para uso diario en telefono.

## Desarrollo local

1. Instala dependencias:

```bash
npm install
```

2. Inicia la app:

```bash
npm run dev
```

## Estado compartido entre dispositivos

Si usas la app desplegada en Netlify, el estado se comparte automaticamente entre ambos dispositivos.

La app guarda y lee estado (comidas, checks, lista del super y ajustes) via una Netlify Function en:

/api/state

No necesitas correr un servidor local para sincronizar.

## Opcional

Si quieres usar otra API de estado, crea un archivo .env.local:

```bash
VITE_SHARED_STATE_API=https://tu-dominio.com/api/state
```

## Scripts

- npm run dev: arranca Vite en local.
- npm run host: arranca Vite visible en la red local.
- npm run validate:db: valida la base de comidas.
- npm run build: valida DB + build de produccion.
- npm run test: tests con Vitest.
