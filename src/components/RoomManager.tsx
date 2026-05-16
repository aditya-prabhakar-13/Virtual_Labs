"use client";

import React, { useState, useEffect } from "react";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  type RoomUser,
  type RoomJoinedPayload,
  type RoomUsersPayload,
} from "@/lib/socket";

interface RoomManagerProps {
  onRoomJoined: (roomId: string, isHost: boolean) => void;
  onRoomLeft: () => void;
  onHostPromoted: () => void;
}

export default function RoomManager({
  onRoomJoined,
  onRoomLeft,
  onHostPromoted,
}: RoomManagerProps) {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [currentRoom, setCurrentRoom] = useState("");
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  const handleJoin = () => {
    if (!roomId.trim() || !username.trim()) return;

    setIsConnecting(true);
    const socket = connectSocket();

    socket.on("connect", () => {
      socket.emit("room:join", { roomId: roomId.trim(), username: username.trim() });
    });

    socket.on("room:joined", (data: RoomJoinedPayload) => {
      setJoined(true);
      setCurrentRoom(data.roomId);
      setIsHost(data.isHost);
      setUsers(data.users);
      setIsConnecting(false);
      onRoomJoined(data.roomId, data.isHost);
    });

    socket.on("room:users", (data: RoomUsersPayload) => {
      setUsers(data.users);
      const socket = getSocket();
      setIsHost(data.hostId === socket.id);
    });

    socket.on("room:promoted", () => {
      setIsHost(true);
      onHostPromoted();
    });

    // If already connected, emit join immediately
    if (socket.connected) {
      socket.emit("room:join", { roomId: roomId.trim(), username: username.trim() });
    }
  };

  const handleLeave = () => {
    const socket = getSocket();
    socket.emit("room:leave");
    disconnectSocket();
    setJoined(false);
    setCurrentRoom("");
    setUsers([]);
    setIsHost(false);
    onRoomLeft();
  };

  const generateRoomId = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "";
    for (let i = 0; i < 6; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    setRoomId(id);
  };

  // Not joined — show join form
  if (!joined) {
    return (
      <div
        className="absolute top-4 right-4 z-30 flex flex-col gap-3 p-4 rounded-2xl w-72"
        style={{
          background: "rgba(18, 18, 26, 0.9)",
          backdropFilter: "blur(16px)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--accent-orange)", boxShadow: "0 0 6px var(--accent-orange)" }}
          />
          <span className="text-xs font-mono uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Offline
          </span>
        </div>

        <input
          type="text"
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all duration-200 focus:ring-2"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none transition-all duration-200 focus:ring-2"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={generateRoomId}
            title="Generate random Room ID"
            className="px-2.5 py-2 rounded-lg text-xs transition-all duration-200 hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            🎲
          </button>
        </div>

        <button
          onClick={handleJoin}
          disabled={!roomId.trim() || !username.trim() || isConnecting}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
            color: "#0a0a0f",
          }}
        >
          {isConnecting ? "Connecting..." : "Join Room"}
        </button>
      </div>
    );
  }

  // Joined — show room info
  return (
    <div
      className="absolute top-4 right-4 z-30 flex flex-col gap-2 p-3 rounded-2xl w-64"
      style={{
        background: "rgba(18, 18, 26, 0.9)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Room header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--accent-green)", boxShadow: "0 0 6px var(--accent-green)" }}
          />
          <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
            Room
          </span>
          <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>
            {currentRoom}
          </span>
        </div>
        <button
          onClick={handleLeave}
          className="text-xs px-2 py-1 rounded-md transition-all duration-200 hover:scale-105"
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            color: "var(--accent-red)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          Leave
        </button>
      </div>

      {/* Host badge */}
      {isHost && (
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs w-fit"
          style={{
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.2)",
            color: "var(--accent-orange)",
          }}
        >
          👑 You are the host
        </div>
      )}

      {/* User list */}
      <div className="flex flex-col gap-1 mt-1">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 px-2 py-1 rounded-md text-xs"
            style={{
              background: "rgba(255,255,255,0.03)",
              color: "var(--text-primary)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent-green)" }}
            />
            {user.username}
            {user.id === getSocket().id && (
              <span style={{ color: "var(--text-secondary)" }}>(you)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
