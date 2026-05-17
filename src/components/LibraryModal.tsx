"use client";

import React, { useEffect, useState } from "react";

interface ScenarioSummary {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (id: string) => void;
}

export default function LibraryModal({ isOpen, onClose, onLoad }: LibraryModalProps) {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("/api/scenarios")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setScenarios(data);
          }
        })
        .catch((err) => console.error("Error fetching scenarios", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: "rgba(18, 18, 26, 0.95)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          maxHeight: "80vh",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#12121a]/80">
          <h2 className="text-lg font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Experiment Library
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12 text-gray-500">
              Loading scenarios...
            </div>
          ) : scenarios.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-12 text-gray-500">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 opacity-50">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p>No saved scenarios found.</p>
              <p className="text-sm mt-1">Create one using the "Save Scenario" button.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {scenarios.map((scenario) => (
                <div
                  key={scenario._id}
                  className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 flex flex-col transition-colors hover:border-gray-500 hover:bg-gray-800/60"
                >
                  <h3 className="font-bold text-gray-200 mb-1">{scenario.name}</h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                    {scenario.description || "No description provided."}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(scenario.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => onLoad(scenario._id)}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: "rgba(34, 197, 94, 0.15)",
                        color: "var(--accent-green)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                      }}
                    >
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
