"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { MealDefinitionListItem } from "@/lib/food";

interface Props {
  onSelect: (item: MealDefinitionListItem) => void;
  placeholder?: string;
}

export function MealDefinitionTypeahead({ onSelect, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MealDefinitionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const res = await apiFetch(`/meal-definitions?q=${encodeURIComponent(query)}`);
      const data: MealDefinitionListItem[] = await res.json();
      setResults(data);
      setLoading(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder ?? "Search saved meals…"}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
      {open && query.trim() && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-border bg-background shadow-lg max-h-72 overflow-y-auto">
          {loading && (
            <div className="p-3 text-xs text-muted-foreground">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">No saved meals match.</div>
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
                {Number(item.total_kcal).toFixed(0)} kcal
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
