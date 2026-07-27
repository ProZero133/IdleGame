import { describe, expect, it } from 'vitest'

// Test de humo de T0.1.5. Solo existe para demostrar que el arnes de pruebas se
// ejecuta y que esta configurado como espera el nucleo. Lo sustituiran los contratos
// de verdad: determinismo del reducer (T1.1.7), Ley del Sello (T1.3.6) y el candado
// de los 3 jugadores (T1.5.8). Si algun dia falla, el problema no es el juego sino la
// configuracion de Vitest.
describe('arnes de pruebas', () => {
  it('descubre y ejecuta los ficheros de tests/', () => {
    expect(1 + 1).toBe(2)
  })

  it('corre en un entorno SIN DOM, como exige el nucleo puro (GDD 12.6)', () => {
    // No es una comprobacion vacia: fija `environment: 'node'` de vite.config.ts.
    // Si alguien lo cambiara a jsdom, el nucleo podria empezar a tocar el DOM en los
    // tests sin que nadie se diera cuenta hasta que fallara en un worker.
    expect(typeof globalThis.document).toBe('undefined')
  })
})
