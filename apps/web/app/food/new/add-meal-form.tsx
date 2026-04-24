"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { FoodTypeahead } from "../food-typeahead";
import { MealDefinitionTypeahead } from "../meal-definition-typeahead";
import type { FoodItem, MealDefinitionListItem } from "@/lib/food";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowLocalTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

const PRESETS: { label: string; value: number }[] = [
  { label: "Whole", value: 1 },
  { label: "½", value: 0.5 },
  { label: "⅓", value: 1 / 3 },
  { label: "¼", value: 0.25 },
];

const MEAL_CATEGORIES = ["Breakfast", "Morning snack", "Lunch", "Afternoon snack", "Dinner"];

interface SelectedDef {
  id: number;
  name: string;
  kcal: number;
}

interface SaveIngredient {
  food_item_id: number;
  food_item_name: string;
  kcal_per_100g: number;
  quantity_grams: string;
}

export function AddMealForm({ initialDate }: { initialDate: string }) {
  const router = useRouter();

  const [date, setDate] = useState(initialDate || todayISO());
  const [time, setTime] = useState(nowLocalTime());
  // meal_type is always the category (Breakfast/Lunch etc)
  const [mealType, setMealType] = useState("");
  const [notes, setNotes] = useState("");
  const [calories, setCalories] = useState("");

  // Library path
  const [selectedDef, setSelectedDef] = useState<SelectedDef | null>(null);
  const [multiplier, setMultiplier] = useState<string>("1");

  // Save-as-definition (free-text path only)
  const [saveAsDef, setSaveAsDef] = useState(false);
  const [defName, setDefName] = useState("");
  const [defIngredients, setDefIngredients] = useState<SaveIngredient[]>([]);

  const [submitting, setSubmitting] = useState(false);

  function selectDefinition(item: MealDefinitionListItem) {
    setSelectedDef({ id: item.id, name: item.name, kcal: Number(item.total_kcal) });
    // Don't auto-fill meal_type — user picks the category separately
  }

  function clearDefinition() {
    setSelectedDef(null);
    setMultiplier("1");
  }

  function pickPreset(value: number) {
    setMultiplier(value === 1 ? "1" : value.toFixed(3).replace(/\.?0+$/, ""));
  }

  function addDefIngredient(item: FoodItem) {
    setDefIngredients((prev) => [
      ...prev,
      { food_item_id: item.id, food_item_name: item.name, kcal_per_100g: Number(item.kcal_per_100g), quantity_grams: "100" },
    ]);
  }

  const previewKcal = selectedDef ? selectedDef.kcal * Number(multiplier || 0) : null;

  const defTotalKcal = defIngredients.reduce((acc, ing) => {
    const g = Number(ing.quantity_grams);
    return Number.isFinite(g) ? acc + (ing.kcal_per_100g * g) / 100 : acc;
  }, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    let definitionId: number | null = selectedDef?.id ?? null;

    if (!selectedDef && saveAsDef) {
      const res = await apiFetch("/meal-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: defName || mealType || "Untitled meal",
          notes: notes || null,
          ingredients: defIngredients.map((ing) => ({
            food_item_id: ing.food_item_id,
            quantity_grams: Number(ing.quantity_grams),
          })),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        definitionId = created.id;
      }
    }

    const multiplierNum = Number(multiplier);
    const body: Record<string, unknown> = {
      date,
      occurred_at: time ? combineDateTime(date, time) : null,
      meal_type: mealType,
      notes: notes || null,
      calories: calories ? Number(calories) : null,
    };

    if (definitionId !== null) {
      body.meal_definition_id = definitionId;
      body.portion_multiplier = Number.isFinite(multiplierNum) && multiplierNum > 0 ? multiplierNum : 1;
    }

    const res = await apiFetch("/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) router.push(`/food?date=${date}`);
    else setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Date + time */}
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-sm font-medium">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-sm font-medium">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Category</label>
        <input
          type="text"
          required
          list="meal-suggestions"
          placeholder="e.g. Breakfast, Lunch, Dinner"
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <datalist id="meal-suggestions">
          {MEAL_CATEGORIES.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>

      {/* Library pick */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Meal <span className="text-muted-foreground font-normal">(from library, optional)</span></label>
        {selectedDef ? (
          <div className="rounded-xl border border-border px-3 py-2.5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedDef.name}</p>
              <p className="text-xs text-muted-foreground">{selectedDef.kcal.toFixed(0)} kcal · 1 portion</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={clearDefinition}>✕</Button>
          </div>
        ) : (
          <MealDefinitionTypeahead onSelect={selectDefinition} placeholder="Search saved meals…" />
        )}
      </div>

      {/* Portion (only when def selected) */}
      {selectedDef && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Portion</label>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                onClick={() => pickPreset(p.value)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${
                  Math.abs(Number(multiplier) - p.value) < 0.01
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.01"
            min={0}
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="Custom multiplier"
          />
          {previewKcal != null && (
            <p className="text-sm font-medium">{previewKcal.toFixed(0)} kcal</p>
          )}
        </div>
      )}

      {/* Free-text path (no def selected) */}
      {!selectedDef && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Calories <span className="text-muted-foreground font-normal">(optional — AI will estimate if blank)</span></label>
            <input
              type="number"
              min={0}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="e.g. 200g chicken, rice, salad"
            />
          </div>

          {/* Save as definition */}
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsDef}
                onChange={(e) => setSaveAsDef(e.target.checked)}
              />
              Save as meal in library
            </label>
            {saveAsDef && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Meal name</label>
                  <input
                    type="text"
                    value={defName}
                    placeholder={mealType || "Untitled meal"}
                    onChange={(e) => setDefName(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  {defIngredients.map((ing, idx) => {
                    const g = Number(ing.quantity_grams);
                    const k = Number.isFinite(g) ? (ing.kcal_per_100g * g) / 100 : 0;
                    return (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ing.food_item_name}</p>
                          <p className="text-xs text-muted-foreground">{k.toFixed(0)} kcal</p>
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={ing.quantity_grams}
                          onChange={(e) =>
                            setDefIngredients((prev) =>
                              prev.map((row, i) => i === idx ? { ...row, quantity_grams: e.target.value } : row)
                            )
                          }
                          className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm text-right"
                        />
                        <span className="text-xs text-muted-foreground">g</span>
                        <Button type="button" size="sm" variant="outline"
                          onClick={() => setDefIngredients((prev) => prev.filter((_, i) => i !== idx))}>
                          ✕
                        </Button>
                      </div>
                    );
                  })}
                  <FoodTypeahead onSelect={addDefIngredient} placeholder="Search foods to add…" />
                </div>
                {defIngredients.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Library total: <span className="font-medium text-foreground">{defTotalKcal.toFixed(0)} kcal</span>
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Notes when def selected */}
      {selectedDef && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !mealType}
        className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Log meal"}
      </button>
    </form>
  );
}
