"use client";

import React from "react";

export default function WorkspaceHeader() {
  return (
    <div className="absolute top-5 left-6 z-30 pointer-events-none select-none">
      <div className="flex flex-col leading-tight">
        <span
          className="text-[20px] font-bold tracking-tight"
          style={{
            background: "var(--gradient-brand)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Virtual Labs
        </span>
        <span
          className="text-[11px] font-medium tracking-wider uppercase mt-0.5"
          style={{ color: "var(--text-muted)", letterSpacing: "0.14em" }}
        >
          Physics Workspace
        </span>
      </div>
    </div>
  );
}
