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

export interface CellProps {
  value: Cell
  index: number
  onClick: (index: number) => void
  isMyTurn: boolean
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
  opponentName: string | null
}

export interface PlayerPanelProps {
  name: string | null
  symbol: PlayerSymbol | null
  isActive: boolean
  gameOver: boolean
  isWinner: boolean
  isDraw: boolean
}