// Marcador de posicion. La interfaz de verdad (paneles de Gremio y Cofradia + consola de
// eventos, GDD 11) llega en T0.6.2 y T1.6.x. Lo unico que este componente tiene que
// cumplir hoy es el criterio de aceptacion del bloque 0.1: una pagina con el titulo del
// juego que demuestre que la cadena Vite -> React -> navegador esta montada.
export default function App() {
  return (
    <main>
      <h1>Yunque Común</h1>
      <p>Idle cooperativo para 3-6 jugadores.</p>
      <p className="nota">Sin red todavía. Fase 0 en curso.</p>
    </main>
  )
}
