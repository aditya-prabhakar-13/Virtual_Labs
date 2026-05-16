"use client";

import PhysicsCanvas from "@/components/PhysicsCanvas";
import Toolbar from "@/components/Toolbar";
import SimControls from "@/components/SimControls";
import RoomManager from "@/components/RoomManager";
import { useState, useRef, useCallback } from "react";

export type ToolType =
  | "circle"
  | "rectangle"
  | "triangle"
  | "wall"
  | "rope"
  | "spring"
  | "pivot"
  | "delete"
  | "grab";

export interface PhysicsCanvasHandle {
  togglePause: () => void;
  resetWorld: () => void;
  isPaused: () => boolean;
}

export default function Home() {
  const [activeTool, setActiveTool] = useState<ToolType>("grab");
  const canvasRef = useRef<PhysicsCanvasHandle>(null);
  const [paused, setPaused] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const handleTogglePause = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.togglePause();
      setPaused(canvasRef.current.isPaused());
    }
  }, []);

  const handleReset = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.resetWorld();
      setPaused(false);
    }
  }, []);

  const handleRoomJoined = useCallback((id: string, host: boolean) => {
    setRoomId(id);
    setIsHost(host);
  }, []);

  const handleRoomLeft = useCallback(() => {
    setRoomId(null);
    setIsHost(false);
  }, []);

  const handleHostPromoted = useCallback(() => {
    setIsHost(true);
  }, []);

  return (
    <main className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <div className="flex-1 relative">
        <PhysicsCanvas
          ref={canvasRef}
          activeTool={activeTool}
          roomId={roomId}
          isHost={isHost}
        />
        <SimControls
          isPaused={paused}
          onTogglePause={handleTogglePause}
          onReset={handleReset}
        />
        <RoomManager
          onRoomJoined={handleRoomJoined}
          onRoomLeft={handleRoomLeft}
          onHostPromoted={handleHostPromoted}
        />
      </div>
    </main>
  );
}
