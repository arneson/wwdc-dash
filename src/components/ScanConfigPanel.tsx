"use client";

import { useState } from "react";
import { ScanConfig, SOURCE_CONFIG, EventSource } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

interface ScanConfigPanelProps {
  configs: ScanConfig[];
  onSave: (configs: ScanConfig[]) => void;
}

export default function ScanConfigPanel({
  configs,
  onSave,
}: ScanConfigPanelProps) {
  const [local, setLocal] = useState<ScanConfig[]>(configs);
  const [newTerms, setNewTerms] = useState<Record<string, string>>({});

  const toggleEnabled = (source: EventSource) => {
    const updated = local.map((c) =>
      c.source === source ? { ...c, enabled: !c.enabled } : c
    );
    setLocal(updated);
    onSave(updated);
  };

  const addTerm = (source: EventSource) => {
    const term = newTerms[source]?.trim();
    if (!term) return;
    const updated = local.map((c) =>
      c.source === source
        ? { ...c, searchTerms: [...c.searchTerms, term] }
        : c
    );
    setLocal(updated);
    onSave(updated);
    setNewTerms((prev) => ({ ...prev, [source]: "" }));
  };

  const removeTerm = (source: EventSource, idx: number) => {
    const updated = local.map((c) =>
      c.source === source
        ? { ...c, searchTerms: c.searchTerms.filter((_, i) => i !== idx) }
        : c
    );
    setLocal(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      {local.map((config) => {
        const srcConfig = SOURCE_CONFIG[config.source];
        return (
          <div
            key={config.source}
            className={`bg-white rounded-xl border border-gray-200 p-4 ${
              !config.enabled ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: srcConfig.color }}
                />
                <h3 className="font-semibold text-gray-900">
                  {srcConfig.icon} {srcConfig.label}
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-gray-500">
                  {config.enabled ? "On" : "Off"}
                </span>
                <div
                  onClick={() => toggleEnabled(config.source)}
                  className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${
                    config.enabled ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5 ${
                      config.enabled ? "translate-x-5 ml-0.5" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {config.searchTerms.map((term, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm"
                >
                  {term}
                  <button
                    onClick={() => removeTerm(config.source, idx)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={newTerms[config.source] || ""}
                onChange={(e) =>
                  setNewTerms((prev) => ({
                    ...prev,
                    [config.source]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTerm(config.source);
                  }
                }}
                placeholder="Add search term..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
              />
              <button
                onClick={() => addTerm(config.source)}
                className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
