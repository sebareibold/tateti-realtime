import { useState } from 'react'
import { useGame } from './hooks/useGame'
import Board from './components/Board'
import StatusBar from './components/StatusBar'

function App() {
  const { gameState, appState, mySymbol, opponentName, joinGame, handleMove } = useGame()
  const [nameInput, setNameInput] = useState('')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (nameInput.trim()) joinGame(nameInput.trim())
  }

  return (
    <div className="min-h-screen bg-synth-bg flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="font-pixel text-synth-gold glow-gold text-xl tracking-widest m-0">
        TATETI
      </h1>

      {appState === 'idle' ? (
        <form onSubmit={handleJoin} className="flex flex-col items-center gap-4">
          <input
            className="font-pixel text-xs bg-synth-surface border-2 border-synth-border text-synth-text px-3 py-2 w-72 outline-none focus:border-synth-gold caret-synth-gold"
            placeholder="Tu nombre..."
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            maxLength={12}
            autoFocus
          />
          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="font-pixel text-xs text-synth-gold border-2 border-synth-gold px-6 py-2 hover:bg-synth-gold hover:text-synth-bg transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            JUGAR
          </button>
        </form>
      ) : (
        <>
          <StatusBar
            appState={appState}
            gameState={gameState}
            mySymbol={mySymbol}
            opponentName={opponentName}
          />
          <Board
            gameState={gameState}
            mySymbol={mySymbol}
            onMove={handleMove}
          />
        </>
      )}
    </div>
  )
}

export default App
