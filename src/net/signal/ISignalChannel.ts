/**
 * La costura de senalizacion (GDD 12.3).
 *
 * WebRTC no puede conectar dos navegadores sin un canal fuera de banda por el que
 * intercambiar la oferta y la respuesta: no existe el P2P puro sin intermediario. Hoy ese
 * canal eres tu pegando un codigo en Discord (`ManualSignalChannel`), pero **nada fuera de
 * esta carpeta puede saberlo**. Ese es el objetivo del fichero: el dia que se monte un
 * Worker de senalizacion (deuda D1 del plan), se anade otra implementacion y no se toca
 * ni una linea del resto del juego.
 */
import type { CampaignId, PeerId } from '../protocol'
import type { Unsubscribe } from '../events'

/** Que papel juega el sobre en el apreton de manos. */
export type SignalKind = 'offer' | 'answer'

/**
 * Lo que hay que hacer llegar al otro par para que la conexion se establezca.
 *
 * Lleva `protocolVersion` y `campaignId` **dentro del propio sobre**, y no solo en el
 * HELLO posterior, para poder rechazar un codigo incompatible ANTES de abrir nada y con
 * un mensaje que explique el porque. Si solo se comprobara en el HELLO, el jugador veria
 * una conexion que se abre y se cae sin motivo aparente.
 */
export interface SignalEnvelope {
  readonly kind: SignalKind
  readonly from: PeerId
  readonly name: string
  readonly protocolVersion: number
  readonly campaignId: CampaignId
  readonly sdp: string
}

/** Como se entrega la senalizacion. Solo sirve para la interfaz y los registros. */
export type SignalTransportKind = 'manual' | 'relay' | 'server'

export interface ISignalChannel {
  readonly kind: SignalTransportKind

  /**
   * Hace llegar un sobre al otro extremo. Una implementacion automatica lo envia de
   * verdad; la manual solo lo deja preparado para que una persona lo copie.
   */
  publish(envelope: SignalEnvelope): void

  /** Se suscribe a los sobres entrantes. */
  subscribe(handler: (envelope: SignalEnvelope) => void): Unsubscribe

  /** Suelta recursos y manejadores. */
  dispose(): void
}

/**
 * Comprueba que lo descodificado tiene forma de sobre. El codigo lo pega una persona, asi
 * que hay que asumir que puede ser cualquier cosa: un trozo, otro codigo, o texto suelto.
 */
export function isSignalEnvelope(value: unknown): value is SignalEnvelope {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<Record<keyof SignalEnvelope, unknown>>
  return (
    (v.kind === 'offer' || v.kind === 'answer') &&
    typeof v.from === 'string' &&
    typeof v.name === 'string' &&
    typeof v.protocolVersion === 'number' &&
    typeof v.campaignId === 'string' &&
    typeof v.sdp === 'string'
  )
}
