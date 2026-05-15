"use client";

import PhysicsCanvas from "@/components/PhysicsCanvas";
import Toolbar from "@/components/Toolbar";
import SimControls from "@/components/SimControls";
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

  return (
    <main className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <div className="flex-1 relative">
        <PhysicsCanvas ref={canvasRef} activeTool={activeTool} />
        <SimControls
          isPaused={paused}
          onTogglePause={handleTogglePause}
          onReset={handleReset}
        />
      </div>
    </main>
  );
}
