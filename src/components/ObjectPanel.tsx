"use client";

import React, { useState, useEffect } from "react";
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
  onClose?: () => void;
}

const inputClass =
  "w-full rounded-md px-2 py-1 text-xs font-mono focus:outline-none transition-colors";

const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border-soft)",
  color: "var(--text-primary)",
} as React.CSSProperties;

// Gradient slider matching the mockup
function GradientSlider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  suffix = "",
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const pct = Math.max(0, Math.min(1, (local - min) / (max - min || 1))) * 100;
  const trackBg = `linear-gradient(90deg,
    #00d2ff 0%,
    #a855f7 ${Math.min(60, pct)}%,
    #ec4899 ${pct}%,
    rgba(255,255,255,0.06) ${pct}%,
    rgba(255,255,255,0.06) 100%)`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
          {label}
        </span>
        <span
          className="text-[12px] font-mono"
          style={{ color: "var(--text-primary)" }}
        >
          {local.toFixed(2)}{suffix}
        </span>
      </div>
      <input
        type="range"
        className="vl-slider"
        min={min}
        max={max}
        step={step}
        value={local}
        style={{ background: trackBg }}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          setLocal(n);
          onCommit(n);
        }}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  step = "any",
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  step?: string | number;
  min?: number;
  max?: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => {
    setLocal(String(Number(value.toFixed(4))));
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <input
        type="number"
        className={inputClass}
        style={inputStyle}
        value={local}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = parseFloat(local);
          if (!isNaN(n)) onCommit(n);
        }}
        onKeyDown={(e) => {
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] font-semibold uppercase tracking-[0.16em] mb-2 mt-1"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </div>
  );
}

function BodyDetails({
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
  const [forceX, setForceX] = useState("0");
  const [forceY, setForceY] = useState("0");

  useEffect(() => {
    setForceX("0");
    setForceY("0");
  }, [body.id]);

  const angleDeg = (body.angle * 180) / Math.PI;
  const massMax = Math.max(10, Math.ceil(body.mass * 2));

  return (
    <div className="flex flex-col gap-4">
      <GradientSlider
        label="Mass"
        value={body.mass}
        min={0.1}
        max={massMax}
        step={0.05}
        suffix="kg"
        onCommit={onSetMass}
      />
      <GradientSlider
        label="Friction"
        value={body.friction}
        onCommit={(f) => onSetFriction(f, body.frictionStatic)}
      />
      <GradientSlider
        label="Restitution"
        value={body.restitution}
        onCommit={onSetRestitution}
      />

      <div className="h-px" style={{ background: "var(--border-soft)" }} />
      <SectionTitle>Motion</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          key={`angle-${body.id}`}
          label="Angle°"
          value={angleDeg}
          step={1}
          onCommit={(v) => onSetAngle((v * Math.PI) / 180)}
        />
        <NumberField
          key={`fa-${body.id}`}
          label="Air"
          value={body.frictionAir}
          step={0.001}
          min={0}
          max={0.1}
          onCommit={onSetFrictionAir}
        />
        <NumberField
          key={`vx-${body.id}`}
          label="Vel X"
          value={body.velX}
          step={0.1}
          onCommit={(vx) => onSetVelocity(vx, body.velY)}
        />
        <NumberField
          key={`vy-${body.id}`}
          label="Vel Y"
          value={body.velY}
          step={0.1}
          onCommit={(vy) => onSetVelocity(body.velX, vy)}
        />
      </div>

      <div className="h-px" style={{ background: "var(--border-soft)" }} />
      <SectionTitle>Apply Impulse</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Fx</span>
          <input
            type="number"
            className={inputClass}
            style={inputStyle}
            value={forceX}
            step="0.001"
            onChange={(e) => setForceX(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Fy</span>
          <input
            type="number"
            className={inputClass}
            style={inputStyle}
            value={forceY}
            step="0.001"
            onChange={(e) => setForceY(e.target.value)}
          />
        </div>
      </div>
      <button
        onClick={() => {
          const fx = parseFloat(forceX) || 0;
          const fy = parseFloat(forceY) || 0;
          onApplyForce(fx, fy);
        }}
        className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          background: "rgba(245, 158, 11, 0.13)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          color: "#fbbf24",
        }}
      >
        Apply Impulse
      </button>
    </div>
  );
}

function ConstraintDetails({
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>Type</span>
        <span className="text-[12px] font-semibold" style={{ color: "var(--accent-cyan)" }}>{typeLabel}</span>
      </div>
      {constraint.constraintType !== "pivot" && (
        <>
          <GradientSlider
            label="Length"
            value={constraint.length}
            min={0}
            max={Math.max(400, Math.ceil(constraint.length * 1.5))}
            step={1}
            suffix="px"
            onCommit={onSetLength}
          />
          <GradientSlider
            label="Stiffness"
            value={constraint.stiffness}
            min={0.001}
            max={1}
            step={0.001}
            onCommit={onSetStiffness}
          />
          <GradientSlider
            label="Damping"
            value={constraint.damping}
            min={0}
            max={0.5}
            step={0.001}
            onCommit={onSetDamping}
          />
        </>
      )}
    </div>
  );
}

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
  onClose,
}: ObjectPanelProps) {
  const [tab, setTab] = useState<"bodies" | "constraints">("bodies");
  const [selectedBodyId, setSelectedBodyId] = useState<number | null>(null);
  const [selectedConstraintId, setSelectedConstraintId] = useState<number | null>(null);

  const selectedBody = worldData.bodies.find((b) => b.id === selectedBodyId) ?? null;
  const selectedConstraint = worldData.constraints.find((c) => c.id === selectedConstraintId) ?? null;

  // Auto-select first non-static body when none selected
  useEffect(() => {
    if (tab === "bodies" && selectedBodyId === null) {
      const first = worldData.bodies.find((b) => !b.isStatic);
      if (first) setSelectedBodyId(first.id);
    }
  }, [worldData.bodies, tab, selectedBodyId]);

  useEffect(() => {
    if (selectedBodyId !== null && !worldData.bodies.find((b) => b.id === selectedBodyId)) {
      setSelectedBodyId(null);
    }
  }, [worldData.bodies, selectedBodyId]);

  useEffect(() => {
    if (selectedConstraintId !== null && !worldData.constraints.find((c) => c.id === selectedConstraintId)) {
      setSelectedConstraintId(null);
    }
  }, [worldData.constraints, selectedConstraintId]);

  if (!isOpen) return null;

  const selectionLabel =
    tab === "bodies"
      ? selectedBody
        ? selectedBody.label || `Body #${selectedBody.id}`
        : "—"
      : selectedConstraint
      ? `${selectedConstraint.constraintType} #${selectedConstraint.id}`
      : "—";

  return (
    <div
      className="vl-glass-strong absolute z-30 rounded-2xl flex flex-col"
      style={{
        width: "320px",
        top: "80px",
        left: "84px",
        maxHeight: "calc(100vh - 180px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Object Inspector
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Selected:
            </span>
            <span className="text-[11px]" style={{ color: "var(--accent-cyan)" }}>
              {selectionLabel}
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close Object Inspector"
            className="w-7 h-7 rounded-md flex items-center justify-center text-base transition-colors hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
          >
            ×
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-1.5 mb-2">
        {(["bodies", "constraints"] as const).map((t) => {
          const isActive = tab === t;
          const count = t === "bodies" ? worldData.bodies.length : worldData.constraints.length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-all"
              style={{
                background: isActive ? "rgba(0,210,255,0.12)" : "rgba(255,255,255,0.03)",
                color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                border: isActive ? "1px solid rgba(0,210,255,0.3)" : "1px solid var(--border-subtle)",
              }}
            >
              {t} · {count}
            </button>
          );
        })}
      </div>

      {/* Selector row */}
      <div className="px-4 mb-3">
        <select
          value={
            tab === "bodies"
              ? selectedBodyId ?? ""
              : selectedConstraintId ?? ""
          }
          onChange={(e) => {
            const v = e.target.value;
            if (tab === "bodies") setSelectedBodyId(v ? Number(v) : null);
            else setSelectedConstraintId(v ? Number(v) : null);
          }}
          className="w-full text-xs rounded-lg px-2.5 py-1.5 outline-none"
          style={inputStyle}
        >
          <option value="">— select —</option>
          {tab === "bodies"
            ? worldData.bodies
                .filter((b) => !b.isStatic)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label || `Body #${b.id}`} ({b.mass.toFixed(1)}kg)
                  </option>
                ))
            : worldData.constraints.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.constraintType} #{c.id} ({c.bodyAId ?? "?"} → {c.bodyBId ?? "world"})
                </option>
              ))}
        </select>
      </div>

      {/* Body / constraint details */}
      <div className="overflow-y-auto px-4 pb-4">
        {tab === "bodies" && selectedBody && !selectedBody.isStatic && (
          <BodyDetails
            body={selectedBody}
            onSetMass={(v) => onSetBodyMass(selectedBody.id, v)}
            onSetAngle={(v) => onSetBodyAngle(selectedBody.id, v)}
            onSetVelocity={(vx, vy) => onSetBodyVelocity(selectedBody.id, vx, vy)}
            onApplyForce={(fx, fy) => onApplyBodyForce(selectedBody.id, fx, fy)}
            onSetFriction={(f, fs) => onSetBodyFriction(selectedBody.id, f, fs)}
            onSetRestitution={(v) => onSetBodyRestitution(selectedBody.id, v)}
            onSetFrictionAir={(v) => onSetBodyFrictionAir(selectedBody.id, v)}
          />
        )}
        {tab === "bodies" && selectedBody && selectedBody.isStatic && (
          <div className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
            Static bodies cannot be edited.
          </div>
        )}
        {tab === "bodies" && !selectedBody && (
          <div className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
            Select a body from the dropdown or canvas.
          </div>
        )}
        {tab === "constraints" && selectedConstraint && (
          <ConstraintDetails
            constraint={selectedConstraint}
            onSetLength={(v) => onSetConstraintLength(selectedConstraint.id, v)}
            onSetStiffness={(v) => onSetConstraintStiffness(selectedConstraint.id, v)}
            onSetDamping={(v) => onSetConstraintDamping(selectedConstraint.id, v)}
          />
        )}
        {tab === "constraints" && !selectedConstraint && (
          <div className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
            No constraint selected.
          </div>
        )}
      </div>
    </div>
  );
}
