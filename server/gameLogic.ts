import { GameResult, Player, Board, GameState } from "./types";

export const createInitialState = (): GameState => ({
  board: Array(9).fill(null),
  currentTurn: "X",
  winner: null,
  gameOver: false,
});

const WIN_COMBINATIONS: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const checkWinner = (board: Board): GameResult => {
  let ganador: GameResult = null;
  let i = 0;

  // Recorremos cada combinación ganadora hasta encontrar una o quedarnos sin opciones
  while (i < WIN_COMBINATIONS.length && ganador === null) {
    const combination = WIN_COMBINATIONS[i];

    if (combination) {
      const [a, b, c] = combination;

      // Si las tres celdas tienen el mismo jugador, ese jugador ganó
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        ganador = board[a] as GameResult;
      }
    }
    i++;
  }

  // Si no hay ganador pero el tablero está lleno, es empate
  if (ganador === null && board.every((cell) => cell !== null)) {
    ganador = "draw";
  }

  return ganador;
};

export const makeMove = (state: GameState, index: number): GameState => {
  let newState = { ...state };

  // Ignoramos el movimiento si el juego ya termino o la celda esta ocupada
  if (!state.gameOver && state.board[index] === null) {
    const newBoard = [...state.board];
    newBoard[index] = state.currentTurn;

    const winner = checkWinner(newBoard);

    newState = {
      board: newBoard,
      currentTurn: state.currentTurn === "X" ? "O" : "X",
      winner,
      gameOver: winner !== null,
    };
  }

  return newState;
};
