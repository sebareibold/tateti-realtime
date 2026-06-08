# Tateti Realtime

Juego de Tateti (Tic-Tac-Toe) multijugador en tiempo real, con UI pixel art estilo Synthwave.

## Stack

- **Frontend:** React 19 + TypeScript + Vite 8
- **Estilos:** Tailwind CSS v4 con tema Synthwave custom
- **Realtime:** Socket.io client
- **Backend:** Node.js + Socket.io server (carpeta `server/`)
- **Fuente:** Press Start 2P (Google Fonts)

## Cómo correr el proyecto

```bash
# Terminal 1 — servidor
cd server
npm install
npm start

# Terminal 2 — cliente
cd client
npm install
npm run dev
```

Abrí dos pestañas en `http://localhost:5173` para jugar contra vos mismo.

## Estructura del cliente

```
client/src/
├── hooks/
│   └── useGame.ts          # lógica completa de Socket.io y estado del juego
├── components/
│   ├── StatusBar.tsx        # HUD: estado del juego y símbolo del jugador
│   ├── Board.tsx            # grilla 3×3
│   └── Cell.tsx             # cada celda individual
├── types/
│   └── index.ts             # tipos compartidos (AppState, GameState, props)
├── App.tsx                  # contenedor principal
├── index.css                # tokens Synthwave + utilities Tailwind
└── socket.ts               # instancia singleton de Socket.io
```

## Tema visual: Synthwave Pixel Art

Los colores y efectos están definidos como tokens CSS en `client/src/index.css` mediante el bloque `@theme` de Tailwind v4:

| Token | Valor | Uso |
|---|---|---|
| `--color-synth-bg` | `#1a0533` | Fondo principal |
| `--color-synth-surface` | `#2d1b69` | Celdas y paneles |
| `--color-synth-border` | `#7209b7` | Líneas del tablero |
| `--color-synth-x` | `#f72585` | Símbolo X (rosa neón) |
| `--color-synth-o` | `#4cc9f0` | Símbolo O (cian eléctrico) |
| `--color-synth-accent` | `#b5179e` | Turno rival |
| `--color-synth-text` | `#e0d0ff` | Texto general |
| `--color-synth-gold` | `#ffd700` | Victoria / turno propio |
| `--font-pixel` | Press Start 2P | Fuente pixelada |

Utilities custom definidas en `@layer utilities`:
- `.glow-x` / `.glow-o` / `.glow-gold` — efecto text-shadow neón en 3 capas
- `.pixel-blink` — parpadeo al esperar rival (keyframe `step-end`)
- `.piece-pop` — animación scale 0→1.2→1 al colocar una pieza

## Herramientas de desarrollo

La UI fue diseñada con la asistencia de **Claude Code**, que ayudó con el diseño frontend y la elección del estilo visual Synthwave pixel art.
