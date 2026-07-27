import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// defineConfig se importa de 'vitest/config' y no de 'vite' para poder declarar el
// bloque `test` aqui mismo: una sola configuracion en vez de dos ficheros que se
// desincronizan.
export default defineConfig({
  // GitHub Pages sirve el sitio bajo https://<usuario>.github.io/IdleGame/, asi que
  // todas las rutas de recursos necesitan ese prefijo. Se aplica TAMBIEN en desarrollo
  // (la url local pasa a ser http://localhost:5173/IdleGame/) a proposito: que dev y
  // produccion difieran es la forma clasica de descubrir una ruta rota el dia del
  // despliegue y no antes. Si el repositorio cambia de nombre, esto cambia con el.
  base: '/IdleGame/',

  plugins: [react()],

  test: {
    // El nucleo de simulacion es TypeScript puro sin DOM (GDD 12.6), asi que el entorno
    // de Node basta y arranca mucho mas rapido que jsdom. Cuando lleguen los tests de
    // componentes de React habra que anadir jsdom, pero solo para esos ficheros.
    environment: 'node',

    // Los tests viven en tests/, separados de src/, tal y como describe GDD 12.7.
    include: ['tests/**/*.test.ts'],
  },
})
