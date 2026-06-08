import { useGame } from './hooks/useGame'
import Board from './components/Board'
import StatusBar from './components/StatusBar'

function App() {
  const { gameState, appState, mySymbol, handleMove } = useGame()

  // [Fix 5] El Board solo existe cuando hay una partida activa. Sin esta guarda,
  // durante idle y waiting se renderiza un rectángulo violeta vacío de 6px de alto.
  const showBoard = appState === 'playing' || appState === 'finished'

  return (
    <div className="min-h-screen bg-synth-bg flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="font-pixel text-synth-gold glow-gold text-xl tracking-widest m-0">
        TATETI
      </h1>
      <StatusBar
        appState={appState}
        gameState={gameState}
        mySymbol={mySymbol}
      />
      {showBoard && (
        <Board
          gameState={gameState}
          mySymbol={mySymbol}
          onMove={handleMove}
        />
      )}
    </div>
  )
}

export default App