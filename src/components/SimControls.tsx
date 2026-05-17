"use client";

import React, { useEffect, useState } from "react";

interface SimControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  onSaveClick: () => void;
  onLibraryClick: () => void;
}

export default function SimControls({
  isPaused,
  onTogglePause,
  onReset,
  onSaveClick,
  onLibraryClick,
}: SimControlsProps) {
  const [localPaused, setLocalPaused] = useState(isPaused);

  // Sync with parent prop
  useEffect(() => {
    setLocalPaused(isPaused);
  }, [isPaused]);

  // Listen for keyboard-triggered pause from PhysicsCanvas
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setLocalPaused(detail.paused);
    };
    window.addEventListener("physics-pause-toggle", handler);
    return () => window.removeEventListener("physics-pause-toggle", handler);
  }, []);

  const handleToggle = () => {
    onTogglePause();
    setLocalPaused((p) => !p);
  };

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-2xl z-20"
      style={{
        background: "rgba(18, 18, 26, 0.8)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Play / Pause */}
      <button
        onClick={handleToggle}
        title={localPaused ? "Play (Space)" : "Pause (Space)"}
        className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: localPaused
            ? "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))"
            : "rgba(255,255,255,0.06)",
          color: localPaused ? "#0a0a0f" : "var(--text-primary)",
        }}
      >
        {localPaused ? (
          // Play icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,3 20,12 6,21" />
          </svg>
        ) : (
          // Pause icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        )}
      </button>

      {/* Divider */}
      <div
        className="w-px h-6"
        style={{ background: "var(--border-subtle)" }}
      />

      {/* Reset */}
      <button
        onClick={onReset}
        title="Reset (R)"
        className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: "rgba(255,255,255,0.06)",
          color: "var(--text-secondary)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

      {/* Divider */}
      <div
        className="w-px h-6"
        style={{ background: "var(--border-subtle)" }}
      />

      {/* Library */}
      <button
        onClick={onLibraryClick}
        title="Library"
        className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: "rgba(34, 197, 94, 0.1)",
          color: "var(--accent-green)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      </button>

      {/* Save */}
      <button
        onClick={onSaveClick}
        title="Save Scenario"
        className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: "rgba(255,255,255,0.06)",
          color: "var(--text-secondary)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      </button>

      {/* Status label */}
      <div
        className="flex items-center gap-1.5 px-2 ml-1"
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: localPaused ? "var(--accent-orange)" : "var(--accent-green)",
            boxShadow: localPaused
              ? "0 0 6px var(--accent-orange)"
              : "0 0 6px var(--accent-green)",
          }}
        />
        <span
          className="text-xs font-mono"
          style={{ color: "var(--text-secondary)" }}
        >
          {localPaused ? "PAUSED" : "RUNNING"}
        </span>
      </div>
    </div>
  );
}
