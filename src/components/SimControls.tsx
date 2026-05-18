"use client";

import React, { useEffect, useState } from "react";

interface SimControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  onSaveClick: () => void;
  onLibraryClick: () => void;
}

function GhostButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 hover:scale-[1.06]"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--border-soft)",
        color: "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

export default function SimControls({
  isPaused,
  onTogglePause,
  onReset,
  onSaveClick,
  onLibraryClick,
}: SimControlsProps) {
  const [localPaused, setLocalPaused] = useState(isPaused);

  useEffect(() => {
    setLocalPaused(isPaused);
  }, [isPaused]);

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
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5"
    >
      {/* Label */}
      <div
        className="px-3 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--text-muted)" }}
      >
        Sim Controls
      </div>

      {/* Control pill */}
      <div
        className="vl-glass-strong flex items-center gap-2 px-2.5 py-2 rounded-2xl"
      >
        {/* Play / Pause — primary green button */}
        <button
          onClick={handleToggle}
          title={localPaused ? "Play (Space)" : "Pause (Space)"}
          aria-label={localPaused ? "Play" : "Pause"}
          className="flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 hover:scale-[1.06]"
          style={{
            background: localPaused
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#0a0a0f",
            boxShadow: localPaused
              ? "0 0 20px rgba(34,197,94,0.55), inset 0 1px 0 rgba(255,255,255,0.25)"
              : "0 0 18px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          {localPaused ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="7,4 20,12 7,20" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          )}
        </button>

        {/* Reset */}
        <GhostButton onClick={onReset} title="Reset (R)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </GhostButton>

        {/* Save */}
        <GhostButton onClick={onSaveClick} title="Save Scenario">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </GhostButton>

        {/* Library */}
        <GhostButton onClick={onLibraryClick} title="Open Library">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" />
            <path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
          </svg>
        </GhostButton>

        {/* Divider */}
        <div className="w-px h-7 mx-0.5" style={{ background: "var(--border-soft)" }} />

        {/* Status pill */}
        <div className="flex items-center gap-1.5 pl-1 pr-2">
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
            className="text-[10px] font-mono uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}
          >
            {localPaused ? "Paused" : "Running"}
          </span>
        </div>
      </div>
    </div>
  );
}
