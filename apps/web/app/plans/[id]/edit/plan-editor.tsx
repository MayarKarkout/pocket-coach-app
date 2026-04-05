"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { Plan, PlanDay, PlanExercise, Superset } from "@/lib/plans";

// ── helpers ───────────────────────────────────────────────────────────────────

function sorted<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

function formatLoad(ex: PlanExercise): string {
  const load = ex.duration_seconds != null
    ? ex.duration_seconds >= 60
      ? `${Math.floor(ex.duration_seconds / 60)}min${ex.duration_seconds % 60 ? ` ${ex.duration_seconds % 60}s` : ""}`
      : `${ex.duration_seconds}s`
    : ex.reps_max != null
      ? `${ex.reps_min}–${ex.reps_max} reps`
      : `${ex.reps_min ?? "?"} reps`;
  return ex.per_side ? `${load} / side` : load;
}

// ── DeleteButton ──────────────────────────────────────────────────────────────

function DeleteButton({
  onDelete,
  size = "sm",
  children = "✕",
}: {
  onDelete: () => void;
  size?: "sm" | "default";
  children?: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Button
      size={size}
      variant="outline"
      className={confirming ? "bg-red-500 text-white border-red-500 hover:bg-red-600 hover:text-white" : ""}
      onClick={() => confirming ? onDelete() : setConfirming(true)}
      onBlur={() => setConfirming(false)}
    >
      {children}
    </Button>
  );
}

// ── ExerciseForm ──────────────────────────────────────────────────────────────

interface ExerciseFormState {
  name: string;
  planned_sets: string;
  reps_min: string;
  reps_max: string;
  duration_seconds: string;
  per_side: boolean;
  intensity_pct: string;
  rest_seconds: string;
  is_timed: boolean;
}

function defaultForm(ex?: PlanExercise): ExerciseFormState {
  if (!ex) {
    return {
      name: "", planned_sets: "3", reps_min: "8", reps_max: "",
      duration_seconds: "", per_side: false, intensity_pct: "70",
      rest_seconds: "90", is_timed: false,
    };
  }
  return {
    name: ex.name,
    planned_sets: String(ex.planned_sets),
    reps_min: ex.reps_min != null ? String(ex.reps_min) : "",
    reps_max: ex.reps_max != null ? String(ex.reps_max) : "",
    duration_seconds: ex.duration_seconds != null ? String(ex.duration_seconds) : "",
    per_side: ex.per_side,
    intensity_pct: String(ex.intensity_pct),
    rest_seconds: String(ex.rest_seconds),
    is_timed: ex.duration_seconds != null,
  };
}

function toExercisePayload(f: ExerciseFormState) {
  return {
    name: f.name,
    planned_sets: Number(f.planned_sets),
    reps_min: f.is_timed ? null : Number(f.reps_min) || null,
    reps_max: f.is_timed ? null : (f.reps_max ? Number(f.reps_max) : null),
    duration_seconds: f.is_timed ? (Number(f.duration_seconds) || null) : null,
    per_side: f.per_side,
    intensity_pct: Number(f.intensity_pct),
    rest_seconds: Number(f.rest_seconds),
  };
}

function ExerciseForm({
  initial,
  onSave,
  onCancel,
  hideRest = false,
}: {
  initial?: PlanExercise;
  onSave: (payload: ReturnType<typeof toExercisePayload>) => void;
  onCancel: () => void;
  hideRest?: boolean;
}) {
  const [f, setF] = useState<ExerciseFormState>(defaultForm(initial));
  const set = (k: keyof ExerciseFormState, v: string | boolean) =>
    setF((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <input
        type="text"
        value={f.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Exercise name"
        className="rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="number"
          value={f.planned_sets}
          onChange={(e) => set("planned_sets", e.target.value)}
          min={1}
          placeholder="Sets"
          className="w-16 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-xs text-muted-foreground">sets</span>
        <label className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
          <input
            type="checkbox"
            checked={f.is_timed}
            onChange={(e) => set("is_timed", e.target.checked)}
          />
          Timed
        </label>
      </div>
      {f.is_timed ? (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={f.duration_seconds}
            onChange={(e) => set("duration_seconds", e.target.value)}
            min={1}
            placeholder="Seconds"
            className="w-24 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">seconds</span>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
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
      <div className="flex gap-4 items-center flex-wrap">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={f.per_side}
            onChange={(e) => set("per_side", e.target.checked)}
          />
          Per side
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Intensity
          <input
            type="number"
            value={f.intensity_pct}
            onChange={(e) => set("intensity_pct", e.target.value)}
            min={1}
            max={100}
            className="w-14 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          %
        </label>
        {!hideRest && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Rest
            <input
              type="number"
              value={f.rest_seconds}
              onChange={(e) => set("rest_seconds", e.target.value)}
              min={0}
              className="w-16 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            s
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(toExercisePayload(f))} disabled={!f.name.trim()}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── ExerciseRow ───────────────────────────────────────────────────────────────

function ExerciseRow({
  planId,
  exercise,
  isFirst,
  isLast,
  label,
  patchUrl,
  deleteUrl,
  reorderUrl,
  moveUrl,
  moveStandaloneUrl,
  availableSupersets,
  onUpdate,
  hideRest = false,
}: {
  planId: number;
  exercise: PlanExercise;
  isFirst: boolean;
  isLast: boolean;
  label?: string;
  patchUrl: string;
  deleteUrl: string;
  reorderUrl: string;
  moveUrl?: string;
  moveStandaloneUrl?: string;
  availableSupersets?: Superset[];
  onUpdate: (plan: Plan) => void;
  hideRest?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  async function save(payload: ReturnType<typeof toExercisePayload>) {
    const res = await apiFetch(patchUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
    setEditing(false);
  }

  async function reorder(direction: "up" | "down") {
    const res = await apiFetch(reorderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
  }

  async function remove() {
    const res = await apiFetch(deleteUrl, { method: "DELETE" });
    if (!res.ok) return;
    onUpdate(await (await apiFetch(`/plans/${planId}`)).json());
  }

  async function moveToSuperset(supersetId: number) {
    const res = await apiFetch(moveUrl!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ superset_id: supersetId }),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
    setEditing(false);
  }

  async function moveToNewSuperset() {
    const res = await apiFetch(`${moveUrl!.replace("/move", "/move-new-superset")}`, {
      method: "POST",
    });
    if (!res.ok) return;
    onUpdate(await res.json());
    setEditing(false);
  }

  async function moveToStandalone() {
    const res = await apiFetch(moveStandaloneUrl!, { method: "POST" });
    if (!res.ok) return;
    onUpdate(await res.json());
    setEditing(false);
  }

  const showMoveRow = moveUrl != null || moveStandaloneUrl != null;

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <ExerciseForm
          initial={exercise}
          onSave={save}
          onCancel={() => setEditing(false)}
          hideRest={hideRest}
        />
        {showMoveRow && (
          <div className="flex items-center gap-2 px-1 flex-wrap">
            <span className="text-xs text-muted-foreground">Move to:</span>
            {moveStandaloneUrl && (
              <Button size="sm" variant="outline" onClick={moveToStandalone}>
                Standalone
              </Button>
            )}
            {availableSupersets?.map((ss) => (
              <Button
                key={ss.id}
                size="sm"
                variant="outline"
                onClick={() => moveToSuperset(ss.id)}
              >
                {ss.group_label}
              </Button>
            ))}
            {moveUrl && (
              <Button size="sm" variant="outline" onClick={moveToNewSuperset}>
                + New
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
      {label && (
        <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">{label}</span>
      )}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-sm font-medium truncate">{exercise.name}</span>
        <span className="text-xs text-muted-foreground">
          {exercise.planned_sets} × {formatLoad(exercise)} · {exercise.intensity_pct}%
          {!hideRest && ` · ${exercise.rest_seconds}s rest`}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => reorder("up")}
          disabled={isFirst}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move up"
        >↑</button>
        <button
          onClick={() => reorder("down")}
          disabled={isLast}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move down"
        >↓</button>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
        <DeleteButton onDelete={remove} />
      </div>
    </div>
  );
}

// ── SupersetSection ───────────────────────────────────────────────────────────

function SupersetSection({
  planId,
  dayId,
  superset,
  otherSupersets,
  isFirst,
  isLast,
  onUpdate,
}: {
  planId: number;
  dayId: number;
  superset: Superset;
  otherSupersets: Superset[];
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (plan: Plan) => void;
}) {
  const [addingExercise, setAddingExercise] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const [rest, setRest] = useState(String(superset.rest_seconds));

  const base = `/plans/${planId}/days/${dayId}/supersets/${superset.id}`;

  async function saveRest() {
    const res = await apiFetch(base, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rest_seconds: Number(rest) }),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
    setEditingRest(false);
  }

  async function reorder(direction: "up" | "down") {
    const res = await apiFetch(`${base}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
  }

  async function addExercise(payload: ReturnType<typeof toExercisePayload>) {
    const res = await apiFetch(`${base}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
    setAddingExercise(false);
  }

  const exercises = sorted(superset.exercises);

  return (
    <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">
          Superset {superset.group_label}
        </span>
        <span className="text-xs text-muted-foreground flex-1">
          {editingRest ? (
            <span className="flex items-center gap-1">
              <input
                type="number"
                value={rest}
                onChange={(e) => setRest(e.target.value)}
                min={0}
                className="w-16 rounded border border-border bg-background px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              s rest
              <button onClick={saveRest} className="text-primary hover:underline ml-1">save</button>
              <button onClick={() => setEditingRest(false)} className="text-muted-foreground hover:underline">cancel</button>
            </span>
          ) : (
            <button onClick={() => setEditingRest(true)} className="hover:underline">
              {superset.rest_seconds}s rest
            </button>
          )}
        </span>
        <button
          onClick={() => reorder("up")}
          disabled={isFirst}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move superset up"
        >↑</button>
        <button
          onClick={() => reorder("down")}
          disabled={isLast}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move superset down"
        >↓</button>
        <DeleteButton onDelete={async () => {
          const res = await apiFetch(base, { method: "DELETE" });
          if (!res.ok) return;
          onUpdate(await (await apiFetch(`/plans/${planId}`)).json());
        }}>
          ✕
        </DeleteButton>
      </div>

      {exercises.length > 0 && (
        <div className="flex flex-col gap-2">
          {exercises.map((ex, idx) => (
            <ExerciseRow
              key={ex.id}
              planId={planId}
              exercise={ex}
              isFirst={idx === 0}
              isLast={idx === exercises.length - 1}
              label={`${superset.group_label}${idx + 1}`}
              patchUrl={`${base}/exercises/${ex.id}`}
              deleteUrl={`${base}/exercises/${ex.id}`}
              reorderUrl={`${base}/exercises/${ex.id}/reorder`}
              moveUrl={`${base}/exercises/${ex.id}/move`}
              moveStandaloneUrl={`${base}/exercises/${ex.id}/move-standalone`}
              availableSupersets={otherSupersets}
              onUpdate={onUpdate}
              hideRest
            />
          ))}
        </div>
      )}

      {addingExercise ? (
        <ExerciseForm
          onSave={addExercise}
          onCancel={() => setAddingExercise(false)}
          hideRest
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

// ── DaySection ────────────────────────────────────────────────────────────────

function DaySection({
  planId,
  day,
  isFirst,
  isLast,
  onUpdate,
}: {
  planId: number;
  day: PlanDay;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (plan: Plan) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [label, setLabel] = useState(day.label);
  const [addingExercise, setAddingExercise] = useState(false);

  const dayBase = `/plans/${planId}/days/${day.id}`;

  async function reorderDay(direction: "up" | "down") {
    const res = await apiFetch(`${dayBase}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (res.ok) onUpdate(await res.json());
  }

  async function saveLabel() {
    const res = await apiFetch(dayBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
    setEditingLabel(false);
  }

  async function addExercise(payload: ReturnType<typeof toExercisePayload>) {
    const res = await apiFetch(`${dayBase}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    onUpdate(await res.json());
    setAddingExercise(false);
  }

  async function addSuperset() {
    const res = await apiFetch(`${dayBase}/supersets`, { method: "POST" });
    if (!res.ok) return;
    onUpdate(await res.json());
  }

  type DayItem =
    | { kind: "exercise"; item: PlanExercise }
    | { kind: "superset"; item: Superset };

  const dayItems: DayItem[] = [
    ...day.exercises.map((ex) => ({ kind: "exercise" as const, item: ex })),
    ...day.supersets.map((ss) => ({ kind: "superset" as const, item: ss })),
  ].sort((a, b) => a.item.position - b.item.position);

  const supersets = day.supersets;

  return (
    <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
      {/* Day header */}
      <div className="flex items-center gap-2">
        {editingLabel ? (
          <>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm font-medium outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" onClick={saveLabel}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => { setLabel(day.label); setEditingLabel(false); }}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <span className="flex-1 font-semibold">{day.label}</span>
            <button onClick={() => reorderDay("up")} disabled={isFirst} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move day up">↑</button>
            <button onClick={() => reorderDay("down")} disabled={isLast} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move day down">↓</button>
            <Button size="sm" variant="outline" onClick={() => setEditingLabel(true)}>Rename</Button>
            <DeleteButton onDelete={async () => {
              const res = await apiFetch(dayBase, { method: "DELETE" });
              if (!res.ok) return;
              onUpdate(await (await apiFetch(`/plans/${planId}`)).json());
            }} />
          </>
        )}
      </div>

      {/* Unified interleaved exercises and supersets */}
      {dayItems.length > 0 && (
        <div className="flex flex-col gap-2">
          {dayItems.map((di, idx) =>
            di.kind === "exercise" ? (
              <ExerciseRow
                key={`ex-${di.item.id}`}
                planId={planId}
                exercise={di.item}
                isFirst={idx === 0}
                isLast={idx === dayItems.length - 1}
                patchUrl={`${dayBase}/exercises/${di.item.id}`}
                deleteUrl={`${dayBase}/exercises/${di.item.id}`}
                reorderUrl={`${dayBase}/exercises/${di.item.id}/reorder`}
                moveUrl={`${dayBase}/exercises/${di.item.id}/move`}
                availableSupersets={supersets}
                onUpdate={onUpdate}
              />
            ) : (
              <SupersetSection
                key={`ss-${di.item.id}`}
                planId={planId}
                dayId={day.id}
                superset={di.item}
                otherSupersets={supersets.filter((s) => s.id !== di.item.id)}
                isFirst={idx === 0}
                isLast={idx === dayItems.length - 1}
                onUpdate={onUpdate}
              />
            )
          )}
        </div>
      )}

      {/* Add actions */}
      <div className="flex gap-3">
        {addingExercise ? (
          <ExerciseForm
            onSave={addExercise}
            onCancel={() => setAddingExercise(false)}
          />
        ) : (
          <>
            <button
              onClick={() => setAddingExercise(true)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              + Add exercise
            </button>
            <button
              onClick={addSuperset}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              + Add superset
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── PlanEditor ────────────────────────────────────────────────────────────────

export function PlanEditor({ initialPlan }: { initialPlan: Plan }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(plan.name);
  const [addingDay, setAddingDay] = useState(false);
  const [dayLabel, setDayLabel] = useState("");

  async function saveName() {
    const res = await apiFetch(`/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    setPlan(await res.json());
    setEditingName(false);
  }

  async function addDay() {
    const res = await apiFetch(`/plans/${plan.id}/days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: dayLabel }),
    });
    if (!res.ok) return;
    setPlan(await res.json());
    setDayLabel("");
    setAddingDay(false);
  }

  const days = sorted(plan.days);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        {editingName ? (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xl font-bold outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={saveName}>Save</Button>
            <Button variant="outline" onClick={() => { setName(plan.name); setEditingName(false); }}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <button
              onClick={() => router.push("/plans")}
              className="text-muted-foreground hover:text-foreground mr-1"
              aria-label="Back to plans"
            >←</button>
            <h1 className="flex-1 text-2xl font-bold">{plan.name}</h1>
            <Button variant="outline" onClick={() => setEditingName(true)}>Rename</Button>
          </>
        )}
      </div>

      {/* Days */}
      {days.length > 0 && (
        <div className="flex flex-col gap-4">
          {days.map((day, idx) => (
            <DaySection
              key={day.id}
              planId={plan.id}
              day={day}
              isFirst={idx === 0}
              isLast={idx === days.length - 1}
              onUpdate={setPlan}
            />
          ))}
        </div>
      )}

      {/* Add day */}
      {addingDay ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4">
          <input
            type="text"
            value={dayLabel}
            onChange={(e) => setDayLabel(e.target.value)}
            placeholder="Day name (e.g. Legs, Push, Pull)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <Button onClick={addDay} disabled={!dayLabel.trim()}>Add day</Button>
            <Button variant="outline" onClick={() => setAddingDay(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAddingDay(true)}>+ Add day</Button>
      )}
    </div>
  );
}
