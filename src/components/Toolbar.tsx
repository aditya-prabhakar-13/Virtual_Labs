"use client";

import React from "react";
import type { ToolType } from "@/app/page";

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
  showObjectPanel: boolean;
  onToggleObjectPanel: () => void;
  showVectors: boolean;
  onToggleVectors: () => void;
}

interface ToolButtonProps {
  tool: ToolType;
  activeTool: ToolType;
  onClick: (tool: ToolType) => void;
  icon: React.ReactNode;
  label: string;
  color: string; // hex for tint
}

function ToolButton({ tool, activeTool, onClick, icon, label, color }: ToolButtonProps) {
  const isActive = activeTool === tool;

  return (
    <button
      onClick={() => onClick(tool)}
      title={label}
      aria-label={label}
      className="vl-tool-btn group relative flex items-center justify-center w-11 h-11 rounded-xl"
      style={{
        background: isActive ? `${color}22` : "transparent",
        border: isActive ? `1px solid ${color}66` : "1px solid transparent",
        boxShadow: isActive
          ? `0 0 14px ${color}55, inset 0 0 10px ${color}1a`
          : "none",
        color: isActive ? color : color,
        opacity: isActive ? 1 : 0.82,
      }}
    >
      {icon}
      <span
        className="absolute left-full ml-3 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 vl-glass-strong"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
    </button>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="vl-tool-btn group relative flex items-center justify-center w-11 h-11 rounded-xl"
      style={{
        background: active ? `${color}22` : "transparent",
        border: active ? `1px solid ${color}66` : "1px solid transparent",
        boxShadow: active ? `0 0 14px ${color}55, inset 0 0 10px ${color}1a` : "none",
        color: active ? color : "var(--text-secondary)",
      }}
    >
      {icon}
      <span
        className="absolute left-full ml-3 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 vl-glass-strong"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
    </button>
  );
}

function Divider() {
  return (
    <div
      className="w-7 h-px mx-auto my-2"
      style={{ background: "rgba(255,255,255,0.06)" }}
    />
  );
}

export default function Toolbar({
  activeTool,
  onToolChange,
  showAnalytics,
  onToggleAnalytics,
  showObjectPanel,
  onToggleObjectPanel,
  showVectors,
  onToggleVectors,
}: ToolbarProps) {
  return (
    <div
      className="flex flex-col items-center py-3 px-2 gap-1 h-full shrink-0 relative z-50"
      style={{
        width: "64px",
        background: "rgba(12, 12, 18, 0.78)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Brand Logo */}
      <div
        className="flex items-center justify-center w-11 h-11 rounded-xl mb-2 font-bold text-base relative"
        style={{
          background: "linear-gradient(135deg, rgba(0,210,255,0.18), rgba(168,85,247,0.18))",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span
          style={{
            background: "var(--gradient-brand)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          V
        </span>
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: "0 0 16px rgba(0,210,255,0.25)" }}
        />
      </div>

      {/* Shape tools */}
      <ToolButton
        tool="circle"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Circle (C)"
        color="#00d2ff"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
          </svg>
        }
      />
      <ToolButton
        tool="rectangle"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Rectangle (B)"
        color="#a855f7"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        }
      />
      <ToolButton
        tool="triangle"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Triangle (T)"
        color="#ef4444"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12,3 22,21 2,21" />
          </svg>
        }
      />
      <ToolButton
        tool="wall"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Wall (W)"
        color="#8888a0"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="10" width="18" height="4" rx="1" />
          </svg>
        }
      />

      <Divider />

      {/* Constraint tools */}
      <ToolButton
        tool="rope"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Rope (O)"
        color="#00d2ff"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 5 C 9 8, 9 16, 5 19" />
            <path d="M19 5 C 15 8, 15 16, 19 19" opacity="0" />
            <circle cx="5" cy="5" r="1.6" fill="currentColor" />
            <circle cx="5" cy="19" r="1.6" fill="currentColor" />
          </svg>
        }
      />
      <ToolButton
        tool="spring"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Spring (S)"
        color="#f59e0b"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5,4 9,7 5,10 9,13 5,16 9,19 5,20" />
            <circle cx="5" cy="4" r="1.3" fill="currentColor" />
            <circle cx="5" cy="20" r="1.3" fill="currentColor" />
          </svg>
        }
      />
      <ToolButton
        tool="pivot"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Pivot / Pin (P)"
        color="#a855f7"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="9" r="3.5" />
            <line x1="12" y1="12.5" x2="12" y2="20" strokeLinecap="round" />
            <line x1="8.5" y1="20" x2="15.5" y2="20" strokeLinecap="round" />
          </svg>
        }
      />

      <Divider />

      {/* Grab + Inspect + Delete */}
      <ToolButton
        tool="grab"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Grab (G)"
        color="#00d2ff"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
            <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13" />
          </svg>
        }
      />
      <ToolButton
        tool="inspect"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Inspect (I)"
        color="#a855f7"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.2" y1="16.2" x2="21" y2="21" />
          </svg>
        }
      />
      <ToolButton
        tool="delete"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Delete (D)"
        color="#ef4444"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,6 5,6 21,6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        }
      />

      {/* Spacer */}
      <div className="flex-1" />

      <Divider />

      {/* Panel toggles */}
      <ToggleButton
        active={showObjectPanel}
        onClick={onToggleObjectPanel}
        label="Object Inspector"
        color="#00d2ff"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        }
      />
      <ToggleButton
        active={showVectors}
        onClick={onToggleVectors}
        label="Velocity / Force Vectors"
        color="#f59e0b"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12,5 19,12 12,19" />
          </svg>
        }
      />
      <ToggleButton
        active={showAnalytics}
        onClick={onToggleAnalytics}
        label="Analytics"
        color="#a855f7"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 4-8" />
          </svg>
        }
      />

      {/* Exit icon */}
      <button
        title="Disconnect / Exit"
        aria-label="Exit"
        className="vl-tool-btn flex items-center justify-center w-11 h-11 rounded-xl mt-1"
        style={{ color: "#ef4444", opacity: 0.7 }}
        onClick={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}
