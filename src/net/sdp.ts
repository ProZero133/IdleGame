/**
 * Poda del SDP antes de comprimirlo (T0.2.4).
 *
 * DECISION IMPORTANTE: la poda deja un SDP **que sigue siendo un SDP valido**. Existe la
 * tentacion de comprimir mucho mas extrayendo solo los cuatro datos utiles (ufrag, pwd,
 * fingerprint, candidatos) y reconstruyendo el SDP en el otro lado, que es lo que hacen
 * varios proyectos de "webrtc sin servidor" para bajar a ~200 caracteres. No se hace,
 * por dos razones: reconstruir un SDP a mano se rompe en cuanto un navegador cambia algo,
 * y el fallo se manifiesta como "a veces no conecta", que es lo mas caro de depurar del
 * mundo. Aqui solo se quitan lineas que demostrablemente no aportan nada a un canal de
 * datos, y el grueso del ahorro lo pone deflate (el SDP es muy repetitivo).
 *
 * Si algun dia el codigo no cupiera en un mensaje de chat, la siguiente palanca NO es
 * podar mas, es dejar de exigir senalizacion manual (deuda D1 del plan).
 */

/** Lineas que se eliminan enteras por prefijo, con el motivo de cada una. */
const DROPPABLE_PREFIXES: readonly { prefix: string; why: string }[] = [
  // Negociacion de extensiones de cabecera RTP. En una conexion que solo lleva un canal
  // de datos no hay RTP en absoluto.
  { prefix: 'a=extmap-allow-mixed', why: 'extensiones RTP, no hay medios' },
  // Semantica de MediaStream: solo importa si se negocian pistas de audio o video.
  { prefix: 'a=msid-semantic', why: 'semantica de MediaStream, no hay medios' },
  // Anunciamos trickle pero no lo usamos: la senalizacion manual obliga a esperar a
  // tener todos los candidatos y mandar un unico bloque (T0.2.7).
  { prefix: 'a=ice-options:trickle', why: 'no se hace trickle con senalizacion manual' },
]

/**
 * Candidatos TCP de marcador: los navegadores emiten `tcptype active` con puerto 9, que
 * no es un puerto real sino "el que sea". Solo sirven si el otro extremo ofrece un
 * candidato TCP pasivo, cosa que no ocurre entre dos navegadores. Ocupan bastante y no
 * conectan nunca, asi que fuera.
 */
function isPlaceholderTcpCandidate(line: string): boolean {
  return line.startsWith('a=candidate:') && line.includes('tcptype active')
}

/** Lineas sin las cuales el SDP deja de servir. Las usa el contrato de tests. */
export const ESSENTIAL_SDP_PREFIXES: readonly string[] = [
  'v=',
  'o=',
  's=',
  't=',
  'm=application',
  'a=ice-ufrag:',
  'a=ice-pwd:',
  'a=fingerprint:',
  'a=setup:',
  'a=mid:',
  'a=sctp-port:',
]

export interface PruneResult {
  readonly sdp: string
  readonly removedLines: number
  readonly originalBytes: number
  readonly prunedBytes: number
}

/**
 * Quita del SDP lo que no aporta nada a un canal de datos.
 *
 * Normaliza tambien los finales de linea a `\n`: un SDP con `\r\n` que pasa por un chat
 * puede volver con los retornos de carro sueltos, y comprimirlos es tirar bytes.
 * `setRemoteDescription` acepta `\n` sin problema.
 */
export function pruneSdp(sdp: string): PruneResult {
  const originalLines = sdp.replaceAll('\r\n', '\n').split('\n')
  const kept: string[] = []
  for (const line of originalLines) {
    if (line === '') continue
    if (isPlaceholderTcpCandidate(line)) continue
    if (DROPPABLE_PREFIXES.some(({ prefix }) => line.startsWith(prefix))) continue
    kept.push(line)
  }
  // El SDP termina en salto de linea por convencion; algunos analizadores lo esperan.
  const result = kept.join('\n') + '\n'
  return {
    sdp: result,
    removedLines: originalLines.filter((l) => l !== '').length - kept.length,
    originalBytes: sdp.length,
    prunedBytes: result.length,
  }
}

/**
 * Comprueba que un SDP conserva todo lo imprescindible. No sustituye a conectar de
 * verdad, pero pilla al vuelo una poda demasiado agresiva.
 */
export function hasEssentialSdpLines(sdp: string): boolean {
  const lines = sdp.split('\n')
  return ESSENTIAL_SDP_PREFIXES.every((prefix) => lines.some((line) => line.startsWith(prefix)))
}

/** Cuenta los candidatos ICE que quedan. Cero candidatos = conexion imposible. */
export function countCandidates(sdp: string): number {
  return sdp.split('\n').filter((line) => line.startsWith('a=candidate:')).length
}
