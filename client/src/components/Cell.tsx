import type { CellProps } from '../types'

const Cell = ({ value, index, onClick, isMyTurn }: CellProps) => {
  const isClickable = value === null && isMyTurn

  return (
    <div
      className={`bg-synth-surface aspect-square flex items-center justify-center ${
        isClickable
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

export default Cell
