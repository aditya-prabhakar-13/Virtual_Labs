"use client";

import PhysicsCanvas from "@/components/PhysicsCanvas";
import Toolbar from "@/components/Toolbar";
import SimControls from "@/components/SimControls";
import RoomManager from "@/components/RoomManager";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import ObjectPanel from "@/components/ObjectPanel";
import LibraryModal from "@/components/LibraryModal";
import WorkspaceHeader from "@/components/WorkspaceHeader";
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
  setBodyMass: (id: number, mass: number) => void;
  setBodyAngle: (id: number, angle: number) => void;
  setBodyVelocity: (id: number, vx: number, vy: number) => void;
  applyBodyForce: (id: number, fx: number, fy: number) => void;
  setBodyFriction: (id: number, friction: number, frictionStatic: number) => void;
  setBodyRestitution: (id: number, restitution: number) => void;
  setBodyFrictionAir: (id: number, frictionAir: number) => void;
  setConstraintLength: (id: number, length: number) => void;
  setConstraintStiffness: (id: number, stiffness: number) => void;
  setConstraintDamping: (id: number, damping: number) => void;
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

export interface BodyListItem {
  id: number;
  label: string;
  mass: number;
  friction: number;
  frictionStatic: number;
  frictionAir: number;
  restitution: number;
  posX: number;
  posY: number;
  velX: number;
  velY: number;
  angle: number;
  isStatic: boolean;
}

export interface ConstraintListItem {
  id: number;
  label: string;
  length: number;
  stiffness: number;
  damping: number;
  bodyAId?: number;
  bodyBId?: number;
  constraintType: string;
}

export interface WorldData {
  bodies: BodyListItem[];
  constraints: ConstraintListItem[];
}

const EMPTY_WORLD: WorldData = { bodies: [], constraints: [] };

export default function Home() {
  const [activeTool, setActiveTool] = useState<ToolType>("grab");
  const canvasRef = useRef<PhysicsCanvasHandle>(null);
  const [paused, setPaused] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [inspectedBodyData, setInspectedBodyData] = useState<InspectedBodyData | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showObjectPanel, setShowObjectPanel] = useState(false);
  const [showVectors, setShowVectors] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [worldData, setWorldData] = useState<WorldData>(EMPTY_WORLD);

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

  // Delegators from ObjectPanel → canvas handle
  const handleSetBodyMass = useCallback((id: number, mass: number) => {
    canvasRef.current?.setBodyMass(id, mass);
  }, []);
  const handleSetBodyAngle = useCallback((id: number, angle: number) => {
    canvasRef.current?.setBodyAngle(id, angle);
  }, []);
  const handleSetBodyVelocity = useCallback((id: number, vx: number, vy: number) => {
    canvasRef.current?.setBodyVelocity(id, vx, vy);
  }, []);
  const handleApplyBodyForce = useCallback((id: number, fx: number, fy: number) => {
    canvasRef.current?.applyBodyForce(id, fx, fy);
  }, []);
  const handleSetBodyFriction = useCallback((id: number, f: number, fs: number) => {
    canvasRef.current?.setBodyFriction(id, f, fs);
  }, []);
  const handleSetBodyRestitution = useCallback((id: number, v: number) => {
    canvasRef.current?.setBodyRestitution(id, v);
  }, []);
  const handleSetConstraintLength = useCallback((id: number, length: number) => {
    canvasRef.current?.setConstraintLength(id, length);
  }, []);
  const handleSetConstraintStiffness = useCallback((id: number, stiffness: number) => {
    canvasRef.current?.setConstraintStiffness(id, stiffness);
  }, []);
  const handleSetBodyFrictionAir = useCallback((id: number, frictionAir: number) => {
    canvasRef.current?.setBodyFrictionAir(id, frictionAir);
  }, []);
  const handleSetConstraintDamping = useCallback((id: number, damping: number) => {
    canvasRef.current?.setConstraintDamping(id, damping);
  }, []);

  return (
    <main className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        showAnalytics={showAnalytics}
        onToggleAnalytics={() => setShowAnalytics((p) => !p)}
        showObjectPanel={showObjectPanel}
        onToggleObjectPanel={() => setShowObjectPanel((p) => !p)}
        showVectors={showVectors}
        onToggleVectors={() => setShowVectors((p) => !p)}
      />
      <div className="flex-1 relative overflow-hidden">
        <PhysicsCanvas
          ref={canvasRef}
          activeTool={activeTool}
          roomId={roomId}
          isHost={isHost}
          onInspectedBodyUpdate={setInspectedBodyData}
          onWorldUpdate={setWorldData}
          showVectors={showVectors}
        />

        {/* Overlays sit above the matter canvas, below UI */}
        <div className="vl-canvas-aura" />
        <div className="vl-dot-grid" />

        <WorkspaceHeader />

        <RoomManager
          onRoomJoined={handleRoomJoined}
          onRoomLeft={handleRoomLeft}
          onHostPromoted={handleHostPromoted}
        />

        <ObjectPanel
          isOpen={showObjectPanel}
          worldData={worldData}
          onSetBodyMass={handleSetBodyMass}
          onSetBodyAngle={handleSetBodyAngle}
          onSetBodyVelocity={handleSetBodyVelocity}
          onApplyBodyForce={handleApplyBodyForce}
          onSetBodyFriction={handleSetBodyFriction}
          onSetBodyRestitution={handleSetBodyRestitution}
          onSetConstraintLength={handleSetConstraintLength}
          onSetConstraintStiffness={handleSetConstraintStiffness}
          onSetBodyFrictionAir={handleSetBodyFrictionAir}
          onSetConstraintDamping={handleSetConstraintDamping}
          onClose={() => setShowObjectPanel(false)}
        />

        <AnalyticsPanel
          isOpen={showAnalytics}
          data={inspectedBodyData}
          onClose={() => setShowAnalytics(false)}
        />

        <SimControls
          isPaused={paused}
          onTogglePause={handleTogglePause}
          onReset={handleReset}
          onSaveClick={handleSaveScenario}
          onLibraryClick={() => setShowLibrary(true)}
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
