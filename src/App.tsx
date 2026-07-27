// Raiz de la aplicacion. Durante la fase 0 lo unico que hay es la sala de conexion: el
// juego (paneles de Gremio y Cofradia + consola de eventos, GDD 11) no se empieza hasta
// que la red este terminada y probada, que es el orden elegido en el plan.
import { SessionPanel } from './ui/session/SessionPanel'

export default function App() {
  return (
    <main>
      <h1>Yunque Común</h1>
      <p className="nota">Fase 0 — la red. Todavía no hay juego que jugar.</p>
      <SessionPanel />
    </main>
  )
}
