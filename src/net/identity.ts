/**
 * Identidad local del jugador: un identificador estable y un nombre editable.
 *
 * No hay cuentas ni servidor de autenticacion, y no los va a haber: el juego es estatico y
 * P2P. La identidad es simplemente un UUID guardado en este navegador. Eso significa que
 * quien borre los datos del sitio aparecera como otra persona, y es una consecuencia
 * asumida a cambio de no montar infraestructura.
 */
import type { PeerId } from './protocol'

const PEER_ID_KEY = 'yunque.peerId'
const NAME_KEY = 'yunque.name'

/**
 * Respaldo en memoria para cuando `localStorage` no esta disponible: navegacion privada
 * estricta, cookies bloqueadas o un iframe sin permisos. Sin esto, el juego reventaria al
 * arrancar en vez de funcionar durante la sesion y olvidarse al cerrar.
 */
const memory = new Map<string, string>()

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    memory.set(key, value)
  }
}

/** Identificador de este navegador. Se genera la primera vez y ya no cambia. */
export function getPeerId(): PeerId {
  const existing = readStored(PEER_ID_KEY)
  if (existing !== null && existing !== '') return existing
  const created = crypto.randomUUID()
  writeStored(PEER_ID_KEY, created)
  return created
}

/** Nombre visible. Vacio hasta que el jugador escriba uno. */
export function getName(): string {
  return readStored(NAME_KEY) ?? ''
}

export function setName(name: string): void {
  writeStored(NAME_KEY, name.trim().slice(0, 32))
}

/**
 * Identificador de una campana nueva. Lo genera quien funda el gremio y lo adoptan los
 * demas al aceptar la invitacion; a partir de ahi sirve para no mezclar dos partidas
 * distintas (GDD 12.5).
 */
export function createCampaignId(): string {
  return crypto.randomUUID()
}
