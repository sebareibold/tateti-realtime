# Explicación del desarrollo

## Stack y arquitectura

El proyecto es un juego de Tateti multijugador en tiempo real. El cliente (React + TypeScript + Vite) se comunica con el servidor (Node.js + Socket.io) mediante WebSockets. La lógica del juego vive completamente en el servidor; el cliente solo renderiza el estado recibido y emite eventos de acción.

---

## Flujo de una partida

1. El cliente monta `App` → `useGame` emite `join`
2. Si no hay sala disponible, el servidor crea una y responde `waiting`
3. Cuando un segundo jugador hace `join`, el servidor emite `start` a ambos con el estado inicial y el símbolo asignado (`X` u `O`)
4. Cada jugada emite `move` con el índice de celda → el servidor valida, actualiza el estado y emite `update` a ambos
5. Si `gameOver === true` en el update, el cliente pasa a estado `finished`
6. Si un jugador se desconecta, el servidor emite `opponent_left` al otro

---

## Diseño de la UI

El estilo visual es **pixel art Synthwave** implementado con **Tailwind CSS v4**. Los colores se definen como tokens en `client/src/index.css` con el bloque `@theme`:

| Token | Valor | Uso |
|---|---|---|
| `--color-synth-bg` | `#1a0533` | Fondo principal |
| `--color-synth-surface` | `#2d1b69` | Celdas y paneles |
| `--color-synth-border` | `#7209b7` | Líneas del tablero |
| `--color-synth-x` | `#f72585` | Símbolo X (rosa neón) |
| `--color-synth-o` | `#4cc9f0` | Símbolo O (cian eléctrico) |
| `--color-synth-gold` | `#ffd700` | Victoria / turno propio |

Utilities custom definidas en `@layer utilities`:
- `.glow-x` / `.glow-o` / `.glow-gold` — `text-shadow` neón en 3 capas
- `.pixel-blink` — parpadeo `step-end` para estado "Esperando rival..."
- `.piece-pop` — animación `scale(0) → scale(1.2) → scale(1)` al colocar pieza

---

## Bugs identificados y corregidos

### Bug 1 — Servidor no validaba de quién era el turno
**Archivo:** `server/index.ts`  
**Severidad:** Media-alta

**Problema:** El handler `move` procesaba cualquier evento de cualquier jugador sin verificar si era su turno. Un cliente podía emitir `socket.emit("move", 4)` desde la consola del navegador y el servidor ejecutaría el movimiento usando `state.currentTurn` (el símbolo del rival), efectivamente jugando en su nombre.

**Root cause:** No había mapping entre `socketId` y símbolo asignado en el servidor. La validación existía solo en el cliente (`handleMove` verifica `gameState.currentTurn === mySymbol`), que puede ser bypasseada.

**Fix:** Se agregó `playerSymbol = new Map<string, "X" | "O">()`. Al asignar símbolos en el evento `join`, se guarda la entrada. En el handler `move` se verifica:
```ts
const symbol = playerSymbol.get(socket.id);
if (symbol !== state.currentTurn) return;
```

---

### Bug 2 — Memory leak en `playerRoom` al desconectar
**Archivo:** `server/index.ts`  
**Severidad:** Baja

**Problema:** En el handler `disconnect`, solo se eliminaba la entrada del socket que se desconectó (`playerRoom.delete(socket.id)`). La entrada del rival quedaba en el Map apuntando a un `roomId` ya eliminado. En una sesión con muchas partidas, los Maps crecían indefinidamente.

**Root cause:** El disconnect handler no tenía forma de identificar al rival porque no había referencia directa. El equipo olvidó iterar los sockets restantes de la room antes de eliminarla.

**Fix:** Tras `rooms.delete(roomId)`, se itera la room via `io.sockets.adapter.rooms.get(roomId)` (que aún existe brevemente en el adapter) y se limpian las entradas del rival:
```ts
const remaining = io.sockets.adapter.rooms.get(roomId);
if (remaining) {
  for (const otherId of remaining) {
    playerRoom.delete(otherId);
    playerSymbol.delete(otherId);
  }
}
```

---

### Bug 3 — Usuario quedaba trabado tras desconexión del rival
**Archivo:** `client/src/hooks/useGame.ts`  
**Severidad:** Media

**Problema:** Al recibir `opponent_left`, el hook reseteaba el estado a `idle` pero nunca volvía a emitir `join`. El StatusBar mostraba "Conectando..." de forma permanente. El usuario debía recargar la página para jugar otra partida.

**Root cause:** El diseño original no contempló el caso de re-uso de la conexión. El `socket.emit("join")` solo ocurría en el `useEffect` inicial (al montar el componente). No había ningún trigger para re-unirse después de que el rival se fuera.

**Fix:** En el handler `opponent_left` se re-encola el jugador automáticamente:
```ts
socket.on("opponent_left", () => {
  setGameState(null);
  setMySymbol(null);
  setAppState("waiting"); // optimista: muestra "Esperando rival..." de inmediato
  socket.emit("join");
});
```

---

### Bug 4 — React Strict Mode causaba doble `join`
**Archivo:** `server/index.ts`  
**Severidad:** Baja

**Problema:** En desarrollo, `<React.StrictMode>` ejecuta cada `useEffect` dos veces (mount → cleanup → mount) para detectar side effects no idempotentes. El socket emitía `join` dos veces desde el mismo `socket.id`. En un caso de carrera extremo (otro jugador se une entre los dos mounts), el segundo `join` podría crear una nueva sala con el mismo `roomId` y sobreescribir el estado del juego en curso.

**Root cause:** El servidor no verificaba si un socket ya había hecho `join` previamente. Asumía que cada evento `join` venía de un socket nuevo.

**Fix:** Guard al inicio del handler en el servidor:
```ts
socket.on("join", () => {
  if (playerRoom.has(socket.id)) return; // ya registrado, ignorar
  // ...
});
```

---

### Bug 5 — Board visible como barra vacía durante la espera
**Archivo:** `client/src/App.tsx`  
**Severidad:** Cosmética

**Problema:** `gameState` inicia como `null`. `gameState?.board.map(...)` devuelve `undefined`, por lo que el Board renderiza sin celdas. Pero el contenedor `div` del Board sigue presente con `w-72 bg-synth-border p-[3px]`, resultando en un rectángulo violeta de `288px × 6px` visible durante los estados `idle` y `waiting`.

**Root cause:** El Board se renderizaba incondicionalmente en `App.tsx` independientemente del `appState`.

**Fix:** Renderizado condicional:
```tsx
const showBoard = appState === 'playing' || appState === 'finished'

{showBoard && <Board gameState={gameState} mySymbol={mySymbol} onMove={handleMove} />}
```
