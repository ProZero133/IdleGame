/**
 * Sala de conexion (T0.2.9): fundar un gremio o unirse a uno pegando codigos.
 *
 * Es andamiaje de la fase 0, no la interfaz del juego. Su unico objetivo es hacer posible
 * —y comoda— la prueba manual de T0.2.12: dos pestanas conectadas intercambiando un ping.
 * La conversacion real (paneles + consola de eventos, GDD 11) llega en T0.6.
 *
 * Se muestra a proposito la LONGITUD del codigo junto a cada caja: es el numero que decide
 * si la senalizacion manual es viable (T0.2.5), y tenerlo a la vista con SDP reales evita
 * enterarse tarde de que en cierto ordenador se dispara.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createCampaignId, getName, getPeerId, setName as storeName } from '../../net/identity'
import { PROTOCOL_VERSION, type NetMessage } from '../../net/protocol'
import { PeerLink, type LinkState } from '../../net/transport'
import { ManualSignalChannel } from '../../net/signal/manual'
import type { SignalEnvelope } from '../../net/signal/ISignalChannel'
import styles from './SessionPanel.module.css'

/** Paso del apreton de manos en el que esta la persona. */
type Phase =
  | 'idle'
  | 'creating' // generando la oferta
  | 'awaitingAnswer' // fundador: ya tiene codigo, espera la respuesta del invitado
  | 'joining' // generando la respuesta
  | 'awaitingConnection' // invitado: ya ha dado su respuesta, espera a que abra el canal
  | 'connected'

const ESTADO_LEGIBLE: Record<LinkState, string> = {
  new: 'sin iniciar',
  connecting: 'negociando…',
  open: 'conectado',
  closed: 'cerrado',
  failed: 'fallido',
}

export function SessionPanel() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [name, setName] = useState(getName())
  const [outgoingCode, setOutgoingCode] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [linkState, setLinkState] = useState<LinkState>('new')
  const [remoteName, setRemoteName] = useState<string | null>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const [log, setLog] = useState<readonly string[]>([])
  const [outgoingChat, setOutgoingChat] = useState('')

  const linkRef = useRef<PeerLink | null>(null)
  const signalRef = useRef<ManualSignalChannel | null>(null)
  const campaignRef = useRef<string | null>(null)

  const anotar = useCallback((linea: string) => {
    setLog((previo) => [...previo.slice(-80), linea])
  }, [])

  // Cerrar el enlace al desmontar: una conexion WebRTC viva tras cambiar de pantalla se
  // queda consumiendo recursos y recibiendo mensajes que ya no lee nadie.
  useEffect(() => {
    return () => {
      linkRef.current?.close()
      signalRef.current?.dispose()
    }
  }, [])

  const engancharEnlace = useCallback(
    (link: PeerLink) => {
      linkRef.current = link
      link.onStateChange((estado) => {
        setLinkState(estado)
        if (estado === 'open') {
          setPhase('connected')
          anotar('Canal abierto.')
          // Presentacion: es el primer mensaje de toda conexion (GDD 12.4).
          link.send({
            type: 'HELLO',
            peerId: getPeerId(),
            name: name === '' ? 'Sin nombre' : name,
            protocolVersion: PROTOCOL_VERSION,
            campaignId: campaignRef.current ?? '',
            tick: 0,
          })
        }
      })
      link.onError((fallo) => setError(fallo.message))
      link.onMessage((mensaje: NetMessage) => {
        switch (mensaje.type) {
          case 'HELLO':
            setRemoteName(mensaje.name)
            anotar(`Se ha presentado ${mensaje.name}.`)
            break
          case 'CHAT':
            anotar(`${remoteName ?? 'El otro par'}: ${mensaje.text}`)
            break
          default:
            break
        }
      })
    },
    [anotar, name, remoteName],
  )

  const fundar = useCallback(async () => {
    setError(null)
    setPhase('creating')
    try {
      const campaignId = createCampaignId()
      campaignRef.current = campaignId
      const signal = new ManualSignalChannel({ expectedCampaignId: campaignId })
      signalRef.current = signal
      signal.onPendingCode(({ code }) => setOutgoingCode(code))

      const { link, sdp } = await PeerLink.offer()
      engancharEnlace(link)
      signal.publish({
        kind: 'offer',
        from: getPeerId(),
        name: name === '' ? 'Sin nombre' : name,
        protocolVersion: PROTOCOL_VERSION,
        campaignId,
        sdp,
      })
      setPhase('awaitingAnswer')
      anotar('Invitacion generada. Pegasela a quien quieras invitar.')
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : String(fallo))
      setPhase('idle')
    }
  }, [anotar, engancharEnlace, name])

  const unirse = useCallback(async () => {
    setError(null)
    setPhase('joining')
    try {
      // Al unirse aun no se tiene campana: se adopta la del anfitrion, asi que el canal
      // se crea SIN campana esperada.
      const signal = new ManualSignalChannel()
      signalRef.current = signal
      let sobre: SignalEnvelope
      try {
        sobre = signal.receive(pasted)
      } catch (fallo) {
        setError(fallo instanceof Error ? fallo.message : String(fallo))
        setPhase('idle')
        return
      }
      if (sobre.kind !== 'offer') {
        setError(
          'Eso es una respuesta, no una invitacion. Pide el codigo de quien funda el gremio.',
        )
        setPhase('idle')
        return
      }
      campaignRef.current = sobre.campaignId
      signal.onPendingCode(({ code }) => setOutgoingCode(code))

      const { link, sdp } = await PeerLink.answer(sobre.sdp)
      engancharEnlace(link)
      signal.publish({
        kind: 'answer',
        from: getPeerId(),
        name: name === '' ? 'Sin nombre' : name,
        protocolVersion: PROTOCOL_VERSION,
        campaignId: sobre.campaignId,
        sdp,
      })
      setPasted('')
      setPhase('awaitingConnection')
      anotar(`Invitacion de ${sobre.name} aceptada. Devuelvele tu respuesta.`)
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : String(fallo))
      setPhase('idle')
    }
  }, [anotar, engancharEnlace, name, pasted])

  const completar = useCallback(async () => {
    setError(null)
    const link = linkRef.current
    const signal = signalRef.current
    if (link === null || signal === null) return
    try {
      const sobre = signal.receive(pasted)
      if (sobre.kind !== 'answer') {
        setError('Eso es otra invitacion, no una respuesta.')
        return
      }
      await link.complete(sobre.sdp)
      setRemoteName(sobre.name)
      setPasted('')
      anotar(`Respuesta de ${sobre.name} aceptada. Conectando…`)
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : String(fallo))
    }
  }, [anotar, pasted])

  const medirPing = useCallback(async () => {
    try {
      const ms = await linkRef.current?.ping()
      if (ms !== undefined) {
        setLatency(ms)
        anotar(`Ping: ${ms.toFixed(1)} ms`)
      }
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : String(fallo))
    }
  }, [anotar])

  const enviarChat = useCallback(() => {
    const texto = outgoingChat.trim()
    if (texto === '' || linkRef.current === null) return
    linkRef.current.send({ type: 'CHAT', from: getPeerId(), text: texto })
    anotar(`Tu: ${texto}`)
    setOutgoingChat('')
  }, [anotar, outgoingChat])

  const copiar = useCallback(async (texto: string) => {
    await navigator.clipboard.writeText(texto)
  }, [])

  return (
    <section className={styles.panel}>
      <div className={styles.row}>
        <label htmlFor="nombre">Tu nombre</label>
        <input
          id="nombre"
          className={styles.grow}
          value={name}
          placeholder="Ana"
          onChange={(e) => {
            setName(e.target.value)
            storeName(e.target.value)
          }}
        />
        <span className={styles.state}>enlace: {ESTADO_LEGIBLE[linkState]}</span>
      </div>

      {error !== null && <p className={styles.error}>{error}</p>}

      {phase === 'idle' && (
        <div className={styles.row}>
          <button type="button" onClick={() => void fundar()}>
            Fundar gremio
          </button>
          <span className={styles.hint}>o pega abajo una invitacion que te hayan mandado</span>
        </div>
      )}

      {(phase === 'awaitingAnswer' || phase === 'awaitingConnection') && outgoingCode !== null && (
        <div className={styles.step}>
          <p className={styles.stepTitle}>
            {phase === 'awaitingAnswer'
              ? '1. Mandale este codigo a quien invitas'
              : '1. Devuelvele este codigo a quien te invito'}
          </p>
          <textarea className={styles.code} readOnly value={outgoingCode} />
          <div className={styles.row}>
            <button type="button" onClick={() => void copiar(outgoingCode)}>
              Copiar
            </button>
            <span className={styles.hint}>
              {outgoingCode.length} caracteres (el limite de un mensaje de Discord son 2000)
            </span>
          </div>
        </div>
      )}

      {phase !== 'connected' && (
        <div className={styles.step}>
          <p className={styles.stepTitle}>
            {phase === 'awaitingAnswer' ? '2. Pega aqui su respuesta' : 'Pega aqui el codigo'}
          </p>
          <textarea
            className={styles.code}
            value={pasted}
            placeholder="YC1..."
            onChange={(e) => setPasted(e.target.value)}
          />
          <div className={styles.row}>
            {phase === 'awaitingAnswer' ? (
              <button type="button" onClick={() => void completar()}>
                Conectar
              </button>
            ) : (
              <button type="button" disabled={phase !== 'idle'} onClick={() => void unirse()}>
                Unirse al gremio
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'connected' && (
        <div className={styles.step}>
          <p className={styles.stepTitle}>Conectado con {remoteName ?? 'el otro par'}</p>
          <div className={styles.row}>
            <button type="button" onClick={() => void medirPing()}>
              Medir ping
            </button>
            {latency !== null && <span className={styles.state}>{latency.toFixed(1)} ms</span>}
          </div>
          <div className={styles.row}>
            <input
              className={styles.grow}
              value={outgoingChat}
              placeholder="Escribe algo…"
              onChange={(e) => setOutgoingChat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') enviarChat()
              }}
            />
            <button type="button" onClick={enviarChat}>
              Enviar
            </button>
          </div>
        </div>
      )}

      {log.length > 0 && <pre className={styles.log}>{log.join('\n')}</pre>}
    </section>
  )
}
