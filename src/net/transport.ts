/**
 * Transporte WebRTC: una conexion con un par y su canal de datos (T0.2.6 y T0.2.7).
 *
 * Se usa la API nativa `RTCPeerConnection` sin libreria envolvente. La topologia es
 * ESTRELLA contra el anfitrion (GDD 12.2), no una malla, asi que la logica de conexion es
 * lo bastante simple como para que una dependencia externa costara mas de lo que aporta:
 * cada par mantiene N enlaces como este y poco mas.
 *
 * Las reglas de transicion de estado NO viven aqui sino en `link-state.ts`, para que se
 * puedan probar sin un navegador.
 */
import { Emitter, type Unsubscribe } from './events'
import { LinkStateMachine, type LinkState } from './link-state'
import { isNetMessage, type NetMessage } from './protocol'

export type { LinkState }

/**
 * Servidores STUN publicos. STUN solo sirve para que cada par DESCUBRA su IP publica; no
 * retransmite datos ni ve el trafico. Resuelve la mayoria de los NAT domesticos.
 *
 * Los NAT simetricos necesitarian ademas un TURN, que si retransmite y por eso cuesta
 * dinero. No se pone uno a proposito: con topologia en estrella basta con que todos
 * alcancen al anfitrion, y para el resto esta la deuda D2 del plan (retransmision a nivel
 * de aplicacion por un par que si lo alcance).
 */
export const DEFAULT_ICE_SERVERS: readonly RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

export interface PeerLinkOptions {
  /** Sustituir solo para pruebas o si algun dia se anade un TURN. */
  readonly iceServers?: readonly RTCIceServer[]
  /**
   * Cuanto se espera a recolectar candidatos ICE antes de emitir el codigo. Subirlo da
   * mas posibilidades de incluir el candidato reflexivo (mejor conexion) a costa de que
   * el jugador espere mirando una pantalla; bajarlo emite antes un codigo que quiza solo
   * sirva en la red local.
   */
  readonly gatheringTimeoutMs?: number
  /**
   * Cuanto espera QUIEN INVITA a que el canal se abra, contando desde que pega la
   * respuesta del invitado. Solo se aplica en ese momento: ver `armConnectionTimeout`.
   */
  readonly connectionTimeoutMs?: number
}

const DEFAULT_GATHERING_TIMEOUT_MS = 5000
const DEFAULT_CONNECTION_TIMEOUT_MS = 30000

/** Nombre del canal. Ambos extremos deben coincidir; lo abre siempre quien oferta. */
const CHANNEL_LABEL = 'gremio'

export class TransportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TransportError'
  }
}

/**
 * Espera a que ICE termine de recolectar candidatos.
 *
 * NO se hace trickle ICE (T0.2.7): con senalizacion manual no hay por donde ir mandando
 * candidatos sueltos segun aparecen, asi que se espera a tenerlos todos y se emite un
 * unico bloque. Es mas lento de generar e infinitamente mas simple de pegar.
 *
 * El temporizador de seguridad existe porque un STUN inalcanzable puede dejar la
 * recoleccion colgada: mejor un codigo con los candidatos locales (sirve en la misma LAN)
 * que ninguno.
 */
async function waitForGathering(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (pc.iceGatheringState === 'complete') return
  await new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (): void => {
      if (timer !== undefined) clearTimeout(timer)
      pc.removeEventListener('icegatheringstatechange', check)
      resolve()
    }
    const check = (): void => {
      if (pc.iceGatheringState === 'complete') finish()
    }
    timer = setTimeout(finish, timeoutMs)
    pc.addEventListener('icegatheringstatechange', check)
    check()
  })
}

export class PeerLink {
  private readonly options: PeerLinkOptions
  private readonly pc: RTCPeerConnection
  private readonly fsm = new LinkStateMachine()
  private channel: RTCDataChannel | null = null
  private pingSeq = 0
  private connectionTimer: ReturnType<typeof setTimeout> | undefined

  private readonly messages = new Emitter<NetMessage>()
  private readonly states = new Emitter<LinkState>()
  private readonly errors = new Emitter<TransportError>()

  private constructor(options: PeerLinkOptions) {
    this.options = options
    this.pc = new RTCPeerConnection({
      iceServers: [...(options.iceServers ?? DEFAULT_ICE_SERVERS)],
    })
    this.pc.addEventListener('connectionstatechange', () => {
      switch (this.pc.connectionState) {
        case 'connecting':
          this.setState('connecting')
          break
        case 'connected':
          // El estado 'open' lo marca la apertura del CANAL, no la de la conexion: se
          // puede estar conectado sin canal utilizable, y enviar entonces se pierde.
          break
        case 'failed':
          this.fail('No se ha podido establecer la conexion con el otro par.')
          break
        case 'closed':
          this.setState('closed')
          break
        case 'disconnected':
          // 'disconnected' es TRANSITORIO: WebRTC lo usa cuando deja de ver trafico un
          // momento y suele volver solo a 'connected'. Tratarlo como cierre marcaria el
          // enlace como inutilizable ante un microcorte de wifi.
          break
        default:
          break
      }
    })
  }

  /** Lado que INVITA: abre el canal y produce la oferta. */
  static async offer(options: PeerLinkOptions = {}): Promise<{ link: PeerLink; sdp: string }> {
    const link = new PeerLink(options)
    // El canal se crea ANTES de la oferta a proposito: si no, el SDP no incluye la
    // seccion `m=application` y el otro extremo no tiene con que negociar nada.
    link.attachChannel(link.pc.createDataChannel(CHANNEL_LABEL, { ordered: true }))
    const offer = await link.pc.createOffer()
    await link.pc.setLocalDescription(offer)
    await waitForGathering(link.pc, options.gatheringTimeoutMs ?? DEFAULT_GATHERING_TIMEOUT_MS)
    return { link, sdp: link.localSdp() }
  }

  /** Lado que SE UNE: recibe la oferta y produce la respuesta. */
  static async answer(
    offerSdp: string,
    options: PeerLinkOptions = {},
  ): Promise<{ link: PeerLink; sdp: string }> {
    const link = new PeerLink(options)
    // Quien responde no crea el canal: lo recibe. Hay que estar escuchando antes de
    // aplicar la descripcion remota o el evento puede llegar sin nadie al otro lado.
    link.pc.addEventListener('datachannel', (event) => {
      link.attachChannel(event.channel)
    })
    await link.pc.setRemoteDescription({ type: 'offer', sdp: offerSdp })
    const answer = await link.pc.createAnswer()
    await link.pc.setLocalDescription(answer)
    await waitForGathering(link.pc, options.gatheringTimeoutMs ?? DEFAULT_GATHERING_TIMEOUT_MS)
    // Quien responde NO arma temporizador: no tiene forma de saber cuando el otro pegara
    // su respuesta, y podrian pasar minutos. Un limite aqui seria inventarse un plazo que
    // no controla nadie. Se queda esperando y el estado del enlace lo dice en pantalla.
    return { link, sdp: link.localSdp() }
  }

  /** Lado que invita: cierra el apreton de manos con la respuesta del invitado. */
  async complete(answerSdp: string): Promise<void> {
    if (this.pc.signalingState === 'stable') {
      throw new TransportError('Este enlace ya estaba emparejado: no hace falta pegar nada mas.')
    }
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    // AHORA si: los dos extremos tienen ya lo que necesitan, asi que a partir de este
    // instante un plazo tiene sentido. Armarlo antes —al generar el codigo, como estaba—
    // media el tiempo que tarda una PERSONA en copiar y pegar, que no esta acotado.
    this.armConnectionTimeout()
  }

  private localSdp(): string {
    const sdp = this.pc.localDescription?.sdp
    if (sdp === undefined || sdp === '') {
      throw new TransportError('El navegador no ha generado ninguna descripcion local.')
    }
    return sdp
  }

  private attachChannel(channel: RTCDataChannel): void {
    this.channel = channel
    channel.addEventListener('open', () => {
      if (this.connectionTimer !== undefined) clearTimeout(this.connectionTimer)
      this.setState('open')
    })
    channel.addEventListener('close', () => this.setState('closed'))
    channel.addEventListener('error', () =>
      this.fail('El canal de datos se ha cerrado por un error.'),
    )
    channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      this.handleRaw(event.data)
    })
  }

  /**
   * Procesa un mensaje entrante.
   *
   * Todo el cuerpo va dentro de un try: esto corre dentro del manejador de eventos del
   * canal, y una excepcion aqui no la recoge nadie —se pierde en la consola y el mensaje
   * se queda sin procesar—. Es lo que ocultaba el fallo de la primera prueba manual: el
   * envio del PONG lanzaba y nadie se enteraba.
   */
  private handleRaw(data: unknown): void {
    try {
      if (typeof data !== 'string') return
      let parsed: unknown
      try {
        parsed = JSON.parse(data)
      } catch {
        // Un mensaje ilegible no debe tumbar el enlace: se descarta y se sigue.
        return
      }
      if (!isNetMessage(parsed)) return
      // El PONG se contesta aqui para que la medida de latencia no dependa de que alguien
      // mas arriba se acuerde de responder.
      if (parsed.type === 'PING') {
        this.send({ type: 'PONG', id: parsed.id })
        return
      }
      this.messages.emit(parsed)
    } catch (error) {
      this.errors.emit(
        error instanceof TransportError
          ? error
          : new TransportError('Fallo al procesar un mensaje entrante.'),
      )
    }
  }

  private armConnectionTimeout(): void {
    this.connectionTimer = setTimeout(() => {
      if (!this.fsm.isOpen) {
        this.fail(
          'Se ha agotado el tiempo de conexion. Comprueba que has pegado el codigo correcto ' +
            'y que ambos teneis conexion a internet.',
        )
      }
    }, this.options.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS)
  }

  private setState(next: LinkState): void {
    if (this.fsm.to(next)) this.states.emit(next)
  }

  private fail(message: string): void {
    if (this.connectionTimer !== undefined) clearTimeout(this.connectionTimer)
    this.errors.emit(new TransportError(message))
    this.setState('failed')
  }

  get currentState(): LinkState {
    return this.fsm.current
  }

  get isOpen(): boolean {
    return this.fsm.isOpen && this.channel?.readyState === 'open'
  }

  send(message: NetMessage): void {
    if (!this.isOpen || this.channel === null) {
      throw new TransportError('El enlace no esta abierto todavia.')
    }
    this.channel.send(JSON.stringify(message))
  }

  onMessage(handler: (message: NetMessage) => void): Unsubscribe {
    return this.messages.on(handler)
  }

  onStateChange(handler: (state: LinkState) => void): Unsubscribe {
    return this.states.on(handler)
  }

  onError(handler: (error: TransportError) => void): Unsubscribe {
    return this.errors.on(handler)
  }

  /** Mide el ida y vuelta en milisegundos. El otro extremo responde solo. */
  async ping(timeoutMs = 5000): Promise<number> {
    this.pingSeq += 1
    const id = this.pingSeq
    const started = performance.now()
    return new Promise<number>((resolve, reject) => {
      const off = this.messages.on((message) => {
        if (message.type === 'PONG' && message.id === id) {
          clearTimeout(timer)
          off()
          resolve(performance.now() - started)
        }
      })
      const timer = setTimeout(() => {
        off()
        reject(new TransportError('El otro par no ha respondido al ping.'))
      }, timeoutMs)
      this.send({ type: 'PING', id })
    })
  }

  close(): void {
    if (this.connectionTimer !== undefined) clearTimeout(this.connectionTimer)
    this.channel?.close()
    this.pc.close()
    this.setState('closed')
    this.messages.clear()
    this.states.clear()
    this.errors.clear()
  }
}
