"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { InspectedBodyData } from "@/app/page";

interface AnalyticsPanelProps {
  isOpen: boolean;
  data: InspectedBodyData | null;
}

export default function AnalyticsPanel({ isOpen, data }: AnalyticsPanelProps) {
  const [history, setHistory] = useState<InspectedBodyData[]>([]);
  const currentBodyIdRef = useRef<number | null>(null);

  // Update history array
  useEffect(() => {
    if (!data) {
      if (history.length > 0) setHistory([]);
      currentBodyIdRef.current = null;
      return;
    }

    // Reset history if different body selected
    if (currentBodyIdRef.current !== data.id) {
      setHistory([data]);
      currentBodyIdRef.current = data.id;
      return;
    }

    setHistory((prev) => {
      // Keep a rolling window of max 100 points
      const newHistory = [...prev, data];
      if (newHistory.length > 100) {
        return newHistory.slice(newHistory.length - 100);
      }
      return newHistory;
    });
  }, [data]);

  return (
    <div
      className={`absolute top-0 right-0 h-full transition-transform duration-300 z-30`}
      style={{
        width: "320px",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        background: "rgba(18, 18, 26, 0.85)",
        backdropFilter: "blur(16px)",
        borderLeft: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-[#12121a]/95 z-10 backdrop-blur-md">
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 4-8" />
          </svg>
          Analytics
        </h2>
      </div>

      {!data ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-3 opacity-50">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 5v-2M12 21v-2M5 12H3M21 12h-2M16.95 7.05l1.41-1.41M5.64 18.36l1.41-1.41M16.95 16.95l1.41 1.41M5.64 5.64l1.41 1.41" />
          </svg>
          <p className="text-sm">Select a body with the Inspect Tool to view real-time metrics.</p>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-6">
          {/* Header Info */}
          <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
            <div className="text-xs font-bold text-gray-300 mb-2 border-b border-gray-700 pb-2">
              {data.label}
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Mass:</span>
              <span className="text-white font-mono">{data.mass.toFixed(2)}</span>
            </div>
          </div>

          {/* Velocity Chart */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-medium text-gray-400">Velocity (v)</span>
              <span className="text-sm font-mono text-cyan-400">{data.velMag.toFixed(2)}</span>
            </div>
            <div className="h-24 w-full bg-[#0a0a0f] rounded border border-gray-800/50 p-1 relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid stroke="#1a1a2e" vertical={false} />
                  <YAxis domain={["auto", "auto"]} hide />
                  <Line
                    type="monotone"
                    dataKey="velMag"
                    stroke="#00d2ff"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Kinetic Energy Chart */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-medium text-gray-400">Kinetic Energy (KE)</span>
              <span className="text-sm font-mono text-purple-400">{data.kineticEnergy.toFixed(2)}</span>
            </div>
            <div className="h-24 w-full bg-[#0a0a0f] rounded border border-gray-800/50 p-1 relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid stroke="#1a1a2e" vertical={false} />
                  <YAxis domain={["auto", "auto"]} hide />
                  <Line
                    type="monotone"
                    dataKey="kineticEnergy"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Net Force Chart */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-medium text-gray-400">Net Force (F)</span>
              <span className="text-sm font-mono text-amber-400">{(data.forceMag * 1000).toFixed(4)}</span>
            </div>
            <div className="h-24 w-full bg-[#0a0a0f] rounded border border-gray-800/50 p-1 relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid stroke="#1a1a2e" vertical={false} />
                  <YAxis domain={["auto", "auto"]} hide />
                  <Line
                    type="monotone"
                    dataKey="forceMag"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
