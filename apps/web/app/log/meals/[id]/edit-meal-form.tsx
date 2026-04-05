"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { MealLog } from "@/lib/events";

function toLocalTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function EditMealForm({ meal }: { meal: MealLog }) {
  const router = useRouter();

  const [date, setDate] = useState<string>(meal.date);
  const [time, setTime] = useState<string>(toLocalTime(meal.occurred_at));
  const [mealType, setMealType] = useState<string>(meal.meal_type);
  const [notes, setNotes] = useState<string>(meal.notes ?? "");
  const [calories, setCalories] = useState<string>(meal.calories !== null ? String(meal.calories) : "");
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    await apiFetch(`/meals/${meal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        occurred_at: time ? combineDateTime(date, time) : null,
        meal_type: mealType,
        notes: notes || null,
        calories: calories ? Number(calories) : null,
      }),
    });

    router.push("/log");
  }

  return (
    <>
      <Link href="/log" className="text-sm text-muted-foreground mb-4 inline-block">
        ← Back
      </Link>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-sm font-medium">
            Date
          </label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="time" className="text-sm font-medium">
            Time
          </label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="meal_type" className="text-sm font-medium">
            Meal Type
          </label>
          <input
            id="meal_type"
            type="text"
            required
            list="meal-suggestions"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <datalist id="meal-suggestions">
            <option value="Breakfast" />
            <option value="Morning snack" />
            <option value="Lunch" />
            <option value="Afternoon snack" />
            <option value="Dinner" />
          </datalist>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="calories" className="text-sm font-medium">
            Calories (optional)
          </label>
          <input
            id="calories"
            type="number"
            min={0}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </>
  );
}
