"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface DraftSet {
  reps: number | null;
  duration_seconds: number | null;
  weight_kg: number | null;
}

interface DraftExercise {
  name: string;
  sets: DraftSet[];
}

interface DraftBase {
  date: string;
  time: string | null;
  notes: string | null;
}

interface DraftMeal extends DraftBase {
  entry_type: "meal";
  meal_type: string;
  calories: number | null;
}

interface DraftActivity extends DraftBase {
  entry_type: "activity";
  activity_type: string;
  duration_minutes: number;
}

interface DraftFootball extends DraftBase {
  entry_type: "football";
  session_type: "training" | "match";
  duration_minutes: number;
  rpe: number;
}

interface DraftWellbeing extends DraftBase {
  entry_type: "wellbeing";
  log_type: "pain" | "fatigue" | "soreness";
  severity: number;
  body_part: string | null;
}

interface DraftWorkout extends DraftBase {
  entry_type: "workout";
  label: string;
  exercises: DraftExercise[];
}

type DraftEntry = DraftMeal | DraftActivity | DraftFootball | DraftWellbeing | DraftWorkout;

const TYPE_LABELS: Record<DraftEntry["entry_type"], string> = {
  meal: "Meal",
  activity: "Activity",
  football: "Football",
  wellbeing: "Wellbeing",
  workout: "Gym Workout",
};

const inputCls = "rounded-lg border border-border bg-background px-2 py-1.5 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function QuickLogForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<DraftEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    setBusy(true);
    setError(null);
    const res = await apiFetch("/quick-log/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setBusy(false);
    if (!res.ok) {
      const detail = (await res.json().catch(() => null))?.detail;
      setError(detail ?? "Something went wrong. Try again.");
      return;
    }
    const data = await res.json();
    if (data.entries.length === 0) {
      setError("Nothing loggable found in that text. Try adding more detail.");
      return;
    }
    setEntries(data.entries);
  }

  async function handleSave() {
    if (!entries) return;
    setBusy(true);
    setError(null);
    const res = await apiFetch("/quick-log/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) {
      setBusy(false);
      const detail = (await res.json().catch(() => null))?.detail;
      setError(typeof detail === "string" ? detail : "Saving failed. Try again.");
      return;
    }
    router.push("/today");
  }

  function update(idx: number, patch: Partial<DraftEntry>) {
    setEntries((prev) =>
      prev!.map((e, i) => (i === idx ? ({ ...e, ...patch } as DraftEntry) : e))
    );
  }

  function remove(idx: number) {
    setEntries((prev) => prev!.filter((_, i) => i !== idx));
  }

  if (entries === null) {
    return (
      <div className="flex flex-col gap-4">
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. For breakfast I had two slices of bread with salmon. Walked 20 minutes to work. Gym at 6pm: squats 3x5 at 100kg, bench 4x8 at 80kg. Left knee felt sore after."
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          onClick={handleParse}
          disabled={busy || text.trim().length === 0}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Reading…" : "Create entries"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Review the entries below — edit anything that&apos;s off, remove what you don&apos;t want, then save.
      </p>

      {entries.map((entry, idx) => (
        <div key={idx} className="rounded-xl border border-border p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {TYPE_LABELS[entry.entry_type]}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => remove(idx)}>
              ✕
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Date">
              <input
                type="date"
                value={entry.date}
                onChange={(e) => update(idx, { date: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                value={entry.time ?? ""}
                onChange={(e) => update(idx, { time: e.target.value || null })}
                className={inputCls}
              />
            </Field>
          </div>

          {entry.entry_type === "meal" && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Category">
                <input
                  type="text"
                  value={entry.meal_type}
                  onChange={(e) => update(idx, { meal_type: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Calories (blank = AI estimates)">
                <input
                  type="number"
                  min={0}
                  value={entry.calories ?? ""}
                  onChange={(e) =>
                    update(idx, { calories: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {entry.entry_type === "activity" && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Activity">
                <input
                  type="text"
                  value={entry.activity_type}
                  onChange={(e) => update(idx, { activity_type: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Minutes">
                <input
                  type="number"
                  min={1}
                  value={entry.duration_minutes}
                  onChange={(e) => update(idx, { duration_minutes: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {entry.entry_type === "football" && (
            <div className="grid grid-cols-3 gap-2">
              <Field label="Type">
                <select
                  value={entry.session_type}
                  onChange={(e) =>
                    update(idx, { session_type: e.target.value as "training" | "match" })
                  }
                  className={inputCls}
                >
                  <option value="training">Training</option>
                  <option value="match">Match</option>
                </select>
              </Field>
              <Field label="Minutes">
                <input
                  type="number"
                  min={1}
                  value={entry.duration_minutes}
                  onChange={(e) => update(idx, { duration_minutes: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="RPE (1–10)">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={entry.rpe}
                  onChange={(e) => update(idx, { rpe: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {entry.entry_type === "wellbeing" && (
            <div className="grid grid-cols-3 gap-2">
              <Field label="Type">
                <select
                  value={entry.log_type}
                  onChange={(e) =>
                    update(idx, { log_type: e.target.value as DraftWellbeing["log_type"] })
                  }
                  className={inputCls}
                >
                  <option value="pain">Pain</option>
                  <option value="fatigue">Fatigue</option>
                  <option value="soreness">Soreness</option>
                </select>
              </Field>
              <Field label="Severity (1–10)">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={entry.severity}
                  onChange={(e) => update(idx, { severity: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="Body part">
                <input
                  type="text"
                  value={entry.body_part ?? ""}
                  onChange={(e) => update(idx, { body_part: e.target.value || null })}
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {entry.entry_type === "workout" && (
            <div className="flex flex-col gap-3">
              <Field label="Session name">
                <input
                  type="text"
                  value={entry.label}
                  onChange={(e) => update(idx, { label: e.target.value })}
                  className={inputCls}
                />
              </Field>
              {entry.exercises.map((ex, exIdx) => (
                <div key={exIdx} className="rounded-lg border border-border p-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ex.name}
                      onChange={(e) => {
                        const exercises = entry.exercises.map((x, i) =>
                          i === exIdx ? { ...x, name: e.target.value } : x
                        );
                        update(idx, { exercises });
                      }}
                      className={`${inputCls} flex-1 font-medium`}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        update(idx, { exercises: entry.exercises.filter((_, i) => i !== exIdx) })
                      }
                    >
                      ✕
                    </Button>
                  </div>
                  {ex.sets.map((s, setIdx) => (
                    <div key={setIdx} className="flex items-center gap-2 pl-1">
                      <span className="text-xs text-muted-foreground w-10 shrink-0">
                        Set {setIdx + 1}
                      </span>
                      <input
                        type="number"
                        min={0}
                        placeholder="reps"
                        value={s.reps ?? ""}
                        onChange={(e) => {
                          const sets = ex.sets.map((row, i) =>
                            i === setIdx
                              ? { ...row, reps: e.target.value === "" ? null : Number(e.target.value) }
                              : row
                          );
                          const exercises = entry.exercises.map((x, i) =>
                            i === exIdx ? { ...x, sets } : x
                          );
                          update(idx, { exercises });
                        }}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-xs text-muted-foreground">reps</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        placeholder="kg"
                        value={s.weight_kg ?? ""}
                        onChange={(e) => {
                          const sets = ex.sets.map((row, i) =>
                            i === setIdx
                              ? { ...row, weight_kg: e.target.value === "" ? null : Number(e.target.value) }
                              : row
                          );
                          const exercises = entry.exercises.map((x, i) =>
                            i === exIdx ? { ...x, sets } : x
                          );
                          update(idx, { exercises });
                        }}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-xs text-muted-foreground">kg</span>
                      <button
                        type="button"
                        className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const sets = ex.sets.filter((_, i) => i !== setIdx);
                          const exercises = entry.exercises.map((x, i) =>
                            i === exIdx ? { ...x, sets } : x
                          );
                          update(idx, { exercises });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground self-start"
                    onClick={() => {
                      const last = ex.sets[ex.sets.length - 1];
                      const sets = [
                        ...ex.sets,
                        last ? { ...last } : { reps: null, duration_seconds: null, weight_kg: null },
                      ];
                      const exercises = entry.exercises.map((x, i) =>
                        i === exIdx ? { ...x, sets } : x
                      );
                      update(idx, { exercises });
                    }}
                  >
                    + Add set
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground self-start"
                onClick={() =>
                  update(idx, {
                    exercises: [
                      ...entry.exercises,
                      { name: "", sets: [{ reps: null, duration_seconds: null, weight_kg: null }] },
                    ],
                  })
                }
              >
                + Add exercise
              </button>
            </div>
          )}

          <Field label="Notes">
            <textarea
              rows={2}
              value={entry.notes ?? ""}
              onChange={(e) => update(idx, { notes: e.target.value || null })}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setEntries(null);
            setError(null);
          }}
          disabled={busy}
          className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Back to text
        </button>
        <button
          onClick={handleSave}
          disabled={busy || entries.length === 0}
          className="flex-1 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Saving…" : `Save ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
        </button>
      </div>
    </div>
  );
}
