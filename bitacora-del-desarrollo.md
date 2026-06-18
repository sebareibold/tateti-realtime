# Bitácora de Desarrollo — By Seba

Documento paso a paso del proceso de desarrollo del proyecto.  
Stack: **Node.js + TypeScript** (servidor) + **React con Vite** (cliente) + **Socket.io** (comunicación en tiempo real).

---

## 1. Crear el repositorio en GitHub

Primero creamos el repositorio vacío desde [github.com/new](https://github.com/new) con los siguientes datos:

- **Nombre:** `tateti-realtime`
- **Descripción:** `Multiplayer Tic-Tac-toe with WebSockets - Node.js + React`
- **Visibilidad:** Public
- Sin README ni .gitignore (los creamos manualmente)

---

## 2. Estructurar el proyecto e inicializar Git

Creamos la carpeta raíz del proyecto con la estructura `server/` y `client/`, donde:
- `server/` → backend en Node.js puro + TypeScript con Socket.io
- `client/` → frontend en React con Vite

```bash
mkdir tateti-realtime && cd tateti-realtime
git init
echo "node_modules/\n.env" > .gitignore
mkdir server client
git remote add origin https://github.com/sebareibold/tateti-realtime.git
```

---

## 3. Primer commit y push

```bash
echo "# tateti-realtime" > README.md
git add .
git commit -m "init: estructura del proyecto"
git branch -M main
git push -u origin main
```

---

## 4. Inicializar el servidor

Nos movemos a la carpeta `server/`, inicializamos el proyecto Node e instalamos las dependencias.  
**No usamos Express ni ningún framework**, solo el módulo `http` nativo de Node.

```bash
cd server
npm init -y
npm install socket.io
npm install -D typescript ts-node @types/node
npx tsc --init
```

### ¿Qué hace cada comando?

#### `npm init -y`
Inicializa un proyecto Node dentro de la carpeta `server/`. Crea el archivo `package.json` que describe el proyecto: nombre, versión, dependencias, scripts, etc.  
El flag `-y` acepta todos los valores por defecto sin preguntar nada de forma interactiva.

> Sin ese archivo, Node no sabe que la carpeta es un proyecto y no podés instalar dependencias.

#### `npm install socket.io`
Descarga e instala la librería Socket.io dentro de `server/node_modules/` y la registra como dependencia en el `package.json`.  
También genera el `package-lock.json`, que fija las versiones exactas de todo lo instalado. Así, si otro integrante del grupo clona el repo y corre `npm install`, obtiene exactamente las mismas versiones.

#### `npm install -D typescript ts-node @types/node`
Instala TypeScript y sus herramientas como dependencias de desarrollo (`-D`):
- `typescript` → el compilador de TS
- `ts-node` → permite ejecutar archivos `.ts` directamente sin compilar manualmente
- `@types/node` → los tipos de Node.js (para que TS entienda `http`, `process`, etc.)

#### `npx tsc --init`
Genera el archivo `tsconfig.json` con la configuración del compilador de TypeScript. Lo modificamos para que quede compatible con Node y CommonJS:

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "verbatimModuleSyntax": false
  }
}
```

**¿Por qué estos cambios?**

El `tsconfig.json` generado por defecto tiene `verbatimModuleSyntax: true`, que exige que el estilo de imports que uses en el código coincida exactamente con el tipo de módulo configurado.

El problema es que Node.js por defecto usa **CommonJS** como sistema de módulos, pero `verbatimModuleSyntax` espera imports al estilo **ESM**. Esa combinación genera conflicto.

Con estos dos cambios le decís explícitamente al compilador: _"compilá para CommonJS y no me fuerces a usar un estilo de imports específico"_. Así TypeScript convierte los `import/export` que escribís a `require/module.exports` internamente, que es lo que Node entiende.

```
import { createServer } from 'http'        ← vos escribís esto (ESM)
             ↓  tsc compila
const { createServer } = require('http')   ← Node ejecuta esto (CommonJS)
```

---

## 5. Crear el servidor — `index.ts`

Creamos el archivo principal del servidor:

```ts
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const server = createServer()

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // puerto default de Vite
    methods: ['GET', 'POST']
  }
})

io.on('connection', (socket: Socket) => {
  console.log('='.repeat(50))
  console.log('Cliente conectado:', socket.id)
  console.log('='.repeat(50))

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id)
  })
})

server.listen(3000, () => {
  console.log('='.repeat(50))
  console.log('Servidor corriendo en http://localhost:3000')
  console.log('='.repeat(50))
})
```

### ¿Qué hace cada parte?

#### `import { createServer } from 'http'`
Importa solo `createServer` del módulo nativo `http` de Node. Lo usamos con destructuring porque el módulo HTTP de Node es CommonJS y no tiene export default.

#### `new Server(server, { cors })`
Inicializa Socket.io montado sobre el servidor HTTP. El `cors` es necesario porque el cliente React corre en `localhost:5173` (Vite) y el servidor en `localhost:3000`. El navegador bloquea por seguridad comunicaciones entre orígenes distintos sin esa configuración.

#### `io.on('connection', (socket: Socket) => { ... })`
Escucha el evento `connection`, que Socket.io dispara automáticamente cada vez que un cliente nuevo se conecta. El `socket` representa **esa conexión puntual**: cada cliente tiene el suyo con un `id` único.

#### `socket.on('disconnect', () => { ... })`
Se dispara cuando ese cliente cierra la pestaña, pierde conexión, etc. Importante para limpiar el estado del juego si un jugador abandona la partida.

#### `server.listen(PORT, ...)`
Le dice al servidor HTTP que empiece a escuchar en el puerto `PORT`(constante definida arriba). El callback se ejecuta una sola vez cuando el servidor está listo.

### Correr el servidor

```bash
npx ts-node index.ts
```

Output esperado:
```
==================================================
Servidor corriendo en http://localhost:3000
==================================================
```

---
## 6. Organizar los tipos del servidor — `server/types/index.ts`

Creamos una carpeta `types/` dentro de `server/` para centralizar todos los tipos del proyecto.  
Así cualquier archivo que los necesite los importa desde un único lugar.

```bash
mkdir types
echo. > types/index.ts
```

```ts
export type Player = 'X' | 'O'
export type Cell = Player | null
export type Board = Cell[]
export type GameResult = Player | 'draw' | null

export interface GameState {
  board: Board
  currentTurn: Player
  winner: GameResult
  gameOver: boolean
}
```

### `type` vs `interface` — ¿por qué usamos cada uno?

#### `type`
Lo usamos para definir **uniones, alias simples o composiciones**:

- `Player` es una unión: solo puede ser `'X'` o `'O'`, nada más.
- `Cell` es una unión de `Player` o `null`.
- `Board` es un alias de un array de `Cell`.
- `GameResult` describe todos los posibles resultados de una partida.

No tiene sentido usar `interface` para esto porque no estamos describiendo la forma de un objeto, sino restringiendo los valores posibles.

#### `interface`
Lo usamos para describir la **forma de un objeto**. `GameState` tiene propiedades con sus tipos, es exactamente para lo que `interface` fue diseñado.

> La diferencia clave: `type` es más versátil (uniones, intersecciones, alias), `interface` es específica para objetos y además es extensible con `extends`. En la práctica, si describís la forma de un objeto usás `interface`, si necesitás cualquier otra cosa usás `type`.

---

## 7. Lógica del juego — `server/gameLogic.ts`

Toda la lógica pura del juego vive acá, completamente separada del servidor. No sabe nada de sockets ni de red.

```ts
import type { Player, Board, GameState, GameResult } from './types'

export const createInitialState = (): GameState => ({
  board: Array(9).fill(null),
  currentTurn: 'X',
  winner: null,
  gameOver: false,
})

const WIN_COMBINATIONS: [number, number, number][] = [
  [0, 1, 2], // fila superior
  [3, 4, 5], // fila del medio
  [6, 7, 8], // fila inferior
  [0, 3, 6], // columna izquierda
  [1, 4, 7], // columna del medio
  [2, 5, 8], // columna derecha
  [0, 4, 8], // diagonal de arriba-izquierda a abajo-derecha
  [2, 4, 6], // diagonal de arriba-derecha a abajo-izquierda
]

export const checkWinner = (board: Board): GameResult => {
  let ganador: GameResult = null
  let i = 0

  // Recorremos cada combinación ganadora hasta encontrar una o quedarnos sin opciones
  while (i < WIN_COMBINATIONS.length && ganador === null) {
    const combination = WIN_COMBINATIONS[i]

    if (combination) {
      const [a, b, c] = combination

      // Si las tres celdas tienen el mismo jugador, ese jugador ganó
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        ganador = board[a] as GameResult
      }
    }
    i++
  }

  // Si no hay ganador pero el tablero está lleno, es empate
  if (ganador === null && board.every((cell) => cell !== null)) {
    ganador = 'draw'
  }

  return ganador
}

export const makeMove = (state: GameState, index: number): GameState => {
  let newState = { ...state }

  // Ignoramos el movimiento si el juego ya terminó o la celda está ocupada
  if (!state.gameOver && state.board[index] === null) {
    const newBoard = [...state.board]
    newBoard[index] = state.currentTurn

    const winner = checkWinner(newBoard)

    newState = {
      board: newBoard,
      currentTurn: state.currentTurn === 'X' ? 'O' : 'X',
      winner,
      gameOver: winner !== null,
    }
  }

  return newState
}
```

### ¿Qué hace cada parte?

#### `createInitialState`
Devuelve un estado limpio para empezar una partida: tablero vacío de 9 celdas, turno de X, sin ganador.

#### `WIN_COMBINATIONS`
Las 8 combinaciones posibles de victoria (3 filas, 3 columnas, 2 diagonales). Cada combinación es una tupla `[number, number, number]` que representa los índices del tablero.

#### `checkWinner`
Recorre las combinaciones con un `while` y verifica si alguna tiene las 3 celdas iguales. Si el tablero está lleno y no hay ganador, retorna `'draw'`. Un solo `return` al final.

#### `makeMove`
Recibe el estado actual y el índice de la celda jugada. Si el movimiento es válido, actualiza el tablero, cambia el turno y verifica si hay ganador. También con un solo `return`.

---

## 8. Servidor completo — `server/index.ts`

```ts
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { createInitialState, makeMove } from './gameLogic'
import type { GameState } from './types'

const server = createServer()
const PORT = 3000

// Mapa de rooms activas: roomId -> estado del juego
const rooms = new Map<string, GameState>()

// Mapa de jugadores: socketId -> roomId a la que pertenece
const playerRoom = new Map<string, string>()

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket: Socket) => {
  console.log('='.repeat(50))
  console.log('Cliente conectado:', socket.id)
  console.log('='.repeat(50))

  // El cliente quiere unirse a una partida
  socket.on('join', () => {
    // Buscamos una room con solo un jugador esperando
    let roomId = [...rooms.keys()].find(
      (id) => io.sockets.adapter.rooms.get(id)?.size === 1
    )

    // Si no hay ninguna, creamos una nueva
    if (!roomId) {
      roomId = `room-${socket.id}`
      rooms.set(roomId, createInitialState())
    }

    socket.join(roomId)
    playerRoom.set(socket.id, roomId)

    const playersInRoom = io.sockets.adapter.rooms.get(roomId)?.size ?? 0

    if (playersInRoom === 1) {
      // Primer jugador, que espere
      socket.emit('waiting')
    } else {
      // Segundo jugador, arranca el juego
      const state = rooms.get(roomId)!
      const players = [...io.sockets.adapter.rooms.get(roomId)!]

      // Le decimos a cada jugador qué símbolo le tocó
      players.forEach((playerId, i) => {
        io.to(playerId).emit('start', {
          state,
          symbol: i === 0 ? 'X' : 'O',
        })
      })
    }
  })

  // El cliente hizo una jugada
  socket.on('move', (index: number) => {
    const roomId = playerRoom.get(socket.id)
    const state = roomId ? rooms.get(roomId) : null

    if (roomId && state) {
      const newState = makeMove(state, index)
      rooms.set(roomId, newState)

      // Mandamos el estado actualizado a ambos jugadores
      io.to(roomId).emit('update', newState)
    }
  })

  // El cliente se desconectó
  socket.on('disconnect', () => {
    const roomId = playerRoom.get(socket.id)

    if (roomId) {
      // Avisamos al otro jugador que su rival se fue
      socket.to(roomId).emit('opponent_left')

      // Limpiamos la room y al jugador del mapa
      rooms.delete(roomId)
      playerRoom.delete(socket.id)
    }

    console.log('Cliente desconectado:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log('='.repeat(50))
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
  console.log('='.repeat(50))
})
```

### Eventos del servidor

| Evento recibido | Quién lo manda | Qué hace el servidor |
|---|---|---|
| `join` | Cliente | Busca o crea una room, asigna símbolo |
| `move` | Cliente | Aplica la jugada y broadcastea el nuevo estado |
| `disconnect` | Socket.io | Limpia la room y avisa al rival |

| Evento emitido | A quién | Cuándo |
|---|---|---|
| `waiting` | Al jugador 1 | Cuando está solo esperando rival |
| `start` | A ambos jugadores | Cuando se conecta el segundo jugador |
| `update` | A ambos jugadores | Después de cada jugada válida |
| `opponent_left` | Al jugador restante | Cuando el rival se desconecta |

---

## 9. Cliente — Inicializar React con Vite

```bash
cd ../client
npm create vite@latest . -- --template react-ts
npm install
npm install socket.io-client
```

La estructura de `src/` que usamos:

```
src/
├── components/
│   ├── Board.tsx       ← tablero 3x3
│   ├── Cell.tsx        ← cada celda individual
│   └── StatusBar.tsx   ← estado del juego (turno, resultado)
├── hooks/
│   └── useGame.ts      ← toda la lógica del socket y estado
├── types/
│   └── index.ts        ← tipos del cliente
├── socket.ts           ← instancia compartida del socket
├── App.tsx             ← composición, sin lógica
└── main.tsx
```

---

## 10. Tipos del cliente — `src/types/index.ts`

El cliente tiene sus propios tipos, independientes del servidor. Si el backend cambia de tecnología, el cliente no se rompe.

```ts
export type AppState = 'idle' | 'waiting' | 'playing' | 'finished'
export type PlayerSymbol = 'X' | 'O'
export type Cell = PlayerSymbol | null
export type Board = Cell[]
export type GameResult = PlayerSymbol | 'draw' | null

export interface GameState {
  board: Board
  currentTurn: PlayerSymbol
  winner: GameResult
  gameOver: boolean
}
```

#### ¿Por qué `AppState`?
Representa en qué pantalla/estado está el cliente en cada momento:

- `idle` → recién abrió la app, todavía no hizo nada
- `waiting` → se conectó y está esperando que llegue un rival
- `playing` → la partida está en curso
- `finished` → la partida terminó (alguien ganó o empate)

---

## 11. Conexión al servidor — `src/socket.ts`

```ts
import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_SERVER_URL)

export default socket
```

Creamos la conexión **una sola vez** y la exportamos. Si cada componente creara su propio `io()` tendríamos múltiples conexiones simultáneas al servidor.

`import.meta.env` es la forma de Vite de exponer variables de entorno al cliente. La URL del servidor vive en `.env`:

```
VITE_SERVER_URL=http://localhost:3000
```

> El prefijo `VITE_` es obligatorio. Vite solo expone al navegador las variables que empiecen con ese prefijo, el resto queda privado.

---

## 12. Lógica del cliente — `src/hooks/useGame.ts`

Toda la lógica de estado y comunicación con el socket vive en este custom hook. Los componentes solo consumen lo que devuelve, sin saber nada de sockets.

```ts
import { useEffect, useState } from 'react'
import socket from '../socket'
import type { AppState, PlayerSymbol, GameState } from '../types'

export const useGame = () => {
  const [appState, setAppState] = useState<AppState>('idle')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [mySymbol, setMySymbol] = useState<PlayerSymbol | null>(null)

  useEffect(() => {
    // Nos unimos a una partida al montar el componente
    socket.emit('join')

    // Esperando rival
    socket.on('waiting', () => {
      setAppState('waiting')
    })

    // El servidor arrancó la partida y nos dice qué símbolo somos
    socket.on('start', ({ state, symbol }: { state: GameState; symbol: PlayerSymbol }) => {
      setGameState(state)
      setMySymbol(symbol)
      setAppState('playing')
    })

    // El servidor mandó el estado actualizado
    socket.on('update', (state: GameState) => {
      setGameState(state)
      if (state.gameOver) setAppState('finished')
    })

    // El rival se desconectó
    socket.on('opponent_left', () => {
      setAppState('idle')
      setGameState(null)
      setMySymbol(null)
    })

    // Limpiamos los listeners al desmontar el componente
    return () => {
      socket.off('waiting')
      socket.off('start')
      socket.off('update')
      socket.off('opponent_left')
    }
  }, [])

  const handleMove = (index: number) => {
    const isMyTurn = gameState?.currentTurn === mySymbol
    const canMove = appState === 'playing' && isMyTurn && !gameState?.gameOver

    if (canMove) {
      socket.emit('move', index)
    }
  }

  return { gameState, appState, mySymbol, handleMove }
}
```

### ¿Qué es `useState`?

`useState` es un hook de React que permite que un componente (o hook) tenga **estado interno**. Cuando ese estado cambia, React vuelve a renderizar automáticamente.

```ts
const [valor, setValor] = useState<Tipo>(valorInicial)
//     ↑              ↑
//   valor actual   función para cambiarlo
```

En el hook usamos tres estados:

| Estado | Tipo | Para qué |
|---|---|---|
| `appState` | `AppState` | En qué pantalla está el jugador |
| `gameState` | `GameState \| null` | El estado completo del tablero |
| `mySymbol` | `PlayerSymbol \| null` | Si soy X o O |

### ¿Qué es `useEffect`?

`useEffect` permite ejecutar código con **efectos secundarios** (cosas que pasan fuera del renderizado): llamadas a APIs, suscripciones a eventos, timers, etc.

```ts
useEffect(() => {
  // código que se ejecuta después del render

  return () => {
    // cleanup: se ejecuta cuando el componente se desmonta
  }
}, []) // el array vacío significa: ejecutar solo una vez al montar
```

En nuestro caso lo usamos para:
1. Emitir `join` al servidor cuando el componente se monta
2. Registrar los listeners de los eventos del socket (`waiting`, `start`, `update`, `opponent_left`)
3. Limpiar esos listeners cuando el componente se desmonta (el `return`)

> Sin el cleanup del `return`, si el componente se desmonta y vuelve a montar, los listeners se acumularían y cada evento se procesaría múltiples veces.

### ¿Por qué un custom hook?

Separar la lógica en `useGame` en vez de ponerla directo en `App.tsx` tiene varias ventajas:
- `App.tsx` queda limpio, solo se ocupa de renderizar
- La lógica es reutilizable y testeable por separado
- Es más fácil de entender para quien lee el código


---

## 13. Componentes — Cell, Board, StatusBar y App

Antes de generar la UI, construimos los 4 componentes con su lógica y props bien definidas, sin estilos todavía.

### Props centralizadas en `src/types/index.ts`

Siguiendo el estándar del proyecto, todas las interfaces de props viven en el archivo de tipos:

```ts
export interface CellProps {
  value: Cell
  index: number
  onClick: (index: number) => void
}

export interface BoardProps {
  gameState: GameState | null
  mySymbol: PlayerSymbol | null
  onMove: (index: number) => void
}

export interface StatusBarProps {
  appState: AppState
  gameState: GameState | null
  mySymbol: PlayerSymbol | null
}
```

### `Cell.tsx`

El componente más simple. Recibe el valor de la celda y delega el click hacia arriba:

```tsx
import type { CellProps } from '../types'

const Cell = ({ value, index, onClick }: CellProps) => {
  return (
    <div onClick={() => onClick(index)}>
      {value}
    </div>
  )
}

export default Cell
```

### `Board.tsx`

Recorre el array `board` y renderiza una `Cell` por cada posición:

```tsx
import type { BoardProps } from '../types'
import Cell from './Cell'

const Board = ({ gameState, mySymbol, onMove }: BoardProps) => {
  return (
    <div>
      {gameState?.board.map((cell, index) => (
        <Cell
          key={index}
          value={cell}
          index={index}
          onClick={onMove}
        />
      ))}
    </div>
  )
}

export default Board
```

> `key={index}` es obligatorio en React al renderizar listas. Le dice a React cómo identificar cada elemento para actualizarlo eficientemente sin re-renderizar toda la lista.

### `StatusBar.tsx`

Muestra el mensaje correcto según el estado actual del juego:

```tsx
import type { StatusBarProps } from '../types'

const StatusBar = ({ appState, gameState, mySymbol }: StatusBarProps) => {
  const getMessage = (): string => {
    if (appState === 'idle') return 'Conectando...'
    if (appState === 'waiting') return 'Esperando rival...'

    if (appState === 'finished') {
      if (gameState?.winner === 'draw') return '¡Empate!'
      if (gameState?.winner === mySymbol) return '¡Ganaste!'
      return '¡Perdiste!'
    }

    if (gameState?.currentTurn === mySymbol) return 'Tu turno'
    return 'Turno del rival'
  }

  return (
    <div>
      <p>{getMessage()}</p>
      {appState === 'playing' && <p>Jugás con: {mySymbol}</p>}
    </div>
  )
}

export default StatusBar
```

### `App.tsx`

Solo composición, sin lógica propia:

```tsx
import { useGame } from './hooks/useGame'
import Board from './components/Board'
import StatusBar from './components/StatusBar'

function App() {
  const { gameState, appState, mySymbol, handleMove } = useGame()

  return (
    <div>
      <StatusBar appState={appState} gameState={gameState} mySymbol={mySymbol} />
      <Board gameState={gameState} mySymbol={mySymbol} onMove={handleMove} />
    </div>
  )
}

export default App
```

---

## 14. UI con Claude Code — Pixel Art Retro

Una vez que la lógica estuvo lista y probada, usamos **Claude Code** para generar toda la interfaz visual.

### ¿Qué es Claude Code?

Claude Code es una herramienta de Anthropic que corre directamente en la terminal como agente de desarrollo. A diferencia de usar Claude en el chat, Claude Code puede leer archivos del proyecto, escribir código, ejecutar comandos y modificar múltiples archivos a la vez. Entiende el contexto completo del proyecto.

### Skill: Superpowers / Brainstorm

Antes de generar el código final, usamos la skill de **Superpowers** de Claude Code, que permite pedirle al agente que entre en modo brainstorm: en vez de generar código directamente, primero presenta **múltiples opciones visuales** para que el desarrollador elija la dirección antes de comprometerse con una implementación.

Esto es útil cuando no tenés claro exactamente qué querés visualmente, porque te permite explorar variantes sin tener que revisar y deshacer código. El agente actúa como un diseñador que te muestra bocetos antes de construir.

### Prompt utilizado

```
Tengo una aplicación de Tateti (Tic-Tac-Toe) multijugador en tiempo real con React + TypeScript + Socket.io ya funcionando. Necesito que diseñes toda la UI con un estilo 2D pixelado retro (pixel art).

## Contexto del proyecto

La lógica ya está implementada. Los componentes que necesitan UI son:

App.tsx — contenedor principal
StatusBar.tsx — muestra el estado del juego: "Esperando rival...", "Tu turno", "Turno del rival", "¡Ganaste!", "¡Perdiste!", "¡Empate!" y el símbolo del jugador (X u O)
Board.tsx — grilla 3x3 que mapea el array board y renderiza 9 Cell
Cell.tsx — cada celda individual, puede tener valor 'X', 'O' o null, tiene un onClick

## Props disponibles

StatusBar recibe: appState ('idle' | 'waiting' | 'playing' | 'finished'), gameState (board, currentTurn, winner, gameOver), mySymbol ('X' | 'O' | null)
Board recibe: gameState, mySymbol, onMove(index)
Cell recibe: value ('X' | 'O' | null), index, onClick(index)

## Estilo deseado: Pixel Art 2D Retro

- Fuente pixelada (Press Start 2P de Google Fonts)
- Paleta de colores oscura estilo retro gaming (fondo oscuro, colores neón o vibrantes para X y O)
- Bordes con efecto pixel (sin border-radius, bordes cuadrados)
- Efecto de hover en las celdas vacías (highlight pixelado)
- X y O con estilo visual fuerte y diferenciado por color (por ejemplo X en rojo neón, O en azul neón)
- Animación sutil al colocar una pieza
- StatusBar con aspecto de HUD de videojuego retro
- Todo con CSS puro o Tailwind, sin librerías de UI externas

## Lo que necesito

Antes de generar el código, mostrame 3 opciones de paletas de colores / estilos visuales distintos para que elija:
- Opción A: estilo arcade oscuro (fondo negro, neón)
- Opción B: estilo Game Boy (paleta verde/gris)
- Opción C: estilo retro consola (azul oscuro, dorado)

Cuando elija una, generá el código completo de los 4 componentes con los estilos aplicados, respetando exactamente las props y la lógica existente sin modificarla.
```

> Claude Code leyó el proyecto completo, presentó las 3 opciones con preview de paletas y generó el código final de todos los componentes una vez seleccionada la opción elegida.

### Visual Companion — exploración de paletas en el navegador

Al activar la skill de brainstorm, Claude Code ofreció usar el **Visual Companion**: un servidor local que abre automáticamente una página en el navegador mostrando mockups interactivos de las opciones de diseño. En vez de describir los colores con texto, los renderiza directamente para que se vea cómo quedaría el tablero real antes de escribir una sola línea de CSS.

Se presentaron y exploraron varias opciones de paleta en iteraciones sucesivas:

| Opción | Descripción |
|---|---|
| Arcade | Fondo negro puro, neón verde y rojo |
| Game Boy | Verde monocromático sin color |
| Retro Console | Azul marino, dorado, tipo NES |
| CRT Monitor | Verde fósforo sobre negro |
| Midnight | Azul noche, plata |
| Lava | Naranja y rojo sobre fondo oscuro |
| **Synthwave** | Púrpura oscuro, rosa neón, cian eléctrico |

Después de pedir variantes adicionales más exóticas, la paleta elegida fue **Synthwave**.

### Paleta Synthwave

| Token CSS | Valor hex | Uso |
|---|---|---|
| `--color-synth-bg` | `#1a0533` | Fondo de pantalla completo |
| `--color-synth-surface` | `#2d1b69` | Celdas del tablero y paneles |
| `--color-synth-border` | `#7209b7` | Líneas divisorias del tablero |
| `--color-synth-x` | `#f72585` | Símbolo X — rosa neón |
| `--color-synth-o` | `#4cc9f0` | Símbolo O — cian eléctrico |
| `--color-synth-gold` | `#ffd700` | Victoria / turno propio |
| `--color-synth-accent` | `#b5179e` | Indicador de turno del rival |
| `--color-synth-text` | `#e0d0ff` | Texto general |

### Tailwind CSS v4

Para los estilos se usó **Tailwind CSS v4**, que tiene una configuración completamente distinta a la v3.

**En v3** la configuración vivía en un archivo JavaScript separado:
```js
// tailwind.config.js (v3)
module.exports = {
  theme: {
    extend: {
      colors: { 'synth-bg': '#1a0533' }
    }
  }
}
```

**En v4** se configura directamente en CSS con el bloque `@theme`, sin archivo de configuración:
```css
/* index.css (v4) */
@import "tailwindcss";

@theme {
  --color-synth-bg: #1a0533;
  --color-synth-surface: #2d1b69;
  /* ... */
}
```

Tailwind v4 lee esas variables CSS y genera automáticamente las clases utilitarias correspondientes: `bg-synth-bg`, `text-synth-x`, `border-synth-border`, etc. Además tiene un plugin oficial para Vite que lo integra en el mismo paso de build, sin proceso CSS separado:

```bash
npm install -D @tailwindcss/vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

### Fuente pixelada — Press Start 2P

La fuente se agrega desde Google Fonts en `client/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

Y se registra en `@theme` para poder usarla como clase de Tailwind:

```css
@theme {
  --font-pixel: 'Press Start 2P', monospace;
}
```

Esto habilita la clase `font-pixel` en cualquier elemento: `<h1 className="font-pixel">`.

### Utilities custom — efectos neón y animaciones

Dentro de `@layer utilities` definimos clases que Tailwind no tiene por defecto:

```css
@layer utilities {
  .glow-x {
    text-shadow: 0 0 8px #f72585, 0 0 20px #f72585, 0 0 40px #b5179e;
  }
  .glow-o {
    text-shadow: 0 0 8px #4cc9f0, 0 0 20px #4cc9f0, 0 0 40px #0077b6;
  }
  .glow-gold {
    text-shadow: 0 0 8px #ffd700, 0 0 20px #ffd700;
  }
  .pixel-blink {
    animation: blink 1s step-end infinite;
  }
  .piece-pop {
    animation: piece-pop 0.2s ease-out forwards;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
}

@keyframes piece-pop {
  0%   { transform: scale(0); }
  70%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

#### ¿Qué hace cada utility?

- **`.glow-x` / `.glow-o` / `.glow-gold`** — el efecto neón usa `text-shadow` en capas concéntricas: la primera (8px) da el borde luminoso nítido, las siguientes (20px, 40px) se difuminan para el resplandor exterior. Cada una tiene su propio color para X, O y victoria.

- **`.pixel-blink`** — usa `step-end` como función de timing en vez de `ease`. Esto hace que la opacidad salte discretamente entre los keyframes sin interpolación, exactamente como un cursor de terminal parpadeando.

- **`.piece-pop`** — la pieza aparece desde escala 0, sube a 1.2 (overshooting) y vuelve a 1. El rebote da feedback visual inmediato de que la jugada se registró. El `forwards` mantiene el estado final al terminar la animación.

### Skill: Subagent-Driven Development

Para implementar el diseño se usó la skill de **Subagent-Driven Development**. En vez de escribir todos los archivos de una vez, el trabajo se divide en tareas y para cada una se lanzan tres agentes especializados en secuencia:

1. **Subagente implementador** — recibe la tarea con el contexto mínimo necesario y escribe el código
2. **Subagente revisor de spec** — verifica que lo implementado coincida con lo especificado, sin agregar ni faltar nada
3. **Subagente revisor de calidad** — verifica que el código sea correcto, limpio y sin problemas

Si algún revisor encuentra algo, el implementador lo corrige antes de pasar a la siguiente tarea. Esto evita que los errores se acumulen entre archivos.

Las tareas ejecutadas fueron:

| # | Tarea | Archivos modificados |
|---|---|---|
| 1 | Instalar Tailwind v4 y configurar el plugin de Vite | `vite.config.ts`, `package.json` |
| 2 | Definir tokens Synthwave y utilities en `index.css` | `src/index.css` |
| 3 | Aplicar estilos Synthwave al layout de App | `src/App.tsx` |
| 4 | Aplicar estilos al HUD de StatusBar | `src/components/StatusBar.tsx` |
| 5 | Aplicar estilos al tablero Board y celdas Cell | `src/components/Board.tsx`, `src/components/Cell.tsx` |

### Resultado — componentes finales

#### `App.tsx` — layout centrado

```tsx
function App() {
  const { gameState, appState, mySymbol, handleMove } = useGame()

  const showBoard = appState === 'playing' || appState === 'finished'

  return (
    <div className="min-h-screen bg-synth-bg flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="font-pixel text-synth-gold glow-gold text-xl tracking-widest m-0">
        TATETI
      </h1>
      <StatusBar appState={appState} gameState={gameState} mySymbol={mySymbol} />
      {showBoard && (
        <Board gameState={gameState} mySymbol={mySymbol} onMove={handleMove} />
      )}
    </div>
  )
}
```

#### `StatusBar.tsx` — HUD con colores dinámicos según el estado del juego

```tsx
const StatusBar = ({ appState, gameState, mySymbol }: StatusBarProps) => {
  const getMessage = (): string => {
    if (appState === 'idle') return 'Conectando...'
    if (appState === 'waiting') return 'Esperando rival...'
    if (appState === 'finished') {
      if (gameState?.winner === 'draw') return '¡Empate!'
      if (gameState?.winner === mySymbol) return '¡Ganaste!'
      return '¡Perdiste!'
    }
    if (gameState?.currentTurn === mySymbol) return 'Tu turno'
    return 'Turno del rival'
  }

  const getMessageClass = (): string => {
    if (appState === 'idle') return 'text-synth-text'
    if (appState === 'waiting') return 'text-synth-text pixel-blink'
    if (appState === 'finished') {
      if (gameState?.winner === 'draw') return 'text-synth-text'
      if (gameState?.winner === mySymbol) return 'text-synth-gold glow-gold'
      return 'text-synth-x'
    }
    if (gameState?.currentTurn === mySymbol) return 'text-synth-gold glow-gold'
    return 'text-synth-accent'
  }

  const showSymbol = appState === 'playing' || appState === 'finished'

  return (
    <div className="w-72 bg-synth-surface border-2 border-synth-border px-4 py-3 flex items-center justify-between gap-4">
      <span className={`font-pixel text-xs leading-relaxed ${getMessageClass()}`}>
        {getMessage()}
      </span>
      {showSymbol && mySymbol && (
        <span className={`font-pixel text-base shrink-0 ${mySymbol === 'X' ? 'text-synth-x glow-x' : 'text-synth-o glow-o'}`}>
          {mySymbol}
        </span>
      )}
    </div>
  )
}
```

`getMessageClass` devuelve clases distintas según el estado: dorado con glow cuando es tu turno o ganaste, rosa si perdiste, parpadeo si estás esperando rival.

#### `Board.tsx` y `Cell.tsx` — el truco del gap

El tablero se implementó con un truco de CSS: en vez de dibujar bordes celda por celda, el contenedor tiene `bg-synth-border` (color violeta) y el grid tiene `gap-[3px]`. El fondo del contenedor se "filtra" por los huecos entre celdas, creando las líneas divisorias sin usar `border` en ningún elemento.

```tsx
// Board.tsx
const Board = ({ gameState, mySymbol, onMove }: BoardProps) => {
  return (
    <div className="grid grid-cols-3 gap-[3px] bg-synth-border p-[3px] w-72">
      {gameState?.board.map((cell, index) => (
        <Cell key={index} value={cell} index={index} onClick={onMove} />
      ))}
    </div>
  )
}
```

```tsx
// Cell.tsx
const Cell = ({ value, index, onClick }: CellProps) => {
  const isEmpty = value === null

  return (
    <div
      className={`bg-synth-surface aspect-square flex items-center justify-center ${
        isEmpty
          ? 'cursor-pointer hover:bg-white/10 transition-colors duration-100'
          : 'cursor-default'
      }`}
      onClick={() => onClick(index)}
    >
      {value && (
        <span
          className={`font-pixel text-3xl piece-pop ${
            value === 'X' ? 'text-synth-x glow-x' : 'text-synth-o glow-o'
          }`}
        >
          {value}
        </span>
      )}
    </div>
  )
}
```

`aspect-square` hace que cada celda sea siempre cuadrada sin importar el contenedor. El hover solo aplica a celdas vacías (`isEmpty`) para no dar sensación de interactividad donde no hay. La pieza solo se renderiza si `value` tiene contenido, y cuando aparece ejecuta la animación `piece-pop`.

---

## 15. Corrección de bugs con Claude Code

Con la UI lista, pedimos a Claude Code que revisara el código en busca de bugs. Usó la skill de **Systematic Debugging**, que exige encontrar la causa raíz de cada problema antes de proponer una solución.

Se encontraron y corrigieron 5 bugs.

---

### Bug 1 — Servidor no validaba de quién era el turno

**Archivo:** `server/index.ts`  
**Severidad:** Media-alta

**Problema:**  
El handler `move` procesaba cualquier evento sin verificar si era el turno de ese jugador. Un cliente podía abrir la consola del navegador y emitir `socket.emit("move", 4)` para jugar en nombre de su rival. El servidor ejecutaba el movimiento usando `state.currentTurn` (el turno del rival), efectivamente haciéndolo jugar.

**Root cause:**  
No había mapping entre `socketId` y el símbolo asignado a ese socket. La única validación existía en el cliente, dentro de `handleMove`:

```ts
const isMyTurn = gameState?.currentTurn === mySymbol
```

Pero esa validación es bypasseable: cualquier cliente puede ignorar la UI y emitir eventos directamente al servidor. La seguridad del juego no puede depender del cliente.

**Fix:**  
Se agregó `playerSymbol = new Map<string, "X" | "O">()` para persistir qué símbolo tiene cada socket. Al asignar símbolos, se guarda la entrada. En el handler `move` se verifica antes de procesar:

```ts
// Al hacer start:
players.forEach((playerId, i) => {
  const symbol = i === 0 ? 'X' : 'O'
  playerSymbol.set(playerId, symbol)
  io.to(playerId).emit('start', { state, symbol })
})

// En el handler move:
socket.on('move', (index: number) => {
  const symbol = playerSymbol.get(socket.id)
  if (symbol !== state.currentTurn) return // no es tu turno
  // ...
})
```

---

### Bug 2 — Memory leak en `playerRoom` al desconectar

**Archivo:** `server/index.ts`  
**Severidad:** Baja

**Problema:**  
En el handler `disconnect`, solo se eliminaba la entrada del socket que se desconectó:

```ts
playerRoom.delete(socket.id)
```

La entrada del rival quedaba en el Map apuntando a un `roomId` ya eliminado. En una sesión con muchas partidas, los Maps `playerRoom` y `playerSymbol` crecían indefinidamente.

**Root cause:**  
El disconnect handler no tenía forma de identificar al rival para limpiar su entrada también. El equipo olvidó iterar los sockets restantes de la room antes de eliminarla.

**Fix:**  
Luego de eliminar la room, se itera el adapter de Socket.io para obtener los sockets conectados a esa room y limpiar sus entradas también:

```ts
socket.on('disconnect', () => {
  const roomId = playerRoom.get(socket.id)

  if (roomId) {
    socket.to(roomId).emit('opponent_left')
    rooms.delete(roomId)
    playerRoom.delete(socket.id)
    playerSymbol.delete(socket.id)

    // Limpiar entradas del rival
    const remaining = io.sockets.adapter.rooms.get(roomId)
    if (remaining) {
      for (const otherId of remaining) {
        playerRoom.delete(otherId)
        playerSymbol.delete(otherId)
      }
    }
  }
})
```

> El adapter mantiene la room disponible brevemente incluso después de emitir `opponent_left`, lo que da la ventana para iterar y limpiar.

---

### Bug 3 — Usuario quedaba trabado tras desconexión del rival

**Archivo:** `client/src/hooks/useGame.ts`  
**Severidad:** Media

**Problema:**  
Al recibir el evento `opponent_left`, el hook reseteaba el estado a `idle` pero nunca volvía a emitir `join`. El StatusBar mostraba "Conectando..." de forma permanente y el usuario debía recargar la página para poder jugar otra partida.

**Root cause:**  
El diseño original no contempló el re-uso de la conexión. El `socket.emit("join")` solo ocurría una vez: en el `useEffect` inicial al montar el componente. No había ningún trigger para volver a unirse cuando el rival se fuera.

```ts
// Código original — no había re-join
socket.on('opponent_left', () => {
  setAppState('idle')
  setGameState(null)
  setMySymbol(null)
  // ← el jugador queda colgado acá indefinidamente
})
```

**Fix:**  
En el handler `opponent_left` se re-encola al jugador automáticamente y se pasa a `waiting` de forma optimista:

```ts
socket.on('opponent_left', () => {
  setGameState(null)
  setMySymbol(null)
  setAppState('waiting') // optimista: muestra "Esperando rival..." de inmediato
  socket.emit('join')    // vuelve a la cola sin recargar
})
```

---

### Bug 4 — React Strict Mode causaba doble `join`

**Archivo:** `server/index.ts`  
**Severidad:** Baja

**Problema:**  
En desarrollo, `<React.StrictMode>` ejecuta cada `useEffect` **dos veces** (mount → cleanup → mount) para detectar side effects no idempotentes. El resultado era que el socket emitía `join` dos veces desde el mismo `socket.id`.

En un caso de carrera extremo —otro jugador se une entre los dos mounts— el segundo `join` del mismo socket podría crear una sala nueva y sobreescribir el estado del juego en curso.

**Root cause:**  
El servidor asumía que cada evento `join` venía de un socket nuevo y no tenía ninguna guarda para el caso de que el mismo socket volviera a unirse.

**Fix:**  
Se agrega un guard al inicio del handler que ignora los joins de un socket que ya está registrado:

```ts
socket.on('join', () => {
  if (playerRoom.has(socket.id)) return // ya registrado, ignorar
  // ... resto del handler
})
```

> Este bug no afecta producción (Strict Mode solo corre en `NODE_ENV=development`), pero generaba comportamiento inesperado durante el desarrollo.

---

### Bug 5 — Board visible como barra vacía durante la espera

**Archivo:** `client/src/App.tsx`  
**Severidad:** Cosmética

**Problema:**  
`gameState` inicia como `null`. `gameState?.board.map(...)` devuelve `undefined`, por lo que el Board se renderiza sin celdas. Pero el `div` contenedor del tablero seguía presente con sus clases de layout y fondo (`w-72 bg-synth-border p-[3px]`), resultando en un rectángulo violeta de `288px × 6px` visible durante los estados `idle` y `waiting`.

**Root cause:**  
El Board se renderizaba incondicionalmente en `App.tsx`, sin importar el `appState`. El diseño original no tuvo en cuenta que el contenedor del Board tiene estilos propios visibles aunque no tenga hijos.

**Fix:**  
Se agrega un flag de renderizado condicional basado en el `appState`:

```tsx
// Solo mostrar el tablero cuando hay una partida activa
const showBoard = appState === 'playing' || appState === 'finished'

return (
  <div className="min-h-screen bg-synth-bg flex flex-col items-center justify-center gap-6 p-6">
    <h1 className="font-pixel text-synth-gold glow-gold text-xl tracking-widest m-0">
      TATETI
    </h1>
    <StatusBar appState={appState} gameState={gameState} mySymbol={mySymbol} />
    {showBoard && (
      <Board gameState={gameState} mySymbol={mySymbol} onMove={handleMove} />
    )}
  </div>
)
```

Durante los estados `idle` y `waiting` el Board directamente no existe en el DOM, así que el problema desaparece sin necesidad de manejar el estado vacío dentro del componente.

---

## 16. Deploy — Cliente en Vercel, Servidor en Railway

Una vez terminado el desarrollo local, desplegamos ambas partes del proyecto en servicios en la nube.

### ¿Por qué no Vercel para el servidor?

Vercel es una plataforma de **funciones serverless**: cada request levanta una función efímera, la ejecuta y la destruye. Esto es incompatible con Socket.io por dos razones:

1. **Conexiones persistentes:** Socket.io requiere mantener una conexión abierta (WebSocket o long-polling) durante toda la partida. Las funciones de Vercel tienen un timeout de 10-30 segundos y no pueden mantener conexiones vivas.

2. **Estado en memoria:** El servidor guarda las rooms, jugadores y estado del juego en Maps (`rooms`, `playerRoom`, `playerSymbol`). En un entorno serverless ese estado se pierde entre invocaciones porque cada función corre en un proceso aislado sin memoria compartida.

El cliente React, en cambio, es un build estático de archivos HTML/CSS/JS que Vercel sirve desde su CDN sin ningún problema.

### Railway para el servidor

**Railway** es una plataforma de deploy para aplicaciones con servidor persistente. A diferencia de Vercel, corre el proceso Node.js de forma continua, lo que permite mantener conexiones WebSocket abiertas y estado en memoria durante toda la vida de la instancia.

#### Configuración necesaria en el servidor

Se agrega un script `start` en `server/package.json` que compila el TypeScript y luego ejecuta el resultado:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node index.ts"
  }
}
```

Railway detecta automáticamente que es un proyecto Node.js, ejecuta `npm run build` y luego `npm start`.

#### Variable de entorno — puerto dinámico

Railway asigna el puerto de forma dinámica mediante la variable de entorno `PORT`. El servidor debe leerla:

```ts
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`)
})
```

#### Configuración del cliente

Una vez que Railway asigna una URL pública al servidor (por ejemplo `https://tateti-server.up.railway.app`), se actualiza la variable de entorno del cliente en Vercel:

```
VITE_SERVER_URL=https://tateti-server.up.railway.app
```

El cliente ya usa esa variable en `socket.ts` para conectarse, por lo que no requiere cambios en el código.

---

## 17. Corrección de errores de deploy en Railway

Al intentar deployar el servidor en Railway aparecieron dos errores que requirieron fixes en el código.

---

### Error 1 — `Cannot find module '/app/index.js'`

**Problema:**
Railway ejecuta `npm start` para levantar el servidor. Como `package.json` no tenía un script `start`, Node intentó correr directamente el archivo indicado en el campo `"main": "index.js"`. Ese archivo no existía porque el TypeScript nunca había sido compilado: no había ningún script `build` que corriera `tsc`.

**Fix en `package.json`:**
Se agregaron los scripts `build` y `start`:

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js",
  "dev": "ts-node index.ts"
}
```

- `build` compila todo el TypeScript a JavaScript en la carpeta `dist/`
- `start` ejecuta el resultado compilado
- `dev` sigue usando `ts-node` para desarrollo local (sin compilar)

**Fix en `tsconfig.json`:**
La opción `outDir` estaba comentada, por lo que `tsc` no sabía dónde poner los archivos compilados. Se descomentó para apuntar a `dist/`:

```json
"outDir": "./dist"
```

Sin esto, aunque se corriera `tsc`, el archivo `dist/index.js` nunca se generaba y `npm start` fallaba igual.

---

### Error 2 — CORS bloqueado por el navegador

**Problema:**
Al abrir el cliente en Vercel (`https://tateti-realtime.vercel.app`) e intentar conectarse al servidor en Railway (`https://tateti-realtime-production.up.railway.app`), el navegador bloqueaba todas las requests con el error:

```
CORS Missing Allow Origin — código de estado 502
```

**¿Qué es CORS?**

CORS (Cross-Origin Resource Sharing) es un mecanismo de seguridad del navegador. Cuando una página web hace una request a un dominio distinto del que la sirvió, el navegador primero le pregunta al servidor destino: "¿permitís requests desde este origen?". El servidor responde con una cabecera HTTP:

```
Access-Control-Allow-Origin: https://tateti-realtime.vercel.app
```

Si esa cabecera no está presente o no coincide con el origen del cliente, el navegador cancela la request y muestra el error de CORS. Esto pasa **antes** de que la aplicación vea la respuesta: es el propio navegador quien bloquea.

En desarrollo local esto no era un problema porque cliente y servidor corrían ambos en `localhost`, mismo origen. En producción, son dos dominios completamente distintos, y el bloqueo aparece.

**Root cause:**
El origen permitido estaba hardcodeado en `server/index.ts`:

```ts
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",  // ← solo permite localhost
  },
});
```

En producción, el cliente viene de Vercel, no de `localhost:5173`, así que el servidor rechazaba todas las conexiones.

**Fix:**
Se reemplazó el origen hardcodeado por una variable de entorno `CLIENT_URL`, con `localhost` como fallback para desarrollo:

```ts
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
```

Y en el dashboard de Railway se configura la variable:

```
CLIENT_URL=https://tateti-realtime.vercel.app
```

---

### Fix adicional — puerto dinámico

El servidor también tenía el puerto hardcodeado:

```ts
const PORT = 3000;
```

Railway asigna el puerto de forma dinámica mediante la variable de entorno `PORT`. Si el servidor intenta escuchar en 3000 y Railway espera que escuche en otro puerto, el deploy falla o el tráfico nunca llega. Se corrigió para leer la variable de entorno:

```ts
const PORT = process.env.PORT || 3000;
```

El `|| 3000` mantiene el comportamiento en desarrollo local donde `PORT` no está definida.