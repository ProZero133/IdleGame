import { describe, expect, it } from 'vitest'
import { encode } from '../../src/net/codec'
import { PROTOCOL_VERSION } from '../../src/net/protocol'
import { ManualSignalChannel, SignalError } from '../../src/net/signal/manual'
import type { PendingCode } from '../../src/net/signal/manual'
import type { SignalEnvelope } from '../../src/net/signal/ISignalChannel'
import { CHROME_OFFER } from './fixtures/sdp'

const CAMPAIGN = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f'

function envelope(overrides: Partial<SignalEnvelope> = {}): SignalEnvelope {
  return {
    kind: 'offer',
    from: '3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8',
    name: 'Ana',
    protocolVersion: PROTOCOL_VERSION,
    campaignId: CAMPAIGN,
    sdp: CHROME_OFFER,
    ...overrides,
  }
}

describe('senalizacion manual', () => {
  it('poda el SDP al publicar, sin que quien llama tenga que acordarse', () => {
    const canal = new ManualSignalChannel()
    const emitidos: PendingCode[] = []
    canal.onPendingCode((p) => emitidos.push(p))

    canal.publish(envelope())

    expect(emitidos).toHaveLength(1)
    const publicado = emitidos[0]
    expect(publicado).toBeDefined()
    expect(publicado?.envelope.sdp).not.toContain('a=extmap-allow-mixed')
    expect(publicado?.envelope.sdp).not.toContain('tcptype active')
    // Y lo esencial sigue ahi.
    expect(publicado?.envelope.sdp).toContain('a=ice-ufrag:')
    expect(publicado?.envelope.sdp).toContain('a=fingerprint:')
  })

  it('lo que publica un par lo entiende el otro', () => {
    const emisor = new ManualSignalChannel()
    const receptor = new ManualSignalChannel({ expectedCampaignId: CAMPAIGN })
    let codigo = ''
    emisor.onPendingCode((p) => {
      codigo = p.code
    })
    emisor.publish(envelope())

    const recibidos: SignalEnvelope[] = []
    receptor.subscribe((e) => recibidos.push(e))
    receptor.receive(codigo)

    expect(recibidos).toHaveLength(1)
    expect(recibidos[0]?.from).toBe('3f2a1b4c-5d6e-4f70-8192-a3b4c5d6e7f8')
    expect(recibidos[0]?.name).toBe('Ana')
  })

  it('rechaza un codigo de otra version del protocolo y dice por que', () => {
    const canal = new ManualSignalChannel()
    const codigo = encode(envelope({ protocolVersion: PROTOCOL_VERSION + 1 }))
    expect(() => canal.receive(codigo)).toThrowError(SignalError)
    expect(() => canal.receive(codigo)).toThrowError(/desactualizado/i)
  })

  it('rechaza un codigo de OTRA partida cuando ya se tiene una', () => {
    const canal = new ManualSignalChannel({ expectedCampaignId: CAMPAIGN })
    const codigo = encode(envelope({ campaignId: 'otra-campana-distinta' }))
    expect(() => canal.receive(codigo)).toThrowError(/OTRA partida/)
  })

  it('adopta la campana del anfitrion cuando aun no se tiene ninguna', () => {
    // Es el caso de quien se UNE: todavia no tiene campana, asi que no puede exigir que
    // coincida con nada. Si esto se rompiera, unirse seria imposible.
    const canal = new ManualSignalChannel()
    const recibido = canal.receive(encode(envelope({ campaignId: 'la-del-anfitrion' })))
    expect(recibido.campaignId).toBe('la-del-anfitrion')
  })

  it('rechaza un codigo bien formado que no sea una invitacion', () => {
    const canal = new ManualSignalChannel()
    expect(() => canal.receive(encode({ cualquier: 'cosa' }))).toThrowError(/no es una invitacion/i)
  })

  it('no deja suscriptores vivos tras liberarlo', () => {
    const canal = new ManualSignalChannel()
    const vistos: SignalEnvelope[] = []
    canal.subscribe((e) => vistos.push(e))
    canal.dispose()
    canal.receive(encode(envelope()))
    expect(vistos).toHaveLength(0)
  })
})
