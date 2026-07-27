/**
 * Maquina de estados de un enlace, separada del transporte para poder probarla.
 *
 * Vive aparte de `transport.ts` por una razon concreta: alli esta enredada con
 * `RTCPeerConnection`, que no existe en Node, asi que ningun test la alcanzaba. La primera
 * prueba manual (2026-07-27) descubrio justo ahi un fallo que un test de tres lineas
 * habria pillado. Ahora las reglas son puras y estan fijadas por contrato.
 */

/** Estado del enlace en terminos del juego, no de la maquinaria de WebRTC. */
export type LinkState = 'new' | 'connecting' | 'open' | 'closed' | 'failed'

export class LinkStateMachine {
  private state: LinkState = 'new'

  get current(): LinkState {
    return this.state
  }

  get isOpen(): boolean {
    return this.state === 'open'
  }

  /**
   * Intenta pasar al estado indicado. Devuelve `true` si hubo cambio, para que quien
   * llama sepa si debe avisar a sus suscriptores.
   *
   * Las reglas, y por que son asi:
   *
   * - **Repetir el estado actual no es un cambio.** Evita avisar dos veces de lo mismo.
   * - **`closed` es terminal.** Lo provoca cerrar a proposito o que el otro par se vaya;
   *   un enlace cerrado no resucita, se crea otro.
   * - **`failed` NO es terminal.** Este era el fallo: un temporizador daba el enlace por
   *   fallido mientras la persona seguia copiando el codigo, y despues bloqueaba el
   *   `open` legitimo. Si el canal acaba abriendose, manda la realidad y no el
   *   diagnostico anterior. Un fallo solo cierra la puerta a estados intermedios
   *   (`connecting`), que ya no aportan nada.
   */
  to(next: LinkState): boolean {
    if (this.state === next) return false
    if (this.state === 'closed') return false
    if (this.state === 'failed' && next !== 'open' && next !== 'closed') return false
    this.state = next
    return true
  }
}
