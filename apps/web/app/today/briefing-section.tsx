"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface BriefingOut {
  date: string;
  content: string;
  model: string;
  created_at: string;
}

export function BriefingSection() {
  const [briefing, setBriefing] = useState<BriefingOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    apiFetch("/briefing/today")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load briefing");
        return res.json() as Promise<BriefingOut>;
      })
      .then((data) => {
        setBriefing(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load your briefing.");
        setLoading(false);
      });
  }, []);

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const res = await apiFetch("/briefing/today/regenerate", { method: "POST" });
      if (!res.ok) throw new Error("Regenerate failed");
      const data = (await res.json()) as BriefingOut;
      setBriefing(data);
    } catch {
      setError("Could not regenerate briefing.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Your Coach</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setBriefing(null); setCleared(true); setError(null); }}
            disabled={loading || regenerating || cleared}
            className="text-xs text-muted-foreground border border-border rounded-lg px-2 py-1 hover:bg-accent disabled:opacity-50"
          >
            Clear
          </button>
          <button
            onClick={handleRegenerate}
            disabled={loading || regenerating}
            className="text-xs text-muted-foreground border border-border rounded-lg px-2 py-1 hover:bg-accent disabled:opacity-50"
          >
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="h-3 rounded bg-muted animate-pulse w-full" />
          <div className="h-3 rounded bg-muted animate-pulse w-5/6" />
          <div className="h-3 rounded bg-muted animate-pulse w-4/6" />
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-muted-foreground">{error}</p>
      )}

      {briefing && !loading && (
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{briefing.content}</div>
      )}
    </div>
  );
}
