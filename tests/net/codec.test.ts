import { describe, expect, it } from 'vitest'
import { CODEC_PREFIX, CodecError, decode, encode } from '../../src/net/codec'
import { pruneSdp } from '../../src/net/sdp'
import { PROTOCOL_VERSION } from '../../src/net/protocol'
import type { SignalEnvelope } from '../../src/net/signal/ISignalChannel'
import { ALL_SDP_FIXTURES } from './fixtures/sdp'

/**
 * T0.2.11 — el codec tiene que ser reversible sobre SDP REALES, no sobre cadenas de
 * prueba. Un SDP lleva dos puntos, espacios, saltos de linea y hexadecimal separado por
 * guiones; es justo el tipo de texto que rompe una codificacion hecha a la ligera. Y si
 * se corrompe un solo caracter del `fingerprint`, la conexion falla sin decir por que.
 */
describe('codec de codigos de senalizacion', () => {
  it('devuelve el SDP intacto, caracter a caracter', () => {
    for (const { name, sdp } of ALL_SDP_FIXTURES) {
      const envelope: SignalEnvelope = {
        kind: 'offer',
        from: '3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8',
        name: 'Ana',
        protocolVersion: PROTOCOL_VERSION,
        campaignId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
        sdp: pruneSdp(sdp).sdp,
      }
      expect(decode(encode(envelope)), name).toEqual(envelope)
    }
  })

  it('sobrevive a los tipos raros de JSON sin cambiarlos', () => {
    const valor = {
      texto: 'ñáéíóü — “comillas” \\ barra',
      vacio: '',
      cero: 0,
      no: false,
      lista: [],
    }
    expect(decode(encode(valor))).toEqual(valor)
  })

  it('empieza siempre por el prefijo de formato', () => {
    expect(encode({ a: 1 }).startsWith(CODEC_PREFIX + '.')).toBe(true)
  })

  it('tolera espacios y saltos alrededor, que es como llega de un chat', () => {
    const codigo = encode({ a: 1 })
    expect(decode(`\n  ${codigo}\t\n`)).toEqual({ a: 1 })
  })
})

/**
 * T0.2.10 — cada forma de equivocarse al pegar tiene que dar un mensaje que diga QUE
 * hacer. El jugador no ve una consola: si el mensaje no le sirve, se queda atascado.
 */
describe('errores al descodificar', () => {
  const casos: readonly { caso: string; entrada: string; contiene: string }[] = [
    { caso: 'no ha pegado nada', entrada: '   ', contiene: 'No has pegado nada' },
    { caso: 'texto suelto', entrada: 'hola que tal', contiene: 'no parece un codigo' },
    { caso: 'otro formato', entrada: 'YC9.AAAA', contiene: 'otro formato' },
    { caso: 'caracteres invalidos', entrada: 'YC1.¡¡¡no-es-base64!!!', contiene: 'caracteres' },
    { caso: 'base64 valido pero no comprimido', entrada: 'YC1.aGVsbG8', contiene: 'corrupto' },
  ]

  for (const { caso, entrada, contiene } of casos) {
    it(`lo explica cuando ${caso}`, () => {
      expect(() => decode(entrada)).toThrowError(CodecError)
      try {
        decode(entrada)
      } catch (error) {
        expect((error as CodecError).message.toLowerCase()).toContain(contiene.toLowerCase())
      }
    })
  }

  it('detecta un codigo truncado, que es el fallo mas probable al copiar', () => {
    const completo = encode({ sdp: 'x'.repeat(500) })
    const truncado = completo.slice(0, Math.floor(completo.length * 0.6))
    expect(() => decode(truncado)).toThrowError(CodecError)
  })
})
