"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { FoodItem } from "@/lib/food";

interface Props {
  onSelect: (item: FoodItem) => void;
  placeholder?: string;
}

export function FoodTypeahead({ onSelect, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await apiFetch(`/food-items/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data: FoodItem[] = await res.json();
        setResults(data);
      } catch {
        /* aborted */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  async function saveManual() {
    if (!manualName || !manualKcal) return;
    const res = await apiFetch("/food-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: manualName,
        kcal_per_100g: Number(manualKcal),
      }),
    });
    if (!res.ok) return;
    const item: FoodItem = await res.json();
    onSelect(item);
    setManualMode(false);
    setManualName("");
    setManualKcal("");
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder ?? "Search foods…"}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
      {open && (query.trim() || manualMode) && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-border bg-background shadow-lg max-h-72 overflow-y-auto">
          {manualMode ? (
            <div className="p-3 flex flex-col gap-2">
              <input
                type="text"
                placeholder="Food name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
              />
              <input
                type="number"
                placeholder="kcal / 100g"
                min={0}
                value={manualKcal}
                onChange={(e) => setManualKcal(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveManual}
                  className="rounded-lg bg-primary text-primary-foreground text-sm font-medium px-3 py-1.5"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setManualMode(false)}
                  className="rounded-lg border border-border text-sm px-3 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {loading && (
                <div className="p-3 text-xs text-muted-foreground">Searching…</div>
              )}
              {!loading && results.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground">No matches.</div>
              )}
              {results.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-accent border-b border-border last:border-b-0"
                >
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {Number(item.kcal_per_100g).toFixed(0)} kcal / 100g
                    {item.source === "open_food_facts" && " · OFF"}
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent border-t border-border"
              >
                + Add custom food
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
