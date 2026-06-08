import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { createInitialState, makeMove } from "./gameLogic";
import { GameState } from "./types";

const server = createServer();
const PORT = 3000;

const rooms = new Map<string, GameState>();
const playerRoom = new Map<string, string>();

// [Fix 1 & 2] Mapea cada socket a su símbolo asignado para validar turnos en el servidor
// y poder limpiar la entrada del rival al desconectar.
const playerSymbol = new Map<string, "X" | "O">();

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket: Socket) => {
  console.log("=".repeat(50));
  console.log("Cliente conectado:", socket.id);
  console.log("=".repeat(50));

  socket.on("join", () => {
    // [Fix 4] Ignora joins duplicados del mismo socket (ej: React Strict Mode ejecuta
    // el efecto dos veces en desarrollo, causando que el mismo socket emita "join" dos veces).
    if (playerRoom.has(socket.id)) return;

    let roomId = [...rooms.keys()].find(
      (id) => io.sockets.adapter.rooms.get(id)?.size === 1
    );

    if (!roomId) {
      roomId = `room-${socket.id}`;
      rooms.set(roomId, createInitialState());
    }

    socket.join(roomId);
    playerRoom.set(socket.id, roomId);

    const playersInRoom = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;

    if (playersInRoom === 1) {
      socket.emit("waiting");
    } else {
      const state = rooms.get(roomId)!;
      const players = [...io.sockets.adapter.rooms.get(roomId)!];

      players.forEach((playerId, i) => {
        const symbol = i === 0 ? "X" : "O";
        // [Fix 1] Persistimos el símbolo de cada jugador para poder validar turnos
        playerSymbol.set(playerId, symbol as "X" | "O");
        io.to(playerId).emit("start", { state, symbol });
      });
    }
  });

  socket.on("move", (index: number) => {
    const roomId = playerRoom.get(socket.id);
    const state = roomId ? rooms.get(roomId) : null;

    if (roomId && state) {
      // [Fix 1] Rechaza el movimiento si no es el turno de este jugador.
      // Sin esto, cualquier cliente conectado puede mover en nombre del rival.
      const symbol = playerSymbol.get(socket.id);
      if (symbol !== state.currentTurn) return;

      const newState = makeMove(state, index);
      rooms.set(roomId, newState);
      io.to(roomId).emit("update", newState);
    }
  });

  socket.on("disconnect", () => {
    const roomId = playerRoom.get(socket.id);

    if (roomId) {
      socket.to(roomId).emit("opponent_left");
      rooms.delete(roomId);
      playerRoom.delete(socket.id);
      playerSymbol.delete(socket.id);

      // [Fix 2] Limpia también las entradas del rival para evitar el memory leak.
      // Sin esto, playerRoom y playerSymbol acumulan entradas huérfanas hasta
      // que el rival también se desconecta.
      const remaining = io.sockets.adapter.rooms.get(roomId);
      if (remaining) {
        for (const otherId of remaining) {
          playerRoom.delete(otherId);
          playerSymbol.delete(otherId);
        }
      }
    }

    console.log("Cliente desconectado:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log("=".repeat(50));
});
