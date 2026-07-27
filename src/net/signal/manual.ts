/**
 * Senalizacion MANUAL: el canal fuera de banda eres tu, pegando un codigo en Discord
 * (T0.2.8).
 *
 * Es la unica implementacion de `ISignalChannel` que existe hoy. Su peor defecto conocido
 * es que reconectar tras cerrar el navegador exige volver a pegar un codigo; se asume a
 * cambio de cero infraestructura, y se compensa con la retransmision entre pares (T0.3),
 * que hace que solo el PRIMER apreton de manos de una sesion sea manual.
 *
 * Toda la fealdad del copiar y pegar vive aqui dentro: el resto del juego solo ve la
 * interfaz.
 */
import { Emitter, type Unsubscribe } from '../events'
import { CodecError, decode, encode } from '../codec'
import { PROTOCOL_VERSION, type CampaignId } from '../protocol'
import { pruneSdp } from '../sdp'
import {
  isSignalEnvelope,
  type ISignalChannel,
  type SignalEnvelope,
  type SignalTransportKind,
} from './ISignalChannel'

/** Fallo de senalizacion con un mensaje pensado para que lo lea el jugador. */
export class SignalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SignalError'
  }
}

/** Un codigo listo para copiar, con el sobre que lo origino. */
export interface PendingCode {
  readonly envelope: SignalEnvelope
  readonly code: string
}

export interface ManualSignalOptions {
  /**
   * Campana que este par ya tiene. Si se indica, se rechaza cualquier codigo de otra
   * partida. Se deja sin indicar al UNIRSE, porque en ese momento aun no se tiene
   * campana: se adopta la del anfitrion.
   */
  readonly expectedCampaignId?: CampaignId
}

export class ManualSignalChannel implements ISignalChannel {
  readonly kind: SignalTransportKind = 'manual'

  private readonly incoming = new Emitter<SignalEnvelope>()
  private readonly pending = new Emitter<PendingCode>()

  // Sin propiedad de parametro: la prohibe `erasableSyntaxOnly` (ver transport.ts).
  private readonly options: ManualSignalOptions

  constructor(options: ManualSignalOptions = {}) {
    this.options = options
  }

  /**
   * "Publicar" aqui no envia nada: poda el SDP, lo codifica y avisa a la interfaz de que
   * hay un codigo esperando a que una persona lo copie.
   */
  publish(envelope: SignalEnvelope): void {
    const compact: SignalEnvelope = { ...envelope, sdp: pruneSdp(envelope.sdp).sdp }
    this.pending.emit({ envelope: compact, code: encode(compact) })
  }

  subscribe(handler: (envelope: SignalEnvelope) => void): Unsubscribe {
    return this.incoming.on(handler)
  }

  /** Avisa de que hay un codigo pendiente de copiar. */
  onPendingCode(handler: (pending: PendingCode) => void): Unsubscribe {
    return this.pending.on(handler)
  }

  /**
   * Inyecta lo que la persona ha pegado (T0.2.10).
   *
   * Todo lo que puede salir mal aqui es humano —pegar de menos, pegar el codigo de otro,
   * pegar el suyo propio— asi que cada fallo lanza un mensaje que explica QUE hacer, no
   * que ha fallado por dentro. Devuelve el sobre ademas de emitirlo para que quien llama
   * pueda encadenar sin suscribirse.
   */
  receive(text: string): SignalEnvelope {
    let decoded: unknown
    try {
      decoded = decode(text)
    } catch (error) {
      // Se reenvia tal cual: CodecError ya trae un mensaje pensado para el jugador.
      throw error instanceof CodecError ? error : new SignalError('El codigo no se ha podido leer.')
    }

    if (!isSignalEnvelope(decoded)) {
      throw new SignalError('Ese codigo es valido pero no es una invitacion ni una respuesta.')
    }

    if (decoded.protocolVersion !== PROTOCOL_VERSION) {
      throw new SignalError(
        `Ese codigo usa la version ${decoded.protocolVersion} del protocolo y esta tiene la ` +
          `${PROTOCOL_VERSION}. Uno de los dos tiene el juego desactualizado: recargad la pagina.`,
      )
    }

    const expected = this.options.expectedCampaignId
    if (expected !== undefined && decoded.campaignId !== expected) {
      throw new SignalError(
        'Ese codigo es de OTRA partida. Mezclar dos campanas borraria el progreso de una, ' +
          'asi que se rechaza.',
      )
    }

    this.incoming.emit(decoded)
    return decoded
  }

  dispose(): void {
    this.incoming.clear()
    this.pending.clear()
  }
}
