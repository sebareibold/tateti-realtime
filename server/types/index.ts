
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