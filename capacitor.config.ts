import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Android: `npm run cap:sync` luego abre `android/` en Android Studio.
 * appId debe coincidir con el que declares en Google Play Console.
 */
const config: CapacitorConfig = {
  appId: 'com.onavi001.midieta',
  appName: 'Mi Dieta',
  webDir: 'dist',
  server: {
    // Mismo origen "seguro" que HTTPS en navegador (cookies, APIs, etc.)
    androidScheme: 'https',
  },
}

export default config
