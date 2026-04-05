"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { Workout, WorkoutExercise, WorkoutSet } from "@/lib/workouts";

// ── helpers ───────────────────────────────────────────────────────────────────

function sorted<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

function formatDuration(min: number | null, max: number | null): string {
  const fmt = (s: number) =>
    s >= 60
      ? `${Math.floor(s / 60)}min${s % 60 ? `${s % 60}s` : ""}`
      : `${s}s`;
  if (min == null) return "—";
  return max != null && max !== min ? `${fmt(min)}–${fmt(max)}` : fmt(min);
}

function formatSet(s: WorkoutSet): string {
  const load =
    s.duration_min_seconds != null
      ? formatDuration(s.duration_min_seconds, s.duration_max_seconds)
      : s.reps_max != null && s.reps_max !== s.reps_min
      ? `${s.reps_min}–${s.reps_max} reps`
      : `${s.reps_min ?? "—"} reps`;
  const weight = s.weight_kg != null ? ` · ${s.weight_kg} kg` : "";
  return `${load}${weight}`;
}

// ── DeleteButton ──────────────────────────────────────────────────────────────

function DeleteButton({ onDelete, children = "✕" }: { onDelete: () => void | Promise<void>; children?: React.ReactNode }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className={confirming ? "bg-red-500 text-white border-red-500 hover:bg-red-600 hover:text-white" : ""}
      onClick={() => (confirming ? onDelete() : setConfirming(true))}
      onBlur={() => setConfirming(false)}
    >
      ✕
    </Button>
  );
}

// ── SetForm ───────────────────────────────────────────────────────────────────

interface SetFormState {
  is_timed: boolean;
  reps_min: string;
  reps_max: string;
  duration_min: string;
  duration_max: string;
  weight_kg: string;
  notes: string;
}

function defaultSetForm(prev?: WorkoutSet): SetFormState {
  if (!prev) {
    return {
      is_timed: false,
      reps_min: "",
      reps_max: "",
      duration_min: "",
      duration_max: "",
      weight_kg: "",
      notes: "",
    };
  }
  return {
    is_timed: prev.duration_min_seconds != null,
    reps_min: prev.reps_min != null ? String(prev.reps_min) : "",
    reps_max: prev.reps_max != null ? String(prev.reps_max) : "",
    duration_min: prev.duration_min_seconds != null ? String(prev.duration_min_seconds) : "",
    duration_max: prev.duration_max_seconds != null ? String(prev.duration_max_seconds) : "",
    weight_kg: prev.weight_kg != null ? String(prev.weight_kg) : "",
    notes: prev.notes ?? "",
  };
}

function toSetPayload(f: SetFormState) {
  return {
    reps_min: f.is_timed ? null : (f.reps_min ? Number(f.reps_min) : null),
    reps_max: f.is_timed ? null : (f.reps_max ? Number(f.reps_max) : null),
    duration_min_seconds: f.is_timed ? (f.duration_min ? Number(f.duration_min) : null) : null,
    duration_max_seconds: f.is_timed ? (f.duration_max ? Number(f.duration_max) : null) : null,
    weight_kg: f.weight_kg ? f.weight_kg : null,
    notes: f.notes || null,
  };
}

function SetForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: WorkoutSet;
  onSave: (payload: ReturnType<typeof toSetPayload>) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<SetFormState>(defaultSetForm(initial));
  const set = (k: keyof SetFormState, v: string | boolean) =>
    setF((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <div className="flex gap-2 items-center flex-wrap">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={f.is_timed}
            onChange={(e) => set("is_timed", e.target.checked)}
          />
          Timed
        </label>
      </div>

      {f.is_timed ? (
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="number"
            value={f.duration_min}
            onChange={(e) => set("duration_min", e.target.value)}
            min={1}
            placeholder="Seconds"
            className="w-24 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="number"
            value={f.duration_max}
            onChange={(e) => set("duration_max", e.target.value)}
            min={1}
            placeholder="Max (opt.)"
            className="w-24 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">s</span>
        </div>
      ) : (
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="number"
            value={f.reps_min}
            onChange={(e) => set("reps_min", e.target.value)}
            min={1}
            placeholder="Reps"
            className="w-16 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="number"
            value={f.reps_max}
            onChange={(e) => set("reps_max", e.target.value)}
            min={1}
            placeholder="Max (opt.)"
            className="w-24 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">reps</span>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={f.weight_kg}
          onChange={(e) => set("weight_kg", e.target.value)}
          min={0}
          step={0.5}
          placeholder="kg (opt.)"
          className="w-24 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-xs text-muted-foreground">kg</span>
      </div>

      <input
        type="text"
        value={f.notes}
        onChange={(e) => set("notes", e.target.value)}
        placeholder="Notes (opt.)"
        className="rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
      />

      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(toSetPayload(f))}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── SetRow ────────────────────────────────────────────────────────────────────

function SetRow({
  s,
  setNum,
  exerciseId,
  workoutId,
  onUpdate,
}: {
  s: WorkoutSet;
  setNum: number;
  exerciseId: number;
  workoutId: number;
  onUpdate: (w: Workout) => void;
}) {
  const [editing, setEditing] = useState(false);
  const base = `/workouts/${workoutId}/exercises/${exerciseId}/sets/${s.id}`;

  async function save(payload: ReturnType<typeof toSetPayload>) {
    const res = await apiFetch(base, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
    setEditing(false);
  }

  async function remove() {
    const res = await apiFetch(base, { method: "DELETE" });
    if (!res.ok) return;
    onUpdate(await (await apiFetch(`/workouts/${workoutId}`)).json());
  }

  if (editing) {
    return <SetForm initial={s} onSave={save} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-6 shrink-0">{setNum}</span>
      <span className="flex-1 text-sm">{formatSet(s)}</span>
      {s.notes && <span className="text-xs text-muted-foreground truncate max-w-32">{s.notes}</span>}
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
      <DeleteButton onDelete={remove} >✕</DeleteButton>
    </div>
  );
}

// ── ExerciseCard ──────────────────────────────────────────────────────────────

function ExerciseCard({
  ex,
  workoutId,
  onUpdate,
}: {
  ex: WorkoutExercise;
  workoutId: number;
  onUpdate: (w: Workout) => void;
}) {
  const [addingSet, setAddingSet] = useState(false);
  const base = `/workouts/${workoutId}/exercises/${ex.id}`;
  const sets = sorted(ex.sets);
  const lastSet = sets[sets.length - 1];

  async function remove() {
    const res = await apiFetch(base, { method: "DELETE" });
    if (!res.ok) return;
    onUpdate(await (await apiFetch(`/workouts/${workoutId}`)).json());
  }

  async function addSet(payload: ReturnType<typeof toSetPayload>) {
    const res = await apiFetch(`${base}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
    setAddingSet(false);
  }

  async function duplicateLastSet() {
    if (!lastSet) return;
    const res = await apiFetch(`${base}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reps_min: lastSet.reps_min,
        reps_max: lastSet.reps_max,
        duration_min_seconds: lastSet.duration_min_seconds,
        duration_max_seconds: lastSet.duration_max_seconds,
        weight_kg: lastSet.weight_kg,
        notes: null,
      }),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-center gap-2">
        <span className="flex-1 font-medium text-sm">{ex.name}</span>
        <DeleteButton onDelete={remove}>✕</DeleteButton>
      </div>

      {sets.length > 0 && (
        <div className="flex flex-col gap-1.5 pl-1">
          {sets.map((s, idx) => (
            <SetRow
              key={s.id}
              s={s}
              setNum={idx + 1}
              exerciseId={ex.id}
              workoutId={workoutId}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}

      {addingSet ? (
        <SetForm
          initial={lastSet}
          onSave={addSet}
          onCancel={() => setAddingSet(false)}
        />
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAddingSet(true)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            + Add set
          </button>
          {lastSet && (
            <button
              onClick={duplicateLastSet}
              className="text-base text-muted-foreground hover:text-foreground"
              title="Duplicate last set"
            >
              ⧉
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── SupersetGroup ─────────────────────────────────────────────────────────────

function SupersetGroup({
  label,
  exercises,
  workoutId,
  onUpdate,
}: {
  label: string;
  exercises: WorkoutExercise[];
  workoutId: number;
  onUpdate: (w: Workout) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
      <span className="text-xs font-bold text-muted-foreground">Superset {label}</span>
      {exercises.map((ex) => (
        <ExerciseCard key={ex.id} ex={ex} workoutId={workoutId} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

// ── AddExerciseForm ───────────────────────────────────────────────────────────

function AddExerciseForm({
  workoutId,
  onUpdate,
  onCancel,
}: {
  workoutId: number;
  onUpdate: (w: Workout) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  async function save() {
    if (!name.trim()) return;
    const res = await apiFetch(`/workouts/${workoutId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
    onCancel();
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        autoFocus
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <Button size="sm" onClick={save} disabled={!name.trim()}>Add</Button>
      <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

// ── WorkoutLog ────────────────────────────────────────────────────────────────

function toLocalTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function nowLocalTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function WorkoutLog({ initialWorkout }: { initialWorkout: Workout }) {
  const router = useRouter();
  const [workout, setWorkout] = useState(initialWorkout);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [startTime, setStartTime] = useState(toLocalTime(initialWorkout.started_at));
  const [endTime, setEndTime] = useState(toLocalTime(initialWorkout.finished_at));
  const [addingExercise, setAddingExercise] = useState(false);

  async function saveNotes() {
    const res = await apiFetch(`/workouts/${workout.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes || null }),
    });
    if (!res.ok) return;
    setWorkout(await res.json());
    setEditingNotes(false);
  }

  const exercises = sorted(workout.exercises);

  // Group by superset_group, preserving interleaved order
  type Item =
    | { kind: "standalone"; ex: WorkoutExercise }
    | { kind: "superset"; label: string; exercises: WorkoutExercise[] };

  const items: Item[] = [];
  const seenGroups = new Set<string>();

  for (const ex of exercises) {
    if (ex.superset_group == null) {
      items.push({ kind: "standalone", ex });
    } else if (!seenGroups.has(ex.superset_group)) {
      seenGroups.add(ex.superset_group);
      items.push({
        kind: "superset",
        label: ex.superset_group,
        exercises: exercises.filter((e) => e.superset_group === ex.superset_group),
      });
    }
  }

  async function deleteWorkout() {
    const res = await apiFetch(`/workouts/${workout.id}`, { method: "DELETE" });
    if (!res.ok) return;
    router.push("/workouts");
  }

  async function patchTime(field: "started_at" | "finished_at", timeValue: string | null) {
    let iso: string | null = null;
    if (timeValue) {
      // Combine workout date with entered local time → ISO UTC
      iso = new Date(`${workout.date}T${timeValue}`).toISOString();
    }
    const res = await apiFetch(`/workouts/${workout.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: iso }),
    });
    if (!res.ok) return;
    setWorkout(await res.json());
  }

  function formatDuration(start: string, end: string): string {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/workouts")}
          className="text-muted-foreground hover:text-foreground mr-1"
          aria-label="Back to workouts"
        >←</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{workout.plan_day_label}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(workout.date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              Start
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                onBlur={(e) => patchTime("started_at", e.target.value || null)}
                className="rounded border border-border bg-background px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              End
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                onBlur={(e) => patchTime("finished_at", e.target.value || null)}
                className="rounded border border-border bg-background px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
            <button
              onClick={async () => {
                const t = nowLocalTime();
                setEndTime(t);
                await patchTime("finished_at", t);
              }}
              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5"
            >
              Now
            </button>
            {workout.started_at && workout.finished_at && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(workout.started_at, workout.finished_at)}
              </span>
            )}
          </div>
        </div>
        <DeleteButton onDelete={deleteWorkout}>Delete</DeleteButton>
      </div>

      {/* Notes */}
      <div>
        {editingNotes ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Workout notes..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveNotes}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setNotes(workout.notes ?? ""); setEditingNotes(false); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className="text-sm text-muted-foreground hover:text-foreground text-left"
          >
            {workout.notes ? workout.notes : "+ Add notes"}
          </button>
        )}
      </div>

      {/* Exercises */}
      <div className="flex flex-col gap-3">
        {items.map((item, idx) =>
          item.kind === "standalone" ? (
            <ExerciseCard
              key={item.ex.id}
              ex={item.ex}
              workoutId={workout.id}
              onUpdate={setWorkout}
            />
          ) : (
            <SupersetGroup
              key={`ss-${item.label}`}
              label={item.label}
              exercises={item.exercises}
              workoutId={workout.id}
              onUpdate={setWorkout}
            />
          )
        )}
      </div>

      {/* Add exercise */}
      {addingExercise ? (
        <AddExerciseForm
          workoutId={workout.id}
          onUpdate={setWorkout}
          onCancel={() => setAddingExercise(false)}
        />
      ) : (
        <button
          onClick={() => setAddingExercise(true)}
          className="text-sm text-muted-foreground hover:text-foreground text-left"
        >
          + Add exercise
        </button>
      )}
    </div>
  );
}
