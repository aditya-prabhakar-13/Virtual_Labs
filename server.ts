import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface RoomState {
  hostId: string | null;
  users: Map<string, { id: string; username: string }>;
}

const rooms = new Map<string, RoomState>();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // --- ROOM MANAGEMENT ---
    socket.on("room:join", ({ roomId, username }: { roomId: string; username: string }) => {
      // Create room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          hostId: null,
          users: new Map(),
        });
      }

      const room = rooms.get(roomId)!;
      room.users.set(socket.id, { id: socket.id, username });

      // First user becomes host
      if (!room.hostId) {
        room.hostId = socket.id;
      }

      socket.join(roomId);
      (socket as any)._roomId = roomId;

      // Notify everyone in the room
      const userList = Array.from(room.users.values());
      io.to(roomId).emit("room:users", {
        users: userList,
        hostId: room.hostId,
        userCount: userList.length,
      });

      // Tell the joining user if they are host
      socket.emit("room:joined", {
        roomId,
        isHost: room.hostId === socket.id,
        hostId: room.hostId,
        users: userList,
      });

      console.log(`[Room] ${username} (${socket.id}) joined room ${roomId}. Users: ${userList.length}. Host: ${room.hostId}`);
    });

    socket.on("room:leave", () => {
      handleLeaveRoom(socket);
    });

    // --- PHYSICS SYNC ---
    // Host broadcasts physics state snapshots
    socket.on("physics:snapshot", ({ roomId, snapshot }: { roomId: string; snapshot: any }) => {
      // Only relay from the host
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id) {
        socket.to(roomId).emit("physics:snapshot", snapshot);
      }
    });

    // Any user spawns/deletes/constrains — broadcast action to all
    socket.on("physics:action", ({ roomId, action }: { roomId: string; action: any }) => {
      socket.to(roomId).emit("physics:action", action);
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      handleLeaveRoom(socket);
    });
  });

  function handleLeaveRoom(socket: any) {
    const roomId = socket._roomId as string | undefined;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.users.delete(socket.id);
    socket.leave(roomId);
    delete socket._roomId;

    // If room is empty, clean up
    if (room.users.size === 0) {
      rooms.delete(roomId);
      console.log(`[Room] Room ${roomId} deleted (empty)`);
      return;
    }

    // If the host left, promote the next user
    if (room.hostId === socket.id) {
      const nextHost = room.users.keys().next().value;
      room.hostId = nextHost || null;
      console.log(`[Room] Host left room ${roomId}. New host: ${room.hostId}`);

      // Tell the new host they're promoted
      if (room.hostId) {
        io.to(room.hostId).emit("room:promoted", { roomId });
      }
    }

    // Broadcast updated user list
    const userList = Array.from(room.users.values());
    io.to(roomId).emit("room:users", {
      users: userList,
      hostId: room.hostId,
      userCount: userList.length,
    });
  }

  httpServer.listen(port, () => {
    console.log(`\n  ▲ Virtual-Lab Server ready`);
    console.log(`  - Local:    http://${hostname}:${port}`);
    console.log(`  - Socket.io: attached\n`);
  });
});
