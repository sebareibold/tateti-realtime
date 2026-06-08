import type { StatusBarProps } from '../types'

const StatusBar = ({ appState, gameState, mySymbol, opponentName }: StatusBarProps) => {
  const getMessage = (): string => {
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
    <div className="w-72 bg-synth-surface border-2 border-synth-border px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <span className={`font-pixel text-xs leading-relaxed ${getMessageClass()}`}>
          {getMessage()}
        </span>
        {showSymbol && mySymbol && (
          <span className={`font-pixel text-base shrink-0 ${mySymbol === 'X' ? 'text-synth-x glow-x' : 'text-synth-o glow-o'}`}>
            {mySymbol}
          </span>
        )}
      </div>
      {opponentName && (
        <span className="font-pixel text-[10px] text-synth-text/60">
          vs {opponentName}
        </span>
      )}
    </div>
  )
}

export default StatusBar
