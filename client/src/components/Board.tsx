import type { BoardProps } from '../types'
import Cell from './Cell'

const Board = ({ gameState, mySymbol, onMove }: BoardProps) => {
  return (
    <div className="grid grid-cols-3 gap-[3px] bg-synth-border p-[3px] w-72">
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