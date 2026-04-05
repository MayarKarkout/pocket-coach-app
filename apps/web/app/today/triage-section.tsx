"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface MergeCandidate {
  workout_id: number;
  label: string;
}

interface PendingWorkout {
  id: number;
  workout_type: string;
  date: string;
  duration_minutes: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  suggested_category: string;
  merge_candidate: MergeCandidate | null;
}

function fmtWorkoutType(t: string): string {
  return t
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function WorkoutTriageCard({
  workout,
  onActioned,
}: {
  workout: PendingWorkout;
  onActioned: (id: number) => void;
}) {
  const [acting, setActing] = useState(false);

  async function act(action: string, workoutId?: number) {
    setActing(true);
    const body: Record<string, unknown> = { action };
    if (workoutId !== undefined) body.workout_id = workoutId;
    await apiFetch(`/gadgetbridge/workouts/${workout.id}/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onActioned(workout.id);
  }

  const meta: string[] = [];
  if (workout.duration_minutes) meta.push(`${workout.duration_minutes} min`);
  if (workout.avg_hr) meta.push(`Avg HR ${workout.avg_hr}`);
  if (workout.max_hr) meta.push(`Max HR ${workout.max_hr}`);

  return (
    <div className="rounded-xl border border-border p-3 flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">{fmtWorkoutType(workout.workout_type)}</p>
        {meta.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">{meta.join(" · ")}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {workout.merge_candidate && (
          <button
            disabled={acting}
            onClick={() => act("merge", workout.merge_candidate!.workout_id)}
            className="text-xs border border-primary text-primary rounded-lg px-3 py-1.5 hover:bg-primary/10 disabled:opacity-50"
          >
            Merge: {workout.merge_candidate.label}
          </button>
        )}
        <button
          disabled={acting}
          onClick={() => act("new_workout")}
          className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-accent disabled:opacity-50"
        >
          New Workout
        </button>
        <button
          disabled={acting}
          onClick={() => act("new_activity")}
          className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-accent disabled:opacity-50"
        >
          New Activity
        </button>
        <button
          disabled={acting}
          onClick={() => act("dismiss")}
          className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-accent disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function TriageSection() {
  const [pending, setPending] = useState<PendingWorkout[]>([]);

  useEffect(() => {
    apiFetch("/gadgetbridge/workouts/pending")
      .then((r) => r.json() as Promise<PendingWorkout[]>)
      .then(setPending);
  }, []);

  if (pending.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">From your watch</h2>
      <div className="flex flex-col gap-3">
        {pending.map((w) => (
          <WorkoutTriageCard
            key={w.id}
            workout={w}
            onActioned={(id) => setPending((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
