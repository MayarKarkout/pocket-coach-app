"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { FoodTypeahead } from "../food-typeahead";
import type { FoodItem, MealDefinition } from "@/lib/food";

interface IngredientRow {
  food_item_id: number;
  food_item_name: string;
  kcal_per_100g: number;
  quantity_grams: string;
}

interface Props {
  existing?: MealDefinition;
}

export function MealDefinitionForm({ existing }: Props) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    existing?.ingredients.map((i) => ({
      food_item_id: i.food_item_id,
      food_item_name: i.food_item_name,
      kcal_per_100g: Number(i.kcal_per_100g),
      quantity_grams: i.quantity_grams,
    })) ?? [],
  );
  const [submitting, setSubmitting] = useState(false);

  function addIngredient(item: FoodItem) {
    setIngredients((prev) => [
      ...prev,
      {
        food_item_id: item.id,
        food_item_name: item.name,
        kcal_per_100g: Number(item.kcal_per_100g),
        quantity_grams: "100",
      },
    ]);
  }

  function updateIngredientQty(idx: number, value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, quantity_grams: value } : ing)),
    );
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalKcal = ingredients.reduce((acc, ing) => {
    const grams = Number(ing.quantity_grams);
    if (!Number.isFinite(grams)) return acc;
    return acc + (ing.kcal_per_100g * grams) / 100;
  }, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const payload = {
      name,
      notes: notes || null,
      ingredients: ingredients.map((ing) => ({
        food_item_id: ing.food_item_id,
        quantity_grams: Number(ing.quantity_grams),
      })),
    };

    const path = existing ? `/meal-definitions/${existing.id}` : "/meal-definitions";
    const method = existing ? "PATCH" : "POST";
    const res = await apiFetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) router.push("/food/library");
    else setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Notes (optional)</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Ingredients</label>
        {ingredients.length > 0 ? (
          <div className="flex flex-col gap-2">
            {ingredients.map((ing, idx) => {
              const grams = Number(ing.quantity_grams);
              const kcal = Number.isFinite(grams)
                ? (ing.kcal_per_100g * grams) / 100
                : 0;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ing.food_item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ing.kcal_per_100g.toFixed(0)} kcal / 100g · {kcal.toFixed(0)} kcal total
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={ing.quantity_grams}
                    onChange={(e) => updateIngredientQty(idx, e.target.value)}
                    className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm text-right"
                  />
                  <span className="text-xs text-muted-foreground">g</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => removeIngredient(idx)}
                  >
                    ✕
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No ingredients yet. Search to add.</p>
        )}

        <FoodTypeahead onSelect={addIngredient} placeholder="Add ingredient…" />
      </div>

      <div className="rounded-xl border border-border p-3 flex items-center justify-between">
        <span className="text-sm font-medium">Total</span>
        <span className="text-lg font-bold">{totalKcal.toFixed(0)} kcal</span>
      </div>

      <button
        type="submit"
        disabled={submitting || !name}
        className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Saving…" : existing ? "Save" : "Create meal"}
      </button>
    </form>
  );
}
