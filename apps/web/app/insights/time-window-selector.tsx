"use client";

import { useState } from "react";
import { WINDOWS, dateRangeFor } from "@/lib/insights";
import type { DateRange, TimeWindow } from "@/lib/insights";

export function TimeWindowSelector({
  onChange,
}: {
  onChange: (range: DateRange) => void;
}) {
  const [active, setActive] = useState<TimeWindow>("4w");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function select(key: TimeWindow) {
    setActive(key);
    if (key !== "custom") {
      onChange(dateRangeFor(key));
    }
  }

  function applyCustom() {
    if (from && to) onChange({ from, to });
  }

  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="flex gap-1">
        {WINDOWS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => select(key)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
              active === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {active === "custom" && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          />
          <button
            onClick={applyCustom}
            disabled={!from || !to}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
}
