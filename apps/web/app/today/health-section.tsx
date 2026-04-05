"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface HealthSnapshot {
  steps: number | null;
  calories_active: number | null;
  resting_hr: number | null;
  hrv: number | null;
  spo2: number | null;
  stress_avg: number | null;
  sleep_duration_minutes: number | null;
  sleep_deep_minutes: number | null;
  sleep_rem_minutes: number | null;
}

function fmtSleep(min: number | null): string {
  if (min === null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function HealthSection({ health }: { health: HealthSnapshot | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!health) return null;

  const stepsDisplay = health.steps !== null ? health.steps.toLocaleString() : "—";
  const sleepDisplay = fmtSleep(health.sleep_duration_minutes);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full rounded-xl border border-border p-3 text-left hover:bg-accent"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Health
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </div>

      <div className="flex gap-6">
        <div>
          <p className="text-sm font-medium">{stepsDisplay}</p>
          <p className="text-xs text-muted-foreground">steps</p>
        </div>
        <div>
          <p className="text-sm font-medium">{sleepDisplay}</p>
          <p className="text-xs text-muted-foreground">sleep</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3">
          <Metric
            label="Resting HR"
            value={health.resting_hr !== null ? `${health.resting_hr} bpm` : "—"}
          />
          <Metric
            label="HRV"
            value={health.hrv !== null ? `${Math.round(health.hrv)} ms` : "—"}
          />
          <Metric
            label="SpO2"
            value={health.spo2 !== null ? `${health.spo2.toFixed(1)}%` : "—"}
          />
          <Metric
            label="Stress"
            value={health.stress_avg !== null ? String(health.stress_avg) : "—"}
          />
          <Metric
            label="Active kcal"
            value={health.calories_active !== null ? String(health.calories_active) : "—"}
          />
          {health.sleep_deep_minutes !== null && (
            <Metric label="Deep sleep" value={fmtSleep(health.sleep_deep_minutes)} />
          )}
          {health.sleep_rem_minutes !== null && (
            <Metric label="REM sleep" value={fmtSleep(health.sleep_rem_minutes)} />
          )}
        </div>
      )}
    </button>
  );
}
