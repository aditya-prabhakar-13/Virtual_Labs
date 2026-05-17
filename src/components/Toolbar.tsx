"use client";

import React from "react";
import type { ToolType } from "@/app/page";

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
}

interface ToolButtonProps {
  tool: ToolType;
  activeTool: ToolType;
  onClick: (tool: ToolType) => void;
  icon: React.ReactNode;
  label: string;
}

function ToolButton({ tool, activeTool, onClick, icon, label }: ToolButtonProps) {
  const isActive = activeTool === tool;

  return (
    <button
      onClick={() => onClick(tool)}
      title={label}
      className="group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200"
      style={{
        background: isActive
          ? "rgba(0, 210, 255, 0.15)"
          : "transparent",
        border: isActive
          ? "1px solid rgba(0, 210, 255, 0.4)"
          : "1px solid transparent",
        boxShadow: isActive
          ? "0 0 12px rgba(0, 210, 255, 0.15), inset 0 0 12px rgba(0, 210, 255, 0.05)"
          : "none",
        color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
      }}
    >
      {icon}
      {/* Tooltip */}
      <span
        className="absolute left-full ml-3 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50"
        style={{
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function Divider() {
  return (
    <div
      className="w-8 h-px mx-auto my-1"
      style={{ background: "var(--border-subtle)" }}
    />
  );
}

export default function Toolbar({ activeTool, onToolChange, showAnalytics, onToggleAnalytics }: ToolbarProps) {
  return (
    <div
      className="flex flex-col items-center py-4 px-2 gap-1.5 h-full shrink-0"
      style={{
        width: "60px",
        background: "rgba(18, 18, 26, 0.85)",
        backdropFilter: "blur(16px)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg mb-3 font-bold text-sm"
        style={{
          background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
          color: "#0a0a0f",
        }}
      >
        VL
      </div>

      {/* Grab/Select */}
      <ToolButton
        tool="grab"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Grab (G)"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v0" />
            <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v6" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13" />
          </svg>
        }
      />

      <Divider />

      {/* Shape tools */}
      <ToolButton
        tool="circle"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Circle (C)"
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
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="5" x2="19" y2="19" />
            <circle cx="5" cy="5" r="2" fill="currentColor" />
            <circle cx="19" cy="19" r="2" fill="currentColor" />
          </svg>
        }
      />
      <ToolButton
        tool="spring"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Spring (S)"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4,4 8,8 4,12 8,16 4,20" />
            <circle cx="4" cy="4" r="1.5" fill="currentColor" />
            <circle cx="4" cy="20" r="1.5" fill="currentColor" />
          </svg>
        }
      />
      <ToolButton
        tool="pivot"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Pivot/Pin (P)"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <line x1="12" y1="12" x2="12" y2="20" />
            <line x1="8" y1="20" x2="16" y2="20" />
          </svg>
        }
      />

      <Divider />

      {/* Inspect tool */}
      <ToolButton
        tool="inspect"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Inspect (I)"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 5v-2" />
            <path d="M12 21v-2" />
            <path d="M5 12H3" />
            <path d="M21 12h-2" />
            <path d="M16.95 7.05l1.41-1.41" />
            <path d="M5.64 18.36l1.41-1.41" />
            <path d="M16.95 16.95l1.41 1.41" />
            <path d="M5.64 5.64l1.41 1.41" />
          </svg>
        }
      />

      {/* Delete tool */}
      <ToolButton
        tool="delete"
        activeTool={activeTool}
        onClick={onToolChange}
        label="Delete (D)"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,6 5,6 21,6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        }
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Analytics toggle */}
      <button
        onClick={onToggleAnalytics}
        title="Toggle Analytics Panel"
        className="flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200"
        style={{
          background: showAnalytics ? "rgba(124, 58, 237, 0.15)" : "transparent",
          border: showAnalytics ? "1px solid rgba(124, 58, 237, 0.4)" : "1px solid transparent",
          color: showAnalytics ? "var(--accent-purple)" : "var(--text-secondary)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-8" />
        </svg>
      </button>

      {/* Version label */}
      <span
        className="text-[10px] font-mono mt-2"
        style={{ color: "var(--text-secondary)", opacity: 0.5 }}
      >
        v0.2
      </span>
    </div>
  );
}

