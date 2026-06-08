import { useEffect, useState } from "react";
import socket from "../socket";
import type { AppState, PlayerSymbol, GameState } from "../types";

export const useGame = () => {
  const [appState, setAppState] = useState<AppState>("idle");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [mySymbol, setMySymbol] = useState<PlayerSymbol | null>(null);

  useEffect(() => {
    socket.emit("join");

    socket.on("waiting", () => {
      setAppState("waiting");
    });

    socket.on(
      "start",
      ({ state, symbol }: { state: GameState; symbol: PlayerSymbol }) => {
        setGameState(state);
        setMySymbol(symbol);
        setAppState("playing");
      }
    );

    socket.on("update", (state: GameState) => {
      setGameState(state);
      if (state.gameOver) setAppState("finished");
    });

    socket.on("opponent_left", () => {
      // [Fix 3] Re-encola al jugador automáticamente en lugar de dejarlo
      // trabado en idle. Sin esto el usuario debe recargar la página para
      // poder jugar otra partida.
      setGameState(null);
      setMySymbol(null);
      setAppState("waiting");
      socket.emit("join");
    });

    return () => {
      socket.off("waiting");
      socket.off("start");
      socket.off("update");
      socket.off("opponent_left");
    };
  }, []);

  const handleMove = (index: number) => {
    const isMyTurn = gameState?.currentTurn === mySymbol;
    const canMove = appState === "playing" && isMyTurn && !gameState?.gameOver;

    if (canMove) {
      socket.emit("move", index);
    }
  };

  return { gameState, appState, mySymbol, handleMove };
};
