"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { WorldData, BodyListItem, ConstraintListItem } from "@/app/page";

interface ObjectPanelProps {
  isOpen: boolean;
  worldData: WorldData;
  onSetBodyMass: (id: number, mass: number) => void;
  onSetBodyAngle: (id: number, angle: number) => void;
  onSetBodyVelocity: (id: number, vx: number, vy: number) => void;
  onApplyBodyForce: (id: number, fx: number, fy: number) => void;
  onSetBodyFriction: (id: number, friction: number, frictionStatic: number) => void;
  onSetBodyRestitution: (id: number, restitution: number) => void;
  onSetConstraintLength: (id: number, length: number) => void;
  onSetConstraintStiffness: (id: number, stiffness: number) => void;
  onSetBodyFrictionAir: (id: number, frictionAir: number) => void;
  onSetConstraintDamping: (id: number, damping: number) => void;
}

// Shared input style
const inputClass =
  "w-full bg-gray-900/60 border border-gray-700/60 rounded-md px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/60 transition-colors";

const labelClass = "text-[11px] text-gray-500 mb-0.5";

// Small labeled number input with blur-to-commit behaviour
function PropInput({
  label,
  value,
  min,
  max,
  step = "any",
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: string | number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));

  // Sync when external value changes (e.g. different body selected)
  useEffect(() => {
    setLocal(String(Number(value.toFixed(4))));
  }, [value]);

  return (
    <div>
      <div className={labelClass}>{label}</div>
      <input
        type="number"
        className={inputClass}
        value={local}
        min={min}
        max={max}
        step={step}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          const n = parseFloat(local);
          if (!isNaN(n)) onCommit(n);
        }}
        onKeyDown={e => {
          if (e.key === "Enter") {
            const n = parseFloat(local);
            if (!isNaN(n)) onCommit(n);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}

// Slider with live commit
function SliderProp({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onCommit,
  color = "cyan",
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onCommit: (v: number) => void;
  color?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  const accent = color === "purple" ? "#8b5cf6" : color === "amber" ? "#f59e0b" : "#00d2ff";

  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <span className={labelClass}>{label}</span>
        <span className="text-[11px] font-mono" style={{ color: accent }}>{local.toFixed(3)}</span>
      </div>
      <input
        type="range"
        className="w-full h-1.5 rounded appearance-none cursor-pointer"
        style={{ accentColor: accent }}
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={e => {
          const n = parseFloat(e.target.value);
          setLocal(n);
          onCommit(n);
        }}
      />
    </div>
  );
}

// Subpanel wrapper
function SubPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ---- Body detail editor ----
function BodyEditor({
  body,
  onSetMass,
  onSetAngle,
  onSetVelocity,
  onApplyForce,
  onSetFriction,
  onSetRestitution,
  onSetFrictionAir,
}: {
  body: BodyListItem;
  onSetMass: (v: number) => void;
  onSetAngle: (v: number) => void;
  onSetVelocity: (vx: number, vy: number) => void;
  onApplyForce: (fx: number, fy: number) => void;
  onSetFriction: (f: number, fs: number) => void;
  onSetRestitution: (v: number) => void;
  onSetFrictionAir: (v: number) => void;
}) {
  // Local force inputs (impulse, not live)
  const [forceX, setForceX] = useState("0");
  const [forceY, setForceY] = useState("0");

  // Reset force inputs when body changes
  useEffect(() => {
    setForceX("0");
    setForceY("0");
  }, [body.id]);

  const angleDeg = (body.angle * 180) / Math.PI;

  return (
    <div className="flex flex-col gap-3">
      {/* Live read-only position */}
      <SubPanel title="Position (live)">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className={labelClass}>X</div>
            <div className="text-xs font-mono text-gray-300">{body.posX.toFixed(1)}</div>
          </div>
          <div>
            <div className={labelClass}>Y</div>
            <div className="text-xs font-mono text-gray-300">{body.posY.toFixed(1)}</div>
          </div>
        </div>
      </SubPanel>

      {/* Motion */}
      <SubPanel title="Motion">
        <PropInput
          key={`mass-${body.id}`}
          label="Mass (kg)"
          value={body.mass}
          min={0.01}
          step={0.1}
          onCommit={onSetMass}
        />
        <PropInput
          key={`angle-${body.id}`}
          label="Angle (°)"
          value={angleDeg}
          step={1}
          onCommit={v => onSetAngle((v * Math.PI) / 180)}
        />
        <div className="grid grid-cols-2 gap-2">
          <PropInput
            key={`vx-${body.id}`}
            label="Vel X"
            value={body.velX}
            step={0.1}
            onCommit={vx => onSetVelocity(vx, body.velY)}
          />
          <PropInput
            key={`vy-${body.id}`}
            label="Vel Y"
            value={body.velY}
            step={0.1}
            onCommit={vy => onSetVelocity(body.velX, vy)}
          />
        </div>
      </SubPanel>

      {/* Impulse force */}
      <SubPanel title="Apply Impulse Force">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className={labelClass}>Fx</div>
            <input
              type="number"
              className={inputClass}
              value={forceX}
              step="0.001"
              onChange={e => setForceX(e.target.value)}
            />
          </div>
          <div>
            <div className={labelClass}>Fy</div>
            <input
              type="number"
              className={inputClass}
              value={forceY}
              step="0.001"
              onChange={e => setForceY(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={() => {
            const fx = parseFloat(forceX) || 0;
            const fy = parseFloat(forceY) || 0;
            onApplyForce(fx, fy);
          }}
          className="w-full py-1.5 rounded-md text-xs font-medium transition-colors"
          style={{
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            color: "#f59e0b",
          }}
        >
          Apply Impulse
        </button>
      </SubPanel>

      {/* Material (Task 4) */}
      <SubPanel title="Material">
        <SliderProp
          key={`friction-${body.id}`}
          label="Kinetic Friction"
          value={body.friction}
          color="cyan"
          onCommit={f => onSetFriction(f, body.frictionStatic)}
        />
        <SliderProp
          key={`frictionStatic-${body.id}`}
          label="Static Friction"
          value={body.frictionStatic}
          color="purple"
          onCommit={fs => onSetFriction(body.friction, fs)}
        />
        <SliderProp
          key={`restitution-${body.id}`}
          label="Restitution (bounciness)"
          value={body.restitution}
          color="amber"
          onCommit={onSetRestitution}
        />
        <SliderProp
          key={`frictionAir-${body.id}`}
          label="Air Damping (frictionAir)"
          value={body.frictionAir}
          min={0}
          max={0.1}
          step={0.001}
          color="purple"
          onCommit={onSetFrictionAir}
        />
      </SubPanel>
    </div>
  );
}

// ---- Constraint detail editor (Task 5) ----
function ConstraintEditor({
  constraint,
  onSetLength,
  onSetStiffness,
  onSetDamping,
}: {
  constraint: ConstraintListItem;
  onSetLength: (v: number) => void;
  onSetStiffness: (v: number) => void;
  onSetDamping: (v: number) => void;
}) {
  const typeLabel =
    constraint.constraintType === "spring"
      ? "Spring"
      : constraint.constraintType === "pivot"
      ? "Pivot/Pin"
      : "Rope";

  const typeColor =
    constraint.constraintType === "spring"
      ? "#22c55e"
      : constraint.constraintType === "pivot"
      ? "#fbbf24"
      : "#94a3b8";

  return (
    <div className="flex flex-col gap-3">
      <SubPanel title="Constraint Info">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Type:</span>
          <span className="font-mono font-semibold" style={{ color: typeColor }}>{typeLabel}</span>
        </div>
        {constraint.bodyAId !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Body A:</span>
            <span className="font-mono text-gray-300">#{constraint.bodyAId}</span>
          </div>
        )}
        {constraint.bodyBId !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Body B:</span>
            <span className="font-mono text-gray-300">#{constraint.bodyBId}</span>
          </div>
        )}
      </SubPanel>

      {constraint.constraintType !== "pivot" && (
        <SubPanel title="Spring / Rope Properties">
          <PropInput
            key={`len-${constraint.id}`}
            label="Natural Length (px)"
            value={constraint.length}
            min={0}
            step={1}
            onCommit={onSetLength}
          />
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span className={labelClass}>Stiffness (0.001 – 1)</span>
              <span className="text-[11px] font-mono text-green-400">
                {constraint.stiffness.toFixed(3)}
              </span>
            </div>
            <input
              type="range"
              className="w-full h-1.5 rounded appearance-none cursor-pointer"
              style={{ accentColor: "#22c55e" }}
              min={0.001}
              max={1}
              step={0.001}
              value={constraint.stiffness}
              onChange={e => onSetStiffness(parseFloat(e.target.value))}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span className={labelClass}>Damping (0 – 0.5)</span>
              <span className="text-[11px] font-mono text-purple-400">
                {constraint.damping.toFixed(4)}
              </span>
            </div>
            <input
              type="range"
              className="w-full h-1.5 rounded appearance-none cursor-pointer"
              style={{ accentColor: "#8b5cf6" }}
              min={0}
              max={0.5}
              step={0.001}
              value={constraint.damping}
              onChange={e => onSetDamping(parseFloat(e.target.value))}
            />
          </div>
        </SubPanel>
      )}
    </div>
  );
}

// ---- Main panel ----
export default function ObjectPanel({
  isOpen,
  worldData,
  onSetBodyMass,
  onSetBodyAngle,
  onSetBodyVelocity,
  onApplyBodyForce,
  onSetBodyFriction,
  onSetBodyRestitution,
  onSetConstraintLength,
  onSetConstraintStiffness,
  onSetBodyFrictionAir,
  onSetConstraintDamping,
}: ObjectPanelProps) {
  const [activeTab, setActiveTab] = useState<"bodies" | "constraints">("bodies");
  const [selectedBodyId, setSelectedBodyId] = useState<number | null>(null);
  const [selectedConstraintId, setSelectedConstraintId] = useState<number | null>(null);

  const selectedBody = worldData.bodies.find(b => b.id === selectedBodyId) ?? null;
  const selectedConstraint = worldData.constraints.find(c => c.id === selectedConstraintId) ?? null;

  // Clear selection if item disappears
  useEffect(() => {
    if (selectedBodyId !== null && !worldData.bodies.find(b => b.id === selectedBodyId)) {
      setSelectedBodyId(null);
    }
  }, [worldData.bodies, selectedBodyId]);

  useEffect(() => {
    if (selectedConstraintId !== null && !worldData.constraints.find(c => c.id === selectedConstraintId)) {
      setSelectedConstraintId(null);
    }
  }, [worldData.constraints, selectedConstraintId]);

  const constraintTypeColor = (type: string) =>
    type === "spring" ? "#22c55e" : type === "pivot" ? "#fbbf24" : "#94a3b8";

  const constraintTypeLabel = (type: string) =>
    type === "spring" ? "S" : type === "pivot" ? "P" : "R";

  return (
    <div
      className="absolute top-0 left-0 h-full transition-transform duration-300 z-30 flex flex-col"
      style={{
        width: "280px",
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        background: "rgba(18, 18, 26, 0.9)",
        backdropFilter: "blur(16px)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div
        className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md"
        style={{ background: "rgba(18, 18, 26, 0.95)" }}
      >
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Objects
        </h2>
        <div className="flex items-center gap-1 text-[10px] text-gray-600 font-mono">
          {worldData.bodies.length}B / {worldData.constraints.length}C
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 shrink-0">
        {(["bodies", "constraints"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 text-xs font-medium capitalize transition-colors"
            style={{
              color: activeTab === tab ? "var(--accent-cyan)" : "var(--text-secondary)",
              borderBottom: activeTab === tab ? "2px solid var(--accent-cyan)" : "2px solid transparent",
              background: "transparent",
            }}
          >
            {tab} ({tab === "bodies" ? worldData.bodies.length : worldData.constraints.length})
          </button>
        ))}
      </div>

      {/* Scrollable area: list + detail */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "bodies" && (
          <div>
            {/* Body list */}
            {worldData.bodies.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-gray-600 text-xs gap-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-40">
                  <circle cx="12" cy="12" r="9" />
                </svg>
                No bodies in scene
              </div>
            ) : (
              <div className="p-2 flex flex-col gap-1">
                {worldData.bodies.map(body => {
                  const isSelected = body.id === selectedBodyId;
                  return (
                    <button
                      key={body.id}
                      onClick={() => setSelectedBodyId(isSelected ? null : body.id)}
                      className="w-full text-left px-3 py-2 rounded-lg transition-all text-xs"
                      style={{
                        background: isSelected ? "rgba(0,210,255,0.1)" : "rgba(255,255,255,0.03)",
                        border: isSelected ? "1px solid rgba(0,210,255,0.35)" : "1px solid transparent",
                        color: isSelected ? "var(--accent-cyan)" : "var(--text-secondary)",
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium truncate max-w-[140px]">
                          {body.label || `Body #${body.id}`}
                        </span>
                        <span className="font-mono text-[10px] text-gray-600">
                          {body.isStatic ? "static" : `${body.mass.toFixed(1)}kg`}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                        ({Math.round(body.posX)}, {Math.round(body.posY)})
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Body detail editor */}
            {selectedBody && !selectedBody.isStatic && (
              <div className="border-t border-gray-800 p-3">
                <div
                  className="text-[10px] font-bold uppercase tracking-widest mb-3"
                  style={{ color: "var(--accent-cyan)" }}
                >
                  Editing: {selectedBody.label || `Body #${selectedBody.id}`}
                </div>
                <BodyEditor
                  body={selectedBody}
                  onSetMass={v => onSetBodyMass(selectedBody.id, v)}
                  onSetAngle={v => onSetBodyAngle(selectedBody.id, v)}
                  onSetVelocity={(vx, vy) => onSetBodyVelocity(selectedBody.id, vx, vy)}
                  onApplyForce={(fx, fy) => onApplyBodyForce(selectedBody.id, fx, fy)}
                  onSetFriction={(f, fs) => onSetBodyFriction(selectedBody.id, f, fs)}
                  onSetRestitution={v => onSetBodyRestitution(selectedBody.id, v)}
                  onSetFrictionAir={v => onSetBodyFrictionAir(selectedBody.id, v)}
                />
              </div>
            )}
            {selectedBody && selectedBody.isStatic && (
              <div className="border-t border-gray-800 p-4 text-xs text-gray-500 text-center">
                Static bodies cannot be edited
              </div>
            )}
          </div>
        )}

        {activeTab === "constraints" && (
          <div>
            {worldData.constraints.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-gray-600 text-xs gap-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-40">
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <circle cx="5" cy="5" r="2" fill="currentColor" />
                  <circle cx="19" cy="19" r="2" fill="currentColor" />
                </svg>
                No constraints in scene
              </div>
            ) : (
              <div className="p-2 flex flex-col gap-1">
                {worldData.constraints.map(c => {
                  const isSelected = c.id === selectedConstraintId;
                  const tColor = constraintTypeColor(c.constraintType);
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConstraintId(isSelected ? null : c.id)}
                      className="w-full text-left px-3 py-2 rounded-lg transition-all text-xs"
                      style={{
                        background: isSelected ? `${tColor}18` : "rgba(255,255,255,0.03)",
                        border: isSelected ? `1px solid ${tColor}50` : "1px solid transparent",
                        color: isSelected ? tColor : "var(--text-secondary)",
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[9px] font-bold px-1 rounded"
                            style={{ background: `${tColor}25`, color: tColor }}
                          >
                            {constraintTypeLabel(c.constraintType)}
                          </span>
                          <span className="font-mono text-[10px]">
                            #{c.bodyAId ?? "?"} → #{c.bodyBId ?? "world"}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-gray-600">
                          k={c.stiffness.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                        len={c.length.toFixed(1)}px
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Constraint detail editor (Task 5) */}
            {selectedConstraint && (
              <div className="border-t border-gray-800 p-3">
                <div
                  className="text-[10px] font-bold uppercase tracking-widest mb-3"
                  style={{ color: constraintTypeColor(selectedConstraint.constraintType) }}
                >
                  Editing: {selectedConstraint.constraintType} #{selectedConstraint.id}
                </div>
                <ConstraintEditor
                  constraint={selectedConstraint}
                  onSetLength={v => onSetConstraintLength(selectedConstraint.id, v)}
                  onSetStiffness={v => onSetConstraintStiffness(selectedConstraint.id, v)}
                  onSetDamping={v => onSetConstraintDamping(selectedConstraint.id, v)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
