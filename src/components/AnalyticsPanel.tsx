"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  AreaChart,
  Area,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import type { InspectedBodyData } from "@/app/page";

interface AnalyticsPanelProps {
  isOpen: boolean;
  data: InspectedBodyData | null;
  showObjectPanel: boolean;
  onClose?: () => void;
}

function Sparkline({
  history,
  dataKey,
  color,
}: {
  history: InspectedBodyData[];
  dataKey: keyof InspectedBodyData;
  color: string;
}) {
  const gradId = `vl-spark-${dataKey as string}`;
  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["auto", "auto"]} hide />
          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={2.25}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricBlock({
  title,
  value,
  color,
  history,
  dataKey,
}: {
  title: string;
  value: string;
  color: string;
  history: InspectedBodyData[];
  dataKey: keyof InspectedBodyData;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
          {title}
        </span>
        <span
          className="text-[11px] font-mono font-semibold"
          style={{ color }}
        >
          {value}
        </span>
      </div>
      <Sparkline history={history} dataKey={dataKey} color={color} />
    </div>
  );
}

export default function AnalyticsPanel({
  isOpen,
  data,
  showObjectPanel,
  onClose,
}: AnalyticsPanelProps) {
  const [history, setHistory] = useState<InspectedBodyData[]>([]);
  const currentBodyIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data) {
      if (history.length > 0) setHistory([]);
      currentBodyIdRef.current = null;
      return;
    }
    if (currentBodyIdRef.current !== data.id) {
      setHistory([data]);
      currentBodyIdRef.current = data.id;
      return;
    }
    setHistory((prev) => {
      const newHistory = [...prev, data];
      if (newHistory.length > 100) return newHistory.slice(newHistory.length - 100);
      return newHistory;
    });
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  // Stack below ObjectPanel when both are open (320 + 24 gap, 50vh).
  // When ObjectPanel is closed, sit at the top-right where ObjectPanel would have been.
  const topOffset = showObjectPanel ? "calc(50vh + 16px)" : "80px";
  const maxHeight = showObjectPanel ? "calc(50vh - 40px)" : "calc(100vh - 200px)";

  return (
    <div
      className="vl-glass-strong absolute right-5 z-30 rounded-2xl flex flex-col transition-all duration-300"
      style={{
        width: "320px",
        top: topOffset,
        maxHeight,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Analytics
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className="w-1.5 h-1.5 rounded-full vl-pulse"
              style={{
                background: data ? "var(--accent-green)" : "var(--text-muted)",
                boxShadow: data ? "0 0 6px var(--accent-green)" : "none",
              }}
            />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {data ? "Live Data" : "No selection"}
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close Analytics"
            className="w-7 h-7 rounded-md flex items-center justify-center text-base transition-colors hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
          >
            ×
          </button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto px-4 pb-4 flex flex-col gap-4 pt-2">
        {!data ? (
          <div
            className="flex flex-col items-center justify-center text-center py-10 gap-3"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.6">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.2" y1="16.2" x2="21" y2="21" />
            </svg>
            <p className="text-[11px] leading-relaxed max-w-[220px]">
              Use the <span style={{ color: "var(--accent-purple)" }}>Inspect</span> tool on a body to see live metrics.
            </p>
          </div>
        ) : (
          <>
            <MetricBlock
              title="Velocity"
              value={data.velMag.toFixed(2)}
              color="#00d2ff"
              history={history}
              dataKey="velMag"
            />
            <MetricBlock
              title="Kinetic Energy"
              value={data.kineticEnergy.toFixed(2)}
              color="#a855f7"
              history={history}
              dataKey="kineticEnergy"
            />
            <MetricBlock
              title="Net Force"
              value={(data.forceMag * 1000).toFixed(3)}
              color="#f59e0b"
              history={history}
              dataKey="forceMag"
            />
          </>
        )}
      </div>
    </div>
  );
}
