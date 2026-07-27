import { describe, expect, it } from 'vitest'
import { LinkStateMachine } from '../../src/net/link-state'

describe('maquina de estados del enlace', () => {
  it('recorre el camino normal', () => {
    const m = new LinkStateMachine()
    expect(m.current).toBe('new')
    expect(m.to('connecting')).toBe(true)
    expect(m.to('open')).toBe(true)
    expect(m.isOpen).toBe(true)
  })

  it('no avisa dos veces del mismo estado', () => {
    const m = new LinkStateMachine()
    expect(m.to('connecting')).toBe(true)
    expect(m.to('connecting')).toBe(false)
  })

  /**
   * REGRESION de la primera prueba manual (2026-07-27).
   *
   * El temporizador de conexion daba el enlace por fallido a los 30 s, pero con
   * senalizacion manual una persona tarda mas que eso en copiar y pegar el codigo. Cuando
   * el canal se abria de verdad, el estado seguia siendo `failed` para siempre: la pestana
   * podia RECIBIR mensajes pero no enviarlos, asi que respondia al saludo y al chat pero
   * nunca devolvia el PONG. El sintoma era "el otro par no ha respondido al ping".
   */
  it('un fallo NO impide que el enlace se abra despues', () => {
    const m = new LinkStateMachine()
    m.to('connecting')
    expect(m.to('failed')).toBe(true)
    expect(m.to('open')).toBe(true)
    expect(m.isOpen).toBe(true)
  })

  it('tras un fallo no se vuelve a estados intermedios', () => {
    const m = new LinkStateMachine()
    m.to('failed')
    expect(m.to('connecting')).toBe(false)
    expect(m.current).toBe('failed')
  })

  it('un fallo si puede acabar en cerrado', () => {
    const m = new LinkStateMachine()
    m.to('failed')
    expect(m.to('closed')).toBe(true)
  })

  it('cerrado es terminal: un enlace cerrado no resucita', () => {
    const m = new LinkStateMachine()
    m.to('open')
    m.to('closed')
    expect(m.to('open')).toBe(false)
    expect(m.to('connecting')).toBe(false)
    expect(m.current).toBe('closed')
  })
})
