/**
 * Mensajes que viajan por el canal de datos entre pares (GDD 12.4).
 *
 * Regla de oro del modelo de red: los clientes envian INTENCIONES, nunca estado. El
 * anfitrion es el unico que ejecuta el reducer y el unico que emite EVENT y SNAPSHOT
 * (GDD 12.2). Si algun dia un cliente pudiera mandar estado, cualquiera podria
 * escribirse mil de oro sin tocar el codigo.
 */

/** Identificador estable de un par dentro de una campana. */
export type PeerId = string

/** Identificador de la partida compartida. Dos campanas distintas nunca se mezclan. */
export type CampaignId = string

/**
 * Version del protocolo. **Subir esto cada vez que cambie la FORMA de un mensaje.**
 * Se comprueba en el HELLO y una discrepancia rechaza la conexion con un mensaje claro
 * en vez de dejar que dos versiones incompatibles se corrompan el estado mutuamente.
 */
export const PROTOCOL_VERSION = 1

/** Presentacion: el primer mensaje de toda conexion. */
export interface HelloMessage {
  readonly type: 'HELLO'
  readonly peerId: PeerId
  readonly name: string
  readonly protocolVersion: number
  readonly campaignId: CampaignId
  /** Tick de gremio del estado que tiene este par. Decide quien manda al reunirse. */
  readonly tick: number
}

/**
 * Retransmision de senalizacion (T0.3). Solo el PRIMER apreton de manos es manual: una
 * vez hay un canal abierto, ese par presenta a los demas reenviando estos sobres.
 */
export interface SignalRelayMessage {
  readonly type: 'SIGNAL_RELAY'
  readonly toPeerId: PeerId
  /** Carga opaca: quien retransmite no necesita entender lo que lleva dentro. */
  readonly payload: string
}

/** Intencion de un jugador. Cliente -> anfitrion. El anfitrion la valida o la rechaza. */
export interface IntentMessage {
  readonly type: 'INTENT'
  /** Numero de secuencia por par: hace la intencion idempotente ante reenvios. */
  readonly seq: number
  // TODO(T0.4.4/T1.1.5): tipar como la union `Action` del reducer cuando exista.
  readonly action: unknown
}

/** Eventos ya aplicados. Anfitrion -> todos. */
export interface EventMessage {
  readonly type: 'EVENT'
  readonly tick: number
  readonly events: readonly unknown[]
}

/** Estado completo. Anfitrion -> todos, al entrar alguien y cada N ticks. */
export interface SnapshotMessage {
  readonly type: 'SNAPSHOT'
  readonly tick: number
  // TODO(T0.5.1): tipar como `GuildState` cuando exista el nucleo.
  readonly state: unknown
  /** Hash estable del estado: permite detectar divergencia sin comparar todo. */
  readonly hash: string
}

/** Charla entre jugadores. Es el alma social del juego, no un extra (GDD 11). */
export interface ChatMessage {
  readonly type: 'CHAT'
  readonly from: PeerId
  readonly text: string
}

/** Sonda de latencia y presencia. El `id` empareja cada PONG con su PING. */
export interface PingMessage {
  readonly type: 'PING'
  readonly id: number
}

export interface PongMessage {
  readonly type: 'PONG'
  readonly id: number
}

export type NetMessage =
  | HelloMessage
  | SignalRelayMessage
  | IntentMessage
  | EventMessage
  | SnapshotMessage
  | ChatMessage
  | PingMessage
  | PongMessage

/**
 * Comprueba que un valor recibido por la red tiene pinta de mensaje. NO valida el
 * contenido de cada variante: solo evita que un `JSON.parse` de basura llegue al
 * `switch` y reviente por un camino raro. La validacion de fondo la hace el anfitrion.
 */
export function isNetMessage(value: unknown): value is NetMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  )
}
