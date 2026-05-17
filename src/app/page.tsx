"use client";

import PhysicsCanvas from "@/components/PhysicsCanvas";
import Toolbar from "@/components/Toolbar";
import SimControls from "@/components/SimControls";
import RoomManager from "@/components/RoomManager";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import LibraryModal from "@/components/LibraryModal";
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
  getSnapshot: () => any;
  loadSnapshot: (snapshot: any) => void;
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
  const [showLibrary, setShowLibrary] = useState(false);

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

  const handleSaveScenario = async () => {
    if (!canvasRef.current) return;
    const name = prompt("Enter a name for this scenario:");
    if (!name) return;
    const description = prompt("Enter a description (optional):") || "";
    
    const snapshot = canvasRef.current.getSnapshot();
    if (!snapshot) {
      alert("Failed to capture snapshot.");
      return;
    }

    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, snapshot }),
      });
      if (res.ok) {
        alert("Scenario saved successfully!");
      } else {
        alert("Failed to save scenario.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    }
  };

  const handleLoadScenario = async (id: string) => {
    try {
      const res = await fetch(`/api/scenarios/${id}`);
      if (!res.ok) throw new Error("Failed to load scenario");
      const data = await res.json();
      if (canvasRef.current && data.snapshot) {
        canvasRef.current.loadSnapshot(data.snapshot);
        setShowLibrary(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load scenario.");
    }
  };

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
          onSaveClick={handleSaveScenario}
          onLibraryClick={() => setShowLibrary(true)}
        />
        <RoomManager
          onRoomJoined={handleRoomJoined}
          onRoomLeft={handleRoomLeft}
          onHostPromoted={handleHostPromoted}
        />
        <AnalyticsPanel
          isOpen={showAnalytics}
          data={inspectedBodyData}
        />
        <LibraryModal
          isOpen={showLibrary}
          onClose={() => setShowLibrary(false)}
          onLoad={handleLoadScenario}
        />
      </div>
    </main>
  );
}
