import type { BoardProps } from '../types'
import Cell from './Cell'

const Board = ({ gameState, mySymbol, onMove }: BoardProps) => {
  const board = gameState?.board ?? Array(9).fill(null)
  const isMyTurn = gameState !== null && gameState.currentTurn === mySymbol

  return (
    <div className="grid grid-cols-3 gap-[3px] bg-synth-border p-[3px] w-72">
      {board.map((cell, index) => (
        <Cell
          key={index}
          value={cell}
          index={index}
          onClick={onMove}
          isMyTurn={isMyTurn}
        />
      ))}
    </div>
  )
}

export default Board
