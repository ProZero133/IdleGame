# Yunque Común

Idle cooperativo de navegador para **3–6 jugadores**, multijugador **P2P por WebRTC** y sin
servidor de juego. Un gremio de artesanos sostiene un taller común mientras la Herrumbre
avanza sobre la región.

La premisa: **nada de lo que produces te sirve a ti**. Lo que extraes solo lo puede refinar
otro, la moneda con la que subes de nivel solo la genera el trabajo ajeno, y el reloj del
mundo solo corre mientras alguien está conectado. Con menos de tres personas el circuito no
cierra.

- **Diseño completo:** [`GDD.md`](GDD.md)
- **Estado:** fase 0 (la red) en curso. **Todavía no hay juego**: la interfaz es un marcador
  de posición hasta que la capa P2P esté terminada.

## Requisitos

Node 24 o superior (el proyecto se desarrolla con 24.12).

## Arranque

```bash
npm install
npm run dev
```

La página queda en **http://localhost:5173/IdleGame/**. Ese prefijo es intencionado: es el
mismo `base` con el que se sirve en GitHub Pages, y mantenerlo también en desarrollo evita
descubrir una ruta rota el día del despliegue. Está declarado en `vite.config.ts` y va
atado al nombre del repositorio.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo con recarga en caliente |
| `npm run build` | comprueba tipos y genera `dist/` |
| `npm run preview` | sirve `dist/` como lo hará GitHub Pages |
| `npm run typecheck` | solo tipos, en los tres proyectos (app, node, tests) |
| `npm test` | tests con Vitest, una pasada |
| `npm run test:watch` | tests en modo continuo |
| `npm run lint` | **la puerta única**: `oxlint` + `prettier --check` |
| `npm run lint:fix` | arregla lo que se pueda arreglar solo |
| `npm run format` | reformatea con Prettier |

`npm run lint` es lo que ejecuta el CI, así que si pasa en local pasa en GitHub.

## Estructura

```
src/
  core/       simulacion PURA: sin DOM, sin React, sin reloj propio
    rules/    cadena, fervor, mercado, herrumbre, ritos
  net/        WebRTC, protocolo, anfitrion autoritativo
    signal/   senalizacion (hoy manual, la costura permite cambiarla)
  persist/    IndexedDB y exportar/importar partida
  ui/         React
    panels/ console/ session/
tests/
  core/ net/
```

## Reglas del repositorio

1. **`src/core/` es puro.** Nada de `Date.now()`, `Math.random()`, `new Date()`, DOM,
   `localStorage` ni `fetch`. No es una convención de buena voluntad: `oxlint` lo impide
   con un error, y el mensaje explica por qué. El tiempo entra como parámetro y el azar
   sale de un PRNG con semilla, porque dos pares con el mismo estado tienen que llegar al
   mismo resultado.
2. **Los tres `tsconfig` heredan el rigor de `tsconfig.base.json`.** Si añades una
   configuración nueva, que extienda de ahí en vez de copiar las banderas.
3. **Las constantes de balance viven todas en `src/core/balance.ts`.** Ninguna cifra mágica
   repartida por las reglas.
4. **Los `.md` no los toca Prettier** (ver `.prettierignore`): están formateados a mano.

## Despliegue

Cada push a `main` construye y publica en GitHub Pages
(`.github/workflows/deploy.yml`). **Requiere una configuración manual, una sola vez:**
en *Settings → Pages* del repositorio, poner *Source: GitHub Actions*.
