import { describe, expect, it } from 'vitest'
import { encode } from '../../src/net/codec'
import { countCandidates, hasEssentialSdpLines, pruneSdp } from '../../src/net/sdp'
import { PROTOCOL_VERSION } from '../../src/net/protocol'
import type { SignalEnvelope } from '../../src/net/signal/ISignalChannel'
import { ALL_SDP_FIXTURES, CROWDED_OFFER } from './fixtures/sdp'

/**
 * T0.2.5 — el presupuesto que decide si la senalizacion manual es viable.
 *
 * Todo el bloque 0.2 se sostiene sobre una apuesta: que el codigo de invitacion quepa
 * comodamente en un mensaje de chat. Si no cupiera, la senalizacion manual dejaria de ser
 * una molestia aceptable y habria que replantear el enfoque (deuda D1) ANTES de construir
 * el protocolo encima. De ahi que esto sea un contrato y no una comprobacion a ojo.
 *
 * El limite duro de un mensaje de Discord son 2000 caracteres. El presupuesto se fija
 * bastante por debajo para dejar sitio a que el jugador escriba algo alrededor del codigo
 * y a que un navegador futuro emita SDP algo mas gordos.
 *
 * Si un cambio pone esto en rojo, **recalibrar midiendo**, no subiendo el numero a ojo:
 * un salto grande significa que algo ha dejado de comprimir bien.
 */
const DISCORD_HARD_LIMIT = 2000
const BUDGET_CHARS = 1200

function buildEnvelope(sdp: string): SignalEnvelope {
  return {
    kind: 'offer',
    // Un UUID v4, que es lo que produce crypto.randomUUID en el cliente real.
    from: '3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8',
    // Un nombre largo tirando a pesimista.
    name: 'Herrero del Yunque Comun',
    protocolVersion: PROTOCOL_VERSION,
    campaignId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
    sdp,
  }
}

describe('tamano del codigo de senalizacion (T0.2.5)', () => {
  it('cabe de sobra en un mensaje de chat, incluso en el peor caso', () => {
    const filas: string[] = []
    for (const { name, sdp } of ALL_SDP_FIXTURES) {
      const crudo = encode(buildEnvelope(sdp))
      const podado = encode(buildEnvelope(pruneSdp(sdp).sdp))
      filas.push(
        `${name.padEnd(26)} sdp=${String(sdp.length).padStart(5)}B  ` +
          `codigo sin podar=${String(crudo.length).padStart(4)}  ` +
          `podado=${String(podado.length).padStart(4)}  ` +
          `(${Math.round((1 - podado.length / crudo.length) * 100)}% menos, ` +
          `${Math.round((podado.length / sdp.length) * 100)}% del SDP original)`,
      )
      expect(podado.length).toBeLessThan(BUDGET_CHARS)
      expect(podado.length).toBeLessThan(DISCORD_HARD_LIMIT)
    }
    // Se imprime siempre: el numero es el resultado util de este test, no solo el verde.
    console.log('\n' + filas.join('\n') + '\n')
  })

  it('el codigo es UNA sola linea y sobrevive a copiar y pegar', () => {
    const codigo = encode(buildEnvelope(pruneSdp(CROWDED_OFFER).sdp))
    expect(codigo).not.toMatch(/\s/)
    // base64url: nada de + / = que se rompan en una URL o los reescriba un chat.
    expect(codigo).toMatch(/^YC1\.[A-Za-z0-9_-]+$/)
  })
})

describe('poda del SDP (T0.2.4)', () => {
  it('conserva todo lo imprescindible en los tres navegadores', () => {
    for (const { name, sdp } of ALL_SDP_FIXTURES) {
      const { sdp: podado } = pruneSdp(sdp)
      expect(hasEssentialSdpLines(podado), `faltan lineas esenciales en ${name}`).toBe(true)
    }
  })

  it('no se lleva por delante ningun candidato que pueda conectar', () => {
    for (const { name, sdp } of ALL_SDP_FIXTURES) {
      const utilesAntes = sdp
        .split('\r\n')
        .filter((l) => l.startsWith('a=candidate:') && !l.includes('tcptype active')).length
      expect(countCandidates(pruneSdp(sdp).sdp), `candidatos perdidos en ${name}`).toBe(utilesAntes)
    }
  })

  it('deja siempre al menos un candidato: cero significa conexion imposible', () => {
    for (const { name, sdp } of ALL_SDP_FIXTURES) {
      expect(countCandidates(pruneSdp(sdp).sdp), name).toBeGreaterThan(0)
    }
  })

  it('es idempotente: podar dos veces da lo mismo que podar una', () => {
    for (const { sdp } of ALL_SDP_FIXTURES) {
      const una = pruneSdp(sdp).sdp
      expect(pruneSdp(una).sdp).toBe(una)
    }
  })
})
