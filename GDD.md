# Yunque Común — Documento de Diseño

> **Estado:** diseño inicial, pre-implementación · **Fecha:** 2026-07-26
> **Género:** idle cooperativo de navegador, multijugador P2P (WebRTC), 3–6 jugadores
> **Referente:** el bot de Discord *Nekotina* (economía por cooldowns) llevado a un juego cooperativo
> **Título de trabajo:** *Yunque Común* (alternativas en §17)

---

## Índice

- [0. Resumen en una página](#0-resumen-en-una-página)
- [1. Decisiones tomadas](#1-decisiones-tomadas)
- [2. El candado: por qué es inviable con menos de 3](#2-el-candado-por-qué-es-inviable-con-menos-de-3)
- [3. Ficción y tono](#3-ficción-y-tono)
- [4. Los dos relojes](#4-los-dos-relojes)
- [5. El bucle de juego](#5-el-bucle-de-juego)
- [6. Economía](#6-economía)
- [7. Roles](#7-roles)
- [8. Presión: desgaste y la Herrumbre](#8-presión-desgaste-y-la-herrumbre)
- [9. Ritos](#9-ritos)
- [10. Campaña](#10-campaña)
- [11. Interfaz](#11-interfaz)
- [12. Arquitectura técnica](#12-arquitectura-técnica)
- [13. Riesgos conocidos](#13-riesgos-conocidos)
- [14. Hoja de ruta](#14-hoja-de-ruta)
- [15. Números de primera pasada](#15-números-de-primera-pasada)
- [16. Fuera de alcance](#16-fuera-de-alcance)
- [17. Nombres alternativos](#17-nombres-alternativos)
- [18. Glosario](#18-glosario)

---

## 0. Resumen en una página

Un gremio de artesanos de fantasía sostiene un taller común mientras **la Herrumbre** —una corrupción que devora metal, madera y voluntad— avanza sobre la región. El juego se juega en **visitas cortas** desde el navegador (entras, gastas tus acciones, te vas), como se juega a un bot de Discord.

La diferencia con cualquier otro idle: **absolutamente nada de lo que haces te sirve a ti**.

- Lo que extraes solo lo puede refinar **otro**; lo que refinas solo lo puede forjar **otro**.
- La moneda con la que subes de nivel (**Fervor**) no la generas tú: te la genera el trabajo de tus compañeros, y la tuya se la llevan ellos. Si eres el único activo, tu Fervor **se pierde**.
- El mundo solo avanza mientras **alguien** está conectado, y avanza más rápido cuantos más haya. Estar dentro es, en sí mismo, un acto de colaboración: cebas el reloj para todo el gremio.
- Los **Ritos** —los hitos que hacen avanzar la campaña— exigen componentes que solo pueden producir tres oficios distintos, y en sus formas tardías exigen gente conectada a la vez.

Con 1 jugador el gremio se congela. Con 2 es un trueque estéril que no cierra la cadena. **A partir de 3 el circuito cierra y el juego arranca.** Seis es el techo cómodo: los tres eslabones cubiertos más los tres oficios de apoyo.

Es 100 % cooperativo —nadie puede perjudicar a nadie— pero no es blando: hay precios, escasez, desgaste y una amenaza que gana si el gremio se duerme. La partida **termina**: cinco capítulos y un asedio final contra la Herrumbre.

Técnicamente es un juego estático servido desde un CDN, **sin servidor de juego**: los navegadores hablan entre sí por WebRTC, uno de ellos hace de anfitrión autoritativo y el estado vive en el disco de todos.

---

## 1. Decisiones tomadas

Registro de lo acordado en las rondas de preguntas. Cambiar una de estas filas obliga a revisar el documento entero.

| Aspecto | Decisión |
|---|---|
| Candado colaborativo | **Los cuatro a la vez**: economía circular + roles exclusivos en cadena + ritos sincronizados + pool compartido con decadencia |
| Progreso offline | El mundo **solo avanza si hay ≥1 par conectado**; sin nadie dentro, el tiempo se congela |
| Ritmo | **Visitas cortas tipo bot**: acciones con cooldown, sin producción continua "gratis" |
| Reloj | **Híbrido**: cooldowns personales en tiempo real, mundo en tiempo de gremio |
| Tamaño del grupo | **3–6** (célula de amigos, sala privada) |
| Ambientación | **Gremio de fantasía** (taberna, forja, oficios) |
| Asignación de roles | **Emergente por progresión**: sin clases explícitas, te especializas por lo que haces |
| Eslabón ausente | **Nada lo suple: se para.** Sin NPCs, sin suplencias, sin colas de rescate |
| Fricción entre jugadores | **100 % cooperativa** + **mercado con precios** (contra caravanas NPC, nunca entre jugadores) |
| Decadencia | **Desgaste/mantenimiento** + **amenaza creciente** |
| Ritos | **Los cuatro tipos**: contrato, componentes, expedición en vivo y defensa |
| Eslabones | **3 núcleo bloqueantes + 3 apoyos opcionales** no bloqueantes |
| Meta-progresión | **Campaña con final**: la partida termina al derrotar la Herrumbre |
| Autoridad de red | **Anfitrión autoritativo rotativo** + snapshot replicado a todos |
| Señalización | **Manual** (copiar y pegar el código), mitigada con retransmisión entre pares |
| Respaldo del guardado | **Exportar/importar fichero** |
| Interfaz | **Híbrida**: paneles + consola, con log de eventos compartido obligatorio |
| Framework | **React + Vite + TypeScript** |
| Orden de construcción | **Red primero, completa** |

---

## 2. El candado: por qué es inviable con menos de 3

Los cuatro mecanismos elegidos no son cuatro reglas sueltas: son cuatro cierres sobre la misma puerta. Cada uno bloquea una vía distinta de jugar solo.

### 2.1 La Ley del Sello — economía circular

**Regla:** toda obra sale marcada con el sello de quien la hizo, y **la Cofradía prohíbe a un maestro beneficiarse de su propia marca**.

Esto se traduce en dos prohibiciones duras:

1. **Material:** no puedes usar como entrada nada que lleve tu sello. La mena que extraes no la puedes fundir tú, ni aunque tuvieras el oficio.
2. **Fervor:** cada acción productiva genera **Fervor** —la moneda de tu progresión personal— pero el Fervor **no lo cobras tú**. Se reparte a partes iguales entre los **demás** miembros con actividad reciente. Si no hay nadie más activo, ese Fervor **se pierde para siempre**.

> Esta segunda regla es el candado maestro, y es la que hace que jugar solo no sea *lento* sino **imposible**: en solitario tu barra de progresión personal literalmente nunca sube.

Con 2 jugadores el reparto existe pero es un espejo: A alimenta a B y B a A, un bucle cerrado y aburrido que además deja huecos en la cadena (§2.2). Con 3 el reparto se convierte en un circuito con rotación, y a partir de ahí el sistema respira.

### 2.2 El Juramento — roles exclusivos en cadena

La cadena núcleo tiene **exactamente tres eslabones bloqueantes**:

```
   EXTRAER  ──────▶  REFINAR  ──────▶  FORJAR
   (Minero)         (Fundidor)        (Herrero)
```

Nadie puede ocupar dos eslabones núcleo. La especialización no se elige de un menú: **emerge**. Todo el mundo empieza como **Aprendiz**, capaz de las tres acciones a rendimiento penoso; cuando acumulas suficiente maestría en un eslabón, el gremio te reconoce y **juras**. El Juramento multiplica tu rendimiento en ese eslabón por diez y **te cierra los otros dos para siempre** (salvo Renegar, §7.4).

**Si el Fundidor no entra, nadie funde. Punto.** No hay aprendices NPC, ni suplencia al 30 %, ni colas de rescate: fue una decisión explícita. El único amortiguador es el Depósito común, que guarda lo que ya se produjo, y las órdenes ya cargadas en los talleres, que siguen procesándose. Eso da margen de horas, no de días.

### 2.3 El Tiempo de Gremio — pool compartido

El mundo tiene su propio reloj que **solo corre mientras haya al menos un par conectado**, y corre más rápido cuanta más gente hay dentro:

```
velocidad = 1 + 0,5 × (conectados − 1)      (tope ×3 con 5 conectados)
```

Consecuencia: **conectarse es en sí mismo un acto colaborativo**. Aunque entres solo a mirar el chat, estás haciendo avanzar las órdenes, los contratos y las caravanas de todos. Y cuando coincidís tres, todo el gremio rinde el doble.

Su reverso es la decadencia (§8): el desgaste y la Herrumbre también corren en tiempo de gremio. Un gremio abandonado no se pudre —se congela intacto—, pero un gremio a medio gas gasta su tiempo colectivo en pagar mantenimiento en vez de en progresar.

### 2.4 Los Ritos — sincronía

Los hitos que hacen avanzar la campaña exigen firmas y componentes de **oficios distintos**, y en sus formas tardías exigen presencia simultánea. Detalle en §9.

### Resumen del candado

| Jugadores | Qué pasa |
|---|---|
| 1 | El Fervor se evapora. La cadena se corta en el primer eslabón. El reloj corre a ×1 y solo para pagar mantenimiento. **No hay progresión posible.** |
| 2 | Fervor en espejo. Un eslabón de tres siempre vacío: se produce materia que nadie puede procesar. Ningún Rito de componentes es completable. |
| 3 | **Mínimo viable.** Cadena completa, circuito de Fervor real, Ritos de contrato y componentes accesibles. Sin apoyos: lento, caro y frágil. |
| 4–6 | Cómodo. Se duplican eslabones saturados y se cubren los apoyos: mercader, escriba y guardián multiplican al núcleo. |
| 7+ | Fuera de alcance por ahora (la malla y el reparto de Fervor se diluyen). |

---

## 3. Ficción y tono

La **Cofradía del Yunque Común** es un gremio menor en una región que se está oxidando. La **Herrumbre** no es un ejército: es una marea lenta que corroe herramientas, pudre vigas y apaga hogares. Nadie la combate con espadas; se combate manteniendo cosas vivas —una fragua encendida, un contrato cumplido, un rito completado a tiempo.

**Tono:** cálido y de taller, no épico. El gremio es un sitio al que vuelves, no un campo de batalla. El chat de eventos habla como un tablón de anuncios de taberna:

```
⛏  Beto trajo 200 de mena de hierro. Lleva tres días sin fallar un turno.
🔥  La fragua de Ana quedó sin carbón a media colada.
⚠  La Herrumbre alcanzó el nivel 4. El almacén huele a metal viejo.
✦  Cris juró como Herrero. El gremio bebe a su salud.
```

**Referencias de sensación:** el ritmo social de Nekotina, la interdependencia de *Deep Rock Galactic*, la paciencia de *Melvor Idle*, la calidez de *Stardew Valley*.

---

## 4. Los dos relojes

Esta es la pieza más delicada del diseño. Hay **dos** relojes y no miden lo mismo.

| | **Tiempo real** (reloj de pared) | **Tiempo de Gremio** |
|---|---|---|
| Corre… | siempre | solo con ≥1 par conectado, a velocidad ×1–×3 |
| Gobierna | recarga de **Vigor** (tus acciones) | todo lo demás |
| Qué avanza | tus cargas de acción | órdenes de taller, desgaste, mantenimiento, la Herrumbre, progreso de contratos, caducidad de componentes, caravanas |
| Se puede falsificar | no (lo concede el anfitrión) | no (lo cuenta el anfitrión y va firmado en el snapshot) |

**Por qué así:** que el Vigor recargue en tiempo real significa que nunca te castiga dormir —entras y siempre tienes algo que hacer, como en un bot de Discord—. Que el mundo corra en tiempo de gremio significa que el progreso colectivo depende de que la gente aparezca. Es exactamente la tensión que buscamos: *tú* estás siempre listo, el *gremio* solo avanza si os presentáis.

> **Nota de implementación:** el núcleo de simulación nunca lee `Date.now()`. El tiempo entra como parámetro (`realElapsedMs`, `guildElapsedMs`) desde la capa de red, y quien lo produce es el anfitrión. Ver §12.6.

---

## 5. El bucle de juego

### 5.1 Vigor — la moneda de acción

Cada jugador tiene **Vigor**: cargas de acción que se acumulan en tiempo real.

- Máximo **6 cargas**, **+1 cada 30 minutos reales** (lleno en 3 h).
- Cada acción de tu eslabón cuesta **1 carga**.
- El tope existe para que compense entrar 3 veces al día en lugar de una: si entras cada 3 h, no desperdicias nada.

El Vigor **no** se comparte ni se regala: es lo único verdaderamente tuyo del juego.

### 5.2 Órdenes y talleres — dónde se juntan los dos relojes

Aquí está el corazón del bucle, y lo que reconcilia "visitas cortas" con "el mundo solo late si hay alguien":

1. **Gastas Vigor para cargar una orden** en un taller. Es un acto instantáneo: "Fundir 200 de mena → lingotes".
2. **La orden se procesa en Tiempo de Gremio.** Tarda, y solo avanza mientras alguien esté conectado.
3. Al terminar, el producto cae en el **Depósito común** marcado con tu sello — y por tanto **inútil para ti**.

De modo que una visita corta es: *veo qué pasó, gasto mis cargas cargando órdenes, firmo lo que haya que firmar, y me voy*. Y el trabajo que dejé cargado avanza gracias a que otros se conectan. **Tú aportas decisiones; el gremio aporta tiempo.**

### 5.3 La visita de cuatro minutos

```
1. ENTRAS         → el gremio despierta; el reloj de gremio arranca
2. RESUMEN        → "mientras no estabas: 4 h de gremio, Ana refinó 200,
                     la Herrumbre subió a 4, caducó un componente"
3. GASTAS VIGOR   → 3–6 acciones/órdenes de tu eslabón
4. FIRMAS         → aportas a contratos y ritos pendientes
5. MERCADO        → vendes excedente / compras lo que ahoga al gremio
6. HABLAS         → dejas recado en el log ("necesito carbón, ya")
7. SALES          → si eras el último, el gremio vuelve a dormirse
```

---

## 6. Economía

### 6.1 Tres monedas, tres propósitos

| Moneda | De quién es | De dónde sale | En qué se gasta |
|---|---|---|---|
| **Materiales** | del gremio (Depósito común) | de la cadena de producción | recetas, mantenimiento, ritos |
| **Oro** | del gremio | de vender a caravanas y de contratos | mejoras de taller, compras externas de emergencia |
| **Fervor** | **personal** | **solo del trabajo ajeno** | tu maestría, tus talentos, tu rango |

No hay inventario personal de materiales más allá de un zurrón simbólico: **todo va al Depósito**. El pool compartido es literal.

### 6.2 La cadena de producción

| Eslabón | Oficio | Entradas | Salidas |
|---|---|---|---|
| 1. Extraer | **Minero** | — (el entorno, gastando Vigor) | Mena de hierro, Leña, Fibra, Piedra |
| 2. Refinar | **Fundidor** | Mena, Leña, Fibra | Lingote, Carbón, Hilo, Vidrio |
| 3. Forjar | **Herrero** | Lingote, Carbón, Hilo | Herramientas, Piezas, Equipo, **Componentes de rito** |

Reglas duras de la cadena:

- **Exclusividad:** un Maestro solo opera su eslabón.
- **Ley del Sello:** ninguna entrada puede llevar tu propio sello.
- **Sin atajos:** el Mercado nunca vende productos de eslabón 3, y los de eslabón 2 los vende a precio de castigo. Comprar jamás sustituye a tener un compañero.

### 6.3 El Depósito del Gremio

Almacén compartido, con capacidad limitada y ampliable con Oro. Es el único amortiguador ante ausencias, y su límite es deliberado: **acumular no es una estrategia**, porque el desgaste y la Herrumbre cobran su parte del stock (§8).

### 6.4 El Mercado y las caravanas

El "comercio con precios" **no es entre jugadores** —eso rompería la cooperación pura—. Es contra **caravanas NPC** que visitan el gremio:

- **Precios dinámicos:** lo que el gremio vende mucho se abarata (castiga el monocultivo); lo que compra mucho se encarece.
- **Comisión:** **30 %** sin Mercader en el gremio, **5 %** con él. Ese salto es la razón de ser del oficio de apoyo.
- **Encargos de caravana:** pedidos con fecha en tiempo de gremio; buena recompensa en Oro, penalización de reputación si caducan.
- **Techo deliberado:** el Mercado nunca puede cerrar el hueco de un eslabón ausente. Es un desahogo, no un sustituto.

---

## 7. Roles

### 7.1 Aprendiz → Juramento → Maestro

| Fase | Qué puedes hacer | Rendimiento |
|---|---|---|
| **Aprendiz** | las tres acciones núcleo | ×1 (penoso, pero desbloquea el tutorial y los primeros ciclos) |
| **Juramento** | evento social: el gremio te reconoce al alcanzar la maestría umbral en un eslabón | — |
| **Maestro** | **solo** su eslabón | ×10, más las recetas avanzadas y los componentes de rito |

La fase de Aprendiz existe por dos razones: enseña el juego entero antes de encerrarte, y da margen a un grupo que aún no está formado. En cuanto los tres juran, la cadena pasa a ser estricta y frágil — que es el punto.

### 7.2 Los tres eslabones núcleo (bloqueantes)

| Oficio | Rinde | Si falta |
|---|---|---|
| **Minero** | materia prima | el gremio se queda sin entradas en horas |
| **Fundidor** | materiales procesados | la mena se apila inútil; el Herrero se para |
| **Herrero** | herramientas, equipo y **componentes de rito** | no hay progresión de campaña ni reposición de herramientas |

### 7.3 Los tres apoyos (opcionales, multiplicadores)

| Oficio | Qué aporta | Si falta |
|---|---|---|
| **Mercader** | comisión 30 % → 5 %, mejores precios, más encargos de caravana | el Oro escasea muchísimo |
| **Escriba** | desbloquea recetas, contratos y regiones; acelera la investigación | la campaña avanza a rastras |
| **Guardián** | contiene la Herrumbre, reduce el desgaste, lidera las defensas | el mantenimiento devora al gremio |

Un apoyo **no bloquea nada**: un grupo de 3 con solo el núcleo es un gremio completo y jugable. Uno de 6 es un gremio optimizado.

### 7.4 Renegar

Romper el Juramento para cambiar de eslabón. Coste altísimo: pierde un porcentaje grande de la maestría acumulada y bloquea el nuevo eslabón durante un periodo largo de tiempo de gremio. Existe para un caso real —un miembro abandona el grupo y hay que reestructurar—, no como opción táctica.

---

## 8. Presión: desgaste y la Herrumbre

### 8.1 Desgaste y mantenimiento

- Cada taller pierde **integridad** con el uso y con el paso del tiempo de gremio. A 0 % **se para** hasta ser reparado.
- **El Hogar** (la lumbre del gremio) consume combustible por cada taller activo. Escala con el **número de talleres, no de jugadores**: un gremio que crece en estructuras y encoge en gente se ahoga solo.
- El Guardián reduce el desgaste; sin él, el mantenimiento se come una fracción notable de la producción.

### 8.2 La Herrumbre

La amenaza y, a la vez, el reloj de la campaña.

- Sube **un nivel cada N horas de tiempo de gremio**, siempre, hagas lo que hagas.
- Al cruzar umbrales, **golpea**: corroe stock del Depósito, inutiliza un taller, cierra una región o adelanta su propio nivel.
- Se **contiene** con Ritos de defensa, con el Guardián y con estructuras dedicadas — pero nunca se detiene del todo. Solo se derrota en el asedio final (§10).

Que suba en tiempo de gremio y no en tiempo real es coherente con todo el diseño: **el precio de hacer avanzar el mundo es que la amenaza también avanza**. Un gremio muy activo progresa rápido *y* se enfrenta antes a la Herrumbre.

---

## 9. Ritos

Los cuatro tipos, ordenados por exigencia de coordinación. Se introducen escalonadamente a lo largo de la campaña para que el grupo aprenda a coordinarse antes de que se le exija.

| Rito | Sincronía | Qué pide | Introducción |
|---|---|---|---|
| **Contrato del Gremio** | asíncrona, ventana de horas | aportaciones de ≥3 oficios distintos y N firmas | Cap. 1 |
| **Rito de Componentes** | asíncrona, con caducidad | un componente insustituible **por oficio**; caducan en X h de gremio | Cap. 2 |
| **Expedición** | **en vivo**, 10–15 min | ≥3 conectados a la vez; decisiones por votación, riesgo y botín exclusivo | Cap. 3 |
| **Defensa** | **agendada** | la Herrumbre anuncia el golpe; el gremio elige la hora; con <3 presentes se pierde algo grande | Cap. 4 |

El **Rito de Componentes** es el candado hecho ficción: el Minero aporta una veta pura, el Fundidor una aleación viva, el Herrero un sello templado. Ninguno puede fabricar el componente de otro, y los tres caducan. Es imposible de completar con dos personas, por definición.

---

## 10. Campaña

Cinco capítulos y un final. Cada capítulo introduce una **región** (materiales nuevos), un **nivel de la Herrumbre**, un **tipo de rito** y un **oficio de apoyo**.

| Cap. | Región | Introduce | Cierra con |
|---|---|---|---|
| **I — El Yunque Frío** | el taller | los 3 eslabones, el Juramento, el Contrato | encender el Hogar |
| **II — La Veta Honda** | mina profunda | Rito de Componentes, oficio **Mercader** | primer rito completo |
| **III — El Bosque Óxido** | bosque corroído | Expedición en vivo, oficio **Escriba** | recuperar un plano perdido |
| **IV — La Fundición Muerta** | ruina industrial | Defensa agendada, oficio **Guardián** | repeler el primer golpe grande |
| **V — El Corazón de Herrumbre** | el foco | todos los ritos encadenados | **el Asedio** |

**El Asedio** es el final: una secuencia larga que encadena los cuatro tipos de rito y exige al gremio entero. Ganarlo **termina la partida** con un epílogo que narra qué fue de cada oficio. La duración objetivo de una campaña completa es de **varias semanas** de visitas cortas — suficiente para que el grupo se comprometa, corto para que no se disuelva por agotamiento.

---

## 11. Interfaz

Distribución híbrida: **paneles arriba, consola y log de eventos abajo**. El log es obligatorio y es el alma social del juego.

```
┌─ GREMIO ────────────────────┬─ COFRADÍA ────────────┐
│ Mena      1.204   ▲ orden   │ ● Ana    Fundidora    │
│ Lingote     318   ▼         │ ● Beto   Minero       │
│ Oro         540             │ ○ Cris   Herrero  2 h │
│ Hogar        88 %  ▼        │ ─────────────────────  │
│ Herrumbre  ███░░░ nivel 4   │ Tiempo de gremio ×2,0 │
│ [Cargar orden] [Mercado] [Rito]                     │
├─ EVENTOS ───────────────────────────────────────────┤
│ ⛏ Beto cargó 200 de mena en la fundición            │
│ ✦ Recibes 5 de Fervor del trabajo de Ana            │
│ ⚠ La fragua está al 12 % de integridad              │
│ > enviar mena 200 @ana                              │
└─────────────────────────────────────────────────────┘
```

**Principios:**

1. **Todo lo importante cabe sin scroll.** Una visita dura cuatro minutos.
2. **El resumen de ausencia es la pantalla más importante del juego.** Lo primero al entrar: qué pasó mientras no estabas, quién lo hizo y qué te ha caído de Fervor.
3. **Las dependencias se ven.** Un taller parado dice *por qué* y *quién* puede desatascarlo, con su nombre: "sin carbón — lo hace **Ana**".
4. **La consola es opcional pero de primera clase.** Todo lo que se puede hacer con botones se puede hacer con comandos (`/cargar`, `/vender`, `/firmar`), y el log tiene el mismo peso visual que los paneles.
5. **La presencia es visible siempre.** Quién está dentro, hace cuánto se le vio y a qué velocidad corre el reloj colectivo.

---

## 12. Arquitectura técnica

### 12.1 Stack

| Capa | Elección | Por qué |
|---|---|---|
| Lenguaje | **TypeScript** (estricto) | el núcleo de simulación necesita tipos duros |
| Build | **Vite** | arranque instantáneo, build estático |
| UI | **React 19** | ecosistema y documentación máximos |
| Estado de UI | **Zustand** | store mínimo que refleja el snapshot; sin ceremonia |
| Estilos | **CSS Modules** (+ variables) | cero dependencias, estética de pergamino a medida |
| Simulación | **TypeScript puro**, sin DOM ni React | testeable, determinista, migrable |
| Red | **WebRTC DataChannel nativo** | sin librería: la topología es simple y el control total importa |
| Compresión | **fflate** | comprimir el código de señalización y el fichero de guardado |
| Persistencia | **IndexedDB** vía `idb-keyval` | snapshots locales en cada par |
| Tests | **Vitest** | el núcleo puro se presta a contratos rápidos |
| Despliegue | **GitHub Pages / Cloudflare Pages** | estático puro, cero backend, cero coste |

**Descartados a propósito:** ningún backend de juego, ninguna base de datos, ningún servicio de cuentas. La identidad es una clave local y un nombre.

### 12.2 Topología y autoridad

**Anfitrión autoritativo rotativo, topología en estrella.**

```
        Ana ──┐
              ├──▶  ANFITRIÓN (Beto)  ──▶ simula y difunde
        Cris ─┘         │
                        └── snapshot replicado a todos
```

- El **anfitrión** es el único que ejecuta el reducer. Los demás envían **intenciones** (`INTENT`), nunca estado.
- **Elección determinista:** el par con el `peerId` menor entre los conectados, con desempate por antigüedad de sesión. Sin votaciones ni condiciones de carrera.
- **Traspaso:** si el anfitrión se va, el siguiente en orden asume con el último snapshot conocido y continúa. Las intenciones en vuelo se reintentan.
- **Estrella, no malla:** basta con que todos hablen con el anfitrión. Esto reduce las conexiones de N² a N, simplifica la señalización y —crucialmente— **elimina la necesidad de TURN entre pares que no se ven** (§13).
- Se puede abrir malla oportunista para el chat, pero **no es un requisito**.

**Sobre las trampas:** el anfitrión puede hacer trampas. Con 3–6 amigos es un problema social, no técnico, y se acepta explícitamente. Las medidas baratas que sí se implementan: el anfitrión valida toda intención contra las reglas, los clientes comparan el hash del snapshot recibido con el suyo cuando pueden re-simular, y el reloj lo concede siempre el anfitrión.

### 12.3 Señalización manual, mitigada

WebRTC siempre necesita un canal fuera de banda para el saludo inicial. Aquí ese canal **eres tú pegando un código en Discord**. Para que no sea insufrible:

1. **Solo el primer apretón de manos es manual.** Te emparejas con **un** miembro que ya esté dentro.
2. **Retransmisión entre pares:** ese miembro presenta tu oferta al resto por el canal de datos ya abierto (`SIGNAL_RELAY`). La red se completa sola.
3. **Códigos cortos:** el SDP se poda (se descartan candidatos redundantes), se comprime con `fflate` y se codifica en base64url. Objetivo: que quepa cómodamente en un mensaje de Discord.
4. **Sin trickle ICE:** se espera a completar la recolección de candidatos y se emite un solo bloque. Más lento de generar, infinitamente más simple de pegar.
5. **Costura enchufable:** toda la señalización vive detrás de una interfaz `ISignalChannel`. Hoy hay una única implementación, `ManualSignal`. Añadir mañana un `WorkerSignal` (Cloudflare Worker) o un `TrysteroSignal` **no toca ni una línea del resto del juego**.

### 12.4 Protocolo

| Mensaje | Dirección | Contenido |
|---|---|---|
| `HELLO` | ambas | `peerId`, nombre, versión de protocolo, `campaignId`, `tick` local |
| `SIGNAL_RELAY` | ambas | `toPeerId`, carga opaca de señalización |
| `INTENT` | cliente → anfitrión | `seq`, acción del jugador |
| `EVENT` | anfitrión → todos | `tick`, lista de eventos aplicados |
| `SNAPSHOT` | anfitrión → todos | `tick`, estado completo, `hash` |
| `CHAT` | ambas | texto |
| `PING` / `PONG` | ambas | latencia y presencia |

Reglas: canal **ordenado y fiable**; toda intención lleva `seq` para idempotencia; el `SNAPSHOT` completo se envía al entrar y cada N ticks; la **versión de protocolo** se comprueba en el `HELLO` y una discrepancia rechaza la conexión con un mensaje claro.

### 12.5 Persistencia y respaldo

- **Cada par guarda** el último snapshot recibido en IndexedDB, con `campaignId` y `tick`.
- **Reconciliación al reunirse:** gana el snapshot de mayor `tick` dentro del mismo `campaignId`. Sin fusiones ni CRDTs: el más avanzado manda, y los demás lo adoptan.
- **Exportar / importar fichero** (`.yunque`): JSON comprimido con checksum. Es la red de seguridad elegida y **es obligatoria en la interfaz**, con un botón visible, no escondido en ajustes.
- **Riesgo asumido:** si todos cierran y el último borra la caché del navegador, la campaña muere. La única defensa es exportar de vez en cuando.

### 12.6 Determinismo y núcleo puro

El núcleo (`src/core/`) es TypeScript puro con tres prohibiciones absolutas:

1. **Nada de `Date.now()`.** El tiempo entra como parámetro.
2. **Nada de `Math.random()`.** Toda aleatoriedad pasa por un PRNG con semilla (`sfc32`), y la semilla vive en el estado.
3. **Nada de DOM ni de React.**

La firma central es una función pura:

```ts
reduce(state: GuildState, action: Action, ctx: TickContext): GuildState
```

Esto da tres cosas gratis: tests deterministas y rapidísimos, snapshots reproducibles a partir de `(semilla, lista de acciones)`, y la puerta abierta a migrar a lockstep verificado si algún día el grupo crece o la confianza no basta.

**Todas las constantes de balance viven en un único fichero** (`core/balance.ts`). Ninguna cifra mágica dispersa por las reglas.

### 12.7 Estructura de carpetas

```
src/
  core/                 # simulación pura — sin DOM, sin React, sin reloj propio
    state.ts            # tipos del estado del gremio
    reducer.ts          # reduce(state, action, ctx)
    balance.ts          # TODAS las constantes de balance
    rng.ts              # PRNG con semilla
    time.ts             # tiempo real vs tiempo de gremio
    rules/
      chain.ts          # eslabones, Ley del Sello, Juramento
      fervor.ts         # generación y reparto
      market.ts         # caravanas y precios dinámicos
      rust.ts           # la Herrumbre, desgaste y mantenimiento
      rites.ts          # los cuatro tipos de rito
  net/
    protocol.ts         # tipos de mensaje + versión
    transport.ts        # WebRTC DataChannel
    signal/
      ISignalChannel.ts # la costura
      manual.ts         # copiar y pegar (implementación actual)
    host.ts             # bucle del anfitrión
    client.ts           # cliente: enviar intenciones, aplicar eventos
    election.ts         # elección y traspaso de anfitrión
  persist/
    snapshot.ts         # IndexedDB
    file.ts             # exportar/importar .yunque
  ui/
    panels/             # Gremio, Cofradía, Taller, Mercado, Ritos
    console/            # log de eventos + barra de comandos
    session/            # sala, códigos de conexión, presencia
  app.tsx
tests/
  core/                 # contratos de simulación
  net/                  # protocolo y reconciliación
```

### 12.8 Tests

Contratos sobre el núcleo puro, al estilo de los del proyecto Mechanis: invariantes que iteran los datos en lugar de casos sueltos.

- **Conservación:** ningún material se crea ni se destruye fuera de las recetas declaradas.
- **Determinismo:** misma semilla + misma lista de acciones ⇒ mismo hash de estado.
- **Ley del Sello:** ninguna receta acepta como entrada material del propio sello. Se verifica **iterando el catálogo entero**, no receta a receta.
- **El candado de los 3:** una simulación con 1 y con 2 jugadores no puede alcanzar el primer Rito de Componentes. Este test es la premisa del juego convertida en contrato.
- **Presupuesto de operaciones:** el coste de un tick de gremio es lineal en talleres, nunca cuadrático.
- **Reconciliación:** dos snapshots divergentes convergen al de mayor `tick`.

### 12.9 Despliegue

Build estático a GitHub Pages desde el propio repositorio (`ProZero133/IdleGame`). Sin backend, sin variables de entorno, sin secretos. Una versión = un commit.

---

## 13. Riesgos conocidos

| Riesgo | Gravedad | Mitigación |
|---|---|---|
| **Señalización manual pesada** | alta | solo el primer apretón es manual; el resto se retransmite entre pares. Códigos comprimidos. Costura `ISignalChannel` lista para enchufar un Worker sin tocar el juego |
| **NAT simétrica sin TURN** | media | topología en **estrella**: basta con que todos alcancen al anfitrión. Si un par no logra conectar con el anfitrión, otro par que sí lo alcance retransmite a nivel de aplicación |
| **Cadena rota por ausencias** | alta, **intencional** | es la premisa. Se mitiga con avisos explícitos ("bloqueado: falta el Fundidor") y con la fase Aprendiz, que da margen antes de cerrar los oficios |
| **Pérdida del guardado** | alta | export/import obligatorio y visible; el snapshot vive replicado en todos los pares |
| **El grupo se disuelve a media campaña** | alta | la campaña tiene **final** y dura semanas, no meses; **Renegar** permite reestructurar el gremio |
| **Anfitrión tramposo** | baja (amigos) | aceptado explícitamente. El anfitrión valida intenciones, nunca acepta estado; hash de snapshot para detección pasiva |
| **Divergencia de simulación** | media | hash en cada `SNAPSHOT`; ante discrepancia, resincronización por snapshot completo |
| **El bucle de 3 aburre** | media | se descubre pronto: la Fase 1 de la hoja de ruta ya es jugable con amigos reales |

---

## 14. Hoja de ruta

**Orden elegido: red primero, completa.** Se elimina todo el riesgo técnico antes de tocar mecánicas.

### Fase 0 — La red (completa antes de nada)

| # | Entregable |
|---|---|
| 0.1 | Proyecto Vite + React + TS, Vitest, despliegue estático automático |
| 0.2 | Transporte WebRTC + `ManualSignal` con códigos comprimidos: **dos pestañas conectadas** |
| 0.3 | Retransmisión de señalización entre pares: **3+ pares en estrella con un solo pegado manual** |
| 0.4 | Protocolo completo, anfitrión autoritativo, elección determinista y traspaso |
| 0.5 | Snapshots, persistencia en IndexedDB, exportar/importar, reconciliación por `tick` |
| 0.6 | Chat y log de eventos sobre el protocolo — la primera función de verdad |

**Criterio de aceptación de la fase:** tres amigos se conectan pegando un código, chatean, ven un contador compartido que **solo sube mientras hay alguien dentro**, cierran el navegador, vuelven al día siguiente y todo sigue donde estaba. Uno de ellos se va a mitad y el gremio no se entera.

### Fase 1 — El bucle mínimo

Depósito, tres eslabones, Vigor, órdenes, Juramento, Fervor y su reparto. Paneles Gremio/Cofradía y consola.
**Aceptación:** tres jugadores completan el ciclo mena → lingote → herramienta y suben de nivel **con el Fervor que se generan mutuamente**.

### Fase 2 — La presión

Talleres con integridad, desgaste, El Hogar, mantenimiento, la Herrumbre con sus niveles y golpes. Mercado con caravanas y precios dinámicos.
**Aceptación:** un gremio descuidado **pierde terreno** de forma visible y recuperable.

### Fase 3 — Los ritos

En orden de exigencia: Contrato → Componentes → Expedición en vivo → Defensa agendada.
**Aceptación:** un Rito de Componentes es **imposible** de completar con dos jugadores, y el test lo demuestra.

### Fase 4 — La campaña

Los cinco capítulos, las regiones, los tres oficios de apoyo, el Asedio y el epílogo.

### Fase 5 — Pulido

Arte, sonido, tutorial, accesibilidad, resumen de ausencia bien presentado, balance por medición.

---

## 15. Números de primera pasada

Cifras de arranque para tener algo que tocar. **Todas viven en `core/balance.ts` y se recalibran por medición, nunca a ojo.**

| Parámetro | Valor inicial | Subirlo hace que… |
|---|---|---|
| Vigor máximo | 6 cargas | premie más entrar de tarde en tarde |
| Recarga de Vigor | +1 / 30 min reales | el juego pida menos visitas |
| Velocidad de gremio | `1 + 0,5×(conectados−1)`, tope ×3 | coincidir sea más rentable |
| Fervor por acción | 10, repartido entre los **otros** activos (72 h) | la progresión personal vaya más rápida |
| Umbral de Juramento | 500 de maestría en un eslabón | el gremio tarde más en volverse rígido |
| Multiplicador de Maestro | ×10 sobre Aprendiz | la especialización sea más obligatoria |
| Orden de taller (nivel 1) | 100 unidades por hora de gremio | el mundo produzca más por hora conectada |
| Desgaste de taller | −1 % integridad / hora de gremio | el mantenimiento pese más |
| Consumo del Hogar | 5 de leña / hora de gremio **por taller** | expandirse sea más caro |
| Subida de la Herrumbre | +1 nivel / 6 horas de gremio | la campaña sea más corta y tensa |
| Golpe de la Herrumbre | cada 5 niveles | los castigos sean más frecuentes |
| Comisión del Mercado | 30 % sin Mercader / 5 % con | el oficio de Mercader sea más imprescindible |
| Caducidad de componentes | 24 horas de gremio | los ritos exijan más coordinación |
| Duración de campaña | ~5 semanas de visitas cortas | el compromiso exigido sea mayor |

---

## 16. Fuera de alcance

Ideas registradas pero **no comprometidas**. No entran sin una decisión explícita.

- **Aviso de riesgo de guardado** ("solo tú tienes el estado más nuevo, exporta ya"). Coste casi nulo y muy eficaz; candidato claro a entrar en Fase 5.
- **Auto-descarga periódica** del fichero de guardado.
- **Respaldo cifrado en la nube** — rompería el "cero infraestructura".
- **Señalización automática** por Worker propio o Trystero. La costura ya está preparada.
- **Dedicatoria de obra**: dirigir el Fervor de una acción a un compañero concreto. Bonito, pero puede crear favoritismos en un juego que quiere ser plano.
- **Personaje persistente entre gremios / modo Legado** tras el final.
- **Grupos de 7+**, temporadas, clasificaciones, PvP, robo o sabotaje. Descartados por decisión de diseño.

---

## 17. Nombres alternativos

| Nombre | Idea |
|---|---|
| **Yunque Común** ← *actual* | el yunque compartido: nadie forja para sí |
| **Tres Manos** | alude directamente al mínimo de tres jugadores |
| **La Ley del Sello** | nombra el candado maestro |
| **Cofradía** | cálido, gremial, corto |
| **Fragua Compartida** | descriptivo y evocador |
| **Sello y Fervor** | nombra las dos monedas del alma del juego |
| **Marea de Herrumbre** | pone el foco en la amenaza |

---

## 18. Glosario

| Término | Significado |
|---|---|
| **Cofradía / Gremio** | el grupo de 3–6 jugadores y su partida compartida |
| **Ley del Sello** | prohibición de beneficiarse del propio trabajo — el candado maestro |
| **Fervor** | moneda de progresión personal; **solo se recibe del trabajo ajeno** |
| **Vigor** | cargas de acción personales, recargan en tiempo real |
| **Tiempo de Gremio** | reloj del mundo; solo corre con alguien conectado, a ×1–×3 |
| **Juramento** | rito por el que un Aprendiz se convierte en Maestro de un eslabón y pierde los otros |
| **Renegar** | romper el Juramento a un coste altísimo |
| **Depósito** | almacén común; todo el material es del gremio |
| **El Hogar** | la lumbre: medidor de mantenimiento del gremio |
| **La Herrumbre** | la amenaza creciente y el reloj de la campaña |
| **Rito** | hito cooperativo; cuatro tipos de exigencia creciente |
| **El Asedio** | el enfrentamiento final que termina la partida |
| **Anfitrión** | el par que simula el estado; rotativo y determinista |
| **Snapshot** | estado completo firmado con `tick` y `hash` |
