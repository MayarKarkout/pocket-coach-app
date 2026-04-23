"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { apiFetch } from "@/lib/api";
import type { MealDefinitionListItem } from "@/lib/food";

export default function MealLibraryPage() {
  const [items, setItems] = useState<MealDefinitionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadItems("");
  }, []);

  async function loadItems(q: string) {
    setLoading(true);
    const path = q ? `/meal-definitions?q=${encodeURIComponent(q)}` : "/meal-definitions";
    const res = await apiFetch(path);
    const data: MealDefinitionListItem[] = await res.json();
    setItems(data);
    setLoading(false);
  }

  async function deleteItem(id: number) {
    const res = await apiFetch(`/meal-definitions/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/food" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Food
          </Link>
          <h1 className="text-2xl font-bold mt-1">Meal Library</h1>
        </div>
        <Link
          href="/food/library/new"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          + New
        </Link>
      </div>

      <input
        type="search"
        placeholder="Search meals…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          loadItems(e.target.value);
        }}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mb-4"
      />

      {loading ? (
        <PageSpinner />
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">
          No saved meals yet. Tap + New to create your first.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <MealRow key={item.id} item={item} onDelete={() => deleteItem(item.id)} />
          ))}
        </div>
      )}
    </main>
  );
}

function MealRow({
  item,
  onDelete,
}: {
  item: MealDefinitionListItem;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Link
      href={`/food/library/${item.id}`}
      className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 hover:bg-accent"
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="font-medium">{item.name}</span>
        <span className="text-xs text-muted-foreground">
          {Number(item.total_kcal).toFixed(0)} kcal
        </span>
        {item.notes && <span className="text-xs text-muted-foreground truncate">{item.notes}</span>}
      </div>
      <Button
        size="sm"
        variant="outline"
        className={
          confirming
            ? "bg-red-500 text-white border-red-500 hover:bg-red-600 hover:text-white"
            : ""
        }
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          confirming ? onDelete() : setConfirming(true);
        }}
        onBlur={() => setConfirming(false)}
      >
        ✕
      </Button>
    </Link>
  );
}
