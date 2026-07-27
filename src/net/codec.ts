/**
 * Codec de los codigos de senalizacion: JSON -> deflate -> base64url, con prefijo de
 * version.
 *
 * Por que existe: la senalizacion es MANUAL (GDD 12.3), asi que el codigo lo copia y
 * pega una persona en Discord. Un SDP crudo son 1-2 KB de texto con saltos de linea que
 * cualquier cliente de chat destroza. Comprimido y en base64url queda una sola linea sin
 * caracteres problematicos, y el SDP comprime muy bien porque es repetitivo.
 *
 * base64url (y no base64 normal) para que no aparezcan `+` ni `/`, que se rompen al
 * viajar en una URL. Se quita tambien el relleno `=`, que se reconstruye al decodificar.
 */
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'

/**
 * Marca de formato. Sirve para dos cosas: detectar de inmediato que alguien ha pegado
 * cualquier otra cosa, y poder cambiar el formato en el futuro sin que un codigo viejo
 * se interprete como nuevo. **Si cambia el formato, sube el numero.**
 */
export const CODEC_PREFIX = 'YC1'

const SEPARATOR = '.'

/** Fallo al descodificar un codigo pegado por una persona. Siempre es recuperable. */
export class CodecError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CodecError'
  }
}

/**
 * Convierte bytes a base64url.
 *
 * Se trocea en bloques porque `String.fromCharCode(...bytes)` con un array grande
 * desborda la pila de llamadas: el limite de argumentos ronda las decenas de miles y un
 * SDP comprimido puede acercarse.
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlToBytes(text: string): Uint8Array {
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/')
  const missing = base64.length % 4
  const padded = missing === 0 ? base64 : base64 + '='.repeat(4 - missing)
  let binary: string
  try {
    binary = atob(padded)
  } catch {
    throw new CodecError('El codigo tiene caracteres invalidos. Copialo entero, sin espacios.')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Serializa un valor a un codigo de una sola linea, listo para pegar en un chat.
 *
 * Nivel 9 de compresion: el codigo se genera una vez y lo lee una persona, asi que
 * gastar unos milisegundos mas a cambio de un codigo mas corto siempre compensa.
 */
export function encode(value: unknown): string {
  const compressed = deflateSync(strToU8(JSON.stringify(value)), { level: 9 })
  return CODEC_PREFIX + SEPARATOR + bytesToBase64Url(compressed)
}

/**
 * Deshace `encode`. Lanza `CodecError` con un mensaje pensado para que lo lea el jugador,
 * no el programador: aqui el fallo casi siempre es humano (copiar de mas, de menos, o
 * pegar el codigo equivocado).
 */
export function decode(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed === '') {
    throw new CodecError('No has pegado nada.')
  }
  const separatorAt = trimmed.indexOf(SEPARATOR)
  if (separatorAt === -1) {
    throw new CodecError('Esto no parece un codigo de Yunque Comun.')
  }
  const prefix = trimmed.slice(0, separatorAt)
  if (prefix !== CODEC_PREFIX) {
    throw new CodecError(
      `El codigo es de otro formato (${prefix}) y esta version espera ${CODEC_PREFIX}. ` +
        'Puede que uno de los dos tenga el juego desactualizado.',
    )
  }
  const bytes = base64UrlToBytes(trimmed.slice(separatorAt + 1))
  let json: string
  try {
    json = strFromU8(inflateSync(bytes))
  } catch {
    throw new CodecError('El codigo esta incompleto o corrupto. Pide que te lo manden otra vez.')
  }
  try {
    return JSON.parse(json)
  } catch {
    throw new CodecError('El codigo se ha descomprimido pero su contenido no es valido.')
  }
}
