/**
 * Emisor de eventos minimo y tipado. Lo comparten el transporte y la senalizacion para
 * no repetir cuatro veces el mismo patron de suscripcion.
 *
 * No se usa `EventTarget` del navegador a proposito: obligaria a envolver cada valor en
 * un `CustomEvent` y a castear `detail`, perdiendo los tipos justo donde mas importan.
 */

/** Funcion de baja. Llamarla quita el manejador. */
export type Unsubscribe = () => void

export class Emitter<T> {
  private readonly handlers = new Set<(value: T) => void>()

  on(handler: (value: T) => void): Unsubscribe {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  /**
   * Se itera sobre una COPIA porque es normal que un manejador se de de baja a si mismo
   * al recibir el evento que esperaba (por ejemplo el que espera la respuesta a un PING);
   * mutar el Set mientras se recorre se salta manejadores de forma silenciosa.
   */
  emit(value: T): void {
    for (const handler of [...this.handlers]) {
      handler(value)
    }
  }

  clear(): void {
    this.handlers.clear()
  }

  get size(): number {
    return this.handlers.size
  }
}
