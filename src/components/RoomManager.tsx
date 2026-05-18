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

// Stable avatar gradient per username
function avatarGradient(name: string): string {
  const palettes = [
    ["#00d2ff", "#3a7bfd"],
    ["#a855f7", "#ec4899"],
    ["#22c55e", "#00d2ff"],
    ["#f59e0b", "#ef4444"],
    ["#ec4899", "#a855f7"],
    ["#3a7bfd", "#a855f7"],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const [a, b] = palettes[Math.abs(hash) % palettes.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function UserAvatar({ user, isYou }: { user: RoomUser; isYou: boolean }) {
  const initial = (user.username || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="relative group">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shadow"
        style={{
          background: avatarGradient(user.username || "?"),
          boxShadow: "0 0 0 2px rgba(20,20,30,0.9)",
        }}
      >
        {initial}
      </div>
      <div
        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full vl-pulse"
        style={{
          background: "var(--accent-green)",
          boxShadow: "0 0 6px var(--accent-green), 0 0 0 2px rgba(20,20,30,0.9)",
        }}
      />
      <div
        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity vl-glass-strong"
        style={{ color: "var(--text-primary)" }}
      >
        {user.username}{isYou ? " (you)" : ""}
      </div>
    </div>
  );
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
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const s = getSocket();
      setIsHost(data.hostId === s.id);
    });

    socket.on("room:promoted", () => {
      setIsHost(true);
      onHostPromoted();
    });

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

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(currentRoom);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  // OFFLINE — join form (compact pill that expands)
  if (!joined) {
    return (
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30">
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="vl-glass-strong flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl transition-all hover:scale-[1.02]"
            style={{ borderRadius: "999px" }}
          >
            <div
              className="w-2 h-2 rounded-full vl-pulse"
              style={{ background: "var(--accent-orange)", boxShadow: "0 0 6px var(--accent-orange)" }}
            />
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Offline
            </span>
            <span className="text-xs font-semibold" style={{ color: "var(--accent-cyan)" }}>
              Join Room →
            </span>
          </button>
        ) : (
          <div
            className="vl-glass-strong flex flex-col gap-2.5 p-3 rounded-2xl w-[340px]"
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full vl-pulse"
                  style={{ background: "var(--accent-orange)", boxShadow: "0 0 6px var(--accent-orange)" }}
                />
                <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Join a Room
                </span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-sm"
                style={{ color: "var(--text-muted)" }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-soft)",
                color: "var(--text-primary)",
              }}
            />

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none tracking-widest"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border-soft)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={generateRoomId}
                title="Generate random Room ID"
                className="px-3 py-2 rounded-lg text-xs transition-all hover:scale-[1.04]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border-soft)",
                  color: "var(--text-secondary)",
                }}
              >
                🎲
              </button>
            </div>

            <button
              onClick={handleJoin}
              disabled={!roomId.trim() || !username.trim() || isConnecting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #00d2ff, #a855f7)",
                color: "#0a0a0f",
                boxShadow: "0 4px 18px rgba(0,210,255,0.25)",
              }}
            >
              {isConnecting ? "Connecting..." : "Join Room"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // JOINED — horizontal pill with title + room id + avatars
  const myId = (() => {
    try {
      return getSocket().id;
    } catch {
      return undefined;
    }
  })();

  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30">
      <div
        className="vl-glass-strong flex items-center gap-4 pl-4 pr-3 py-2.5 rounded-2xl"
      >
        {/* Title block */}
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Room Manager
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Room:
            </span>
            <button
              onClick={copyRoomId}
              className="text-[11px] font-mono font-bold tracking-wider transition-colors"
              style={{ color: "var(--accent-cyan)" }}
              title={copied ? "Copied!" : "Click to copy"}
            >
              {currentRoom}
            </button>
            {isHost && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md ml-1"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  color: "var(--accent-orange)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  letterSpacing: "0.06em",
                }}
              >
                HOST
              </span>
            )}
            {copied && (
              <span className="text-[10px] ml-1" style={{ color: "var(--accent-green)" }}>
                copied
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-9" style={{ background: "var(--border-soft)" }} />

        {/* Avatars */}
        <div className="flex items-center -space-x-2">
          {users.slice(0, 5).map((u) => (
            <UserAvatar key={u.id} user={u} isYou={u.id === myId} />
          ))}
          {users.length > 5 && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "var(--text-secondary)",
                boxShadow: "0 0 0 2px rgba(20,20,30,0.9)",
              }}
            >
              +{users.length - 5}
            </div>
          )}
        </div>

        {/* Leave */}
        <button
          onClick={handleLeave}
          title="Leave Room"
          aria-label="Leave Room"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-[1.05]"
          style={{
            background: "rgba(239,68,68,0.1)",
            color: "var(--accent-red)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
