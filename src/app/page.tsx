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
  | "grab"
  | "inspect";

export interface PhysicsCanvasHandle {
  togglePause: () => void;
  resetWorld: () => void;
  isPaused: () => boolean;
}

export interface InspectedBodyData {
  id: number;
  label: string;
  mass: number;
  posX: number;
  posY: number;
  velX: number;
  velY: number;
  velMag: number;
  angle: number;
  kineticEnergy: number;
  forceX: number;
  forceY: number;
  forceMag: number;
  timestamp: number;
}

export default function Home() {
  const [activeTool, setActiveTool] = useState<ToolType>("grab");
  const canvasRef = useRef<PhysicsCanvasHandle>(null);
  const [paused, setPaused] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [inspectedBodyData, setInspectedBodyData] = useState<InspectedBodyData | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

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
      setInspectedBodyData(null);
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
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        showAnalytics={showAnalytics}
        onToggleAnalytics={() => setShowAnalytics((p) => !p)}
      />
      <div className="flex-1 relative">
        <PhysicsCanvas
          ref={canvasRef}
          activeTool={activeTool}
          roomId={roomId}
          isHost={isHost}
          onInspectedBodyUpdate={setInspectedBodyData}
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
