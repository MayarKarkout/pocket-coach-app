"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { Plan } from "@/lib/plans";
import type { WorkoutSummary } from "@/lib/workouts";

function sorted<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NewWorkoutForm({
  plans,
  pastWorkouts,
}: {
  plans: Plan[];
  pastWorkouts: WorkoutSummary[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const activePlan = plans.find((p) => p.is_active) ?? plans[0] ?? null;
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(activePlan?.id ?? null);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [copyFromWorkoutId, setCopyFromWorkoutId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const days = selectedPlan ? sorted(selectedPlan.days) : [];

  // Find the most recent past workout for the selected day
  const lastWorkout = selectedDayId != null
    ? pastWorkouts.find((w) => w.plan_day_id === selectedDayId) ?? null
    : null;

  function selectDay(dayId: number) {
    setSelectedDayId(dayId);
    setCopyFromWorkoutId(null); // reset copy choice when day changes
  }

  async function create() {
    if (!selectedDayId) return;
    setSaving(true);
    const res = await apiFetch("/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        plan_day_id: selectedDayId,
        copy_from_workout_id: copyFromWorkoutId,
      }),
    });
    if (!res.ok) { setSaving(false); return; }
    const workout = await res.json();
    router.push(`/workouts/${workout.id}`);
  }

  if (plans.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No plans yet. Create a plan first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Plan</label>
        <select
          value={selectedPlanId ?? ""}
          onChange={(e) => {
            setSelectedPlanId(Number(e.target.value));
            setSelectedDayId(null);
            setCopyFromWorkoutId(null);
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.is_active ? " (active)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Day</label>
        {days.length === 0 ? (
          <p className="text-xs text-muted-foreground">This plan has no days.</p>
        ) : (
          days.map((day) => (
            <button
              key={day.id}
              onClick={() => selectDay(day.id)}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                selectedDayId === day.id
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:bg-accent"
              }`}
            >
              {day.label}
            </button>
          ))
        )}
      </div>

      {/* Copy from last workout option */}
      {lastWorkout && (
        <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
          <p className="text-sm font-medium">Pre-fill sets from</p>
          <div className="flex gap-2">
            <button
              onClick={() => setCopyFromWorkoutId(null)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                copyFromWorkoutId === null
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:bg-accent"
              }`}
            >
              Plan
            </button>
            <button
              onClick={() => setCopyFromWorkoutId(lastWorkout.id)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                copyFromWorkoutId === lastWorkout.id
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:bg-accent"
              }`}
            >
              Last workout ({formatDate(lastWorkout.date)})
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <Button onClick={create} disabled={!selectedDayId || saving}>
          Start workout
        </Button>
        <Button variant="outline" onClick={() => router.push("/workouts")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
