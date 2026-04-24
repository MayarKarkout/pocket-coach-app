"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { WorkoutSummary } from "@/lib/workouts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string, end: string): string {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  d.setDate(d.getDate() + diff);
  return d;
}

function thisWeekMonday(): string {
  return toISO(getMonday(new Date()));
}

function addWeeks(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n * 7);
  return toISO(d);
}

function formatWeekRange(mondayISO: string): string {
  const mon = new Date(mondayISO + "T00:00:00");
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const monWkd = mon.toLocaleDateString(undefined, { weekday: "short" });
  const sunWkd = sun.toLocaleDateString(undefined, { weekday: "short" });
  const monDay = mon.toLocaleDateString(undefined, { day: "numeric" });
  const sunDay = sun.toLocaleDateString(undefined, { day: "numeric" });
  if (mon.getMonth() === sun.getMonth()) {
    const month = mon.toLocaleDateString(undefined, { month: "short" });
    return `${monWkd} ${monDay} – ${sunWkd} ${sunDay} ${month}`;
  }
  const monMonth = mon.toLocaleDateString(undefined, { month: "short" });
  const sunMonth = sun.toLocaleDateString(undefined, { month: "short" });
  return `${monWkd} ${monDay} ${monMonth} – ${sunWkd} ${sunDay} ${sunMonth}`;
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className={confirming ? "bg-red-500 text-white border-red-500 hover:bg-red-600 hover:text-white" : ""}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        confirming ? onDelete() : setConfirming(true);
      }}
      onBlur={() => setConfirming(false)}
    >
      ✕
    </Button>
  );
}

export function WorkoutsList({ initialWorkouts }: { initialWorkouts: WorkoutSummary[] }) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [weekStart, setWeekStart] = useState<string>(thisWeekMonday);
  const weekInputRef = useRef<HTMLInputElement>(null);

  async function deleteWorkout(id: number) {
    const res = await apiFetch(`/workouts/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  const currentWeek = thisWeekMonday();
  const isCurrentWeek = weekStart === currentWeek;

  const weekEnd = addWeeks(weekStart, 1); // exclusive
  const visible = workouts.filter(w => w.date >= weekStart && w.date < weekEnd);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekStart(addWeeks(weekStart, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => weekInputRef.current?.showPicker()}
          className="text-sm font-medium hover:underline cursor-pointer"
        >
          {formatWeekRange(weekStart)}
        </button>
        <input
          ref={weekInputRef}
          type="date"
          className="sr-only"
          value={weekStart}
          onChange={(e) => { if (e.target.value) setWeekStart(toISO(getMonday(new Date(e.target.value + "T00:00:00")))); }}
        />
        {!isCurrentWeek ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">No workouts this week.</p>
      ) : (
        visible.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 hover:bg-accent cursor-pointer"
            onClick={() => router.push(`/workouts/${w.id}`)}
          >
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="font-medium">{w.plan_day_label}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(w.date)}
                {w.started_at && ` · ${formatTime(w.started_at)}`}
                {w.started_at && w.finished_at && ` · ${formatDuration(w.started_at, w.finished_at)}`}
              </span>
              {w.notes && (
                <span className="text-xs text-muted-foreground truncate">{w.notes}</span>
              )}
            </div>
            <span className="text-sm text-muted-foreground shrink-0">{w.set_count} sets</span>
            <DeleteButton onDelete={() => deleteWorkout(w.id)} />
          </div>
        ))
      )}
    </div>
  );
}
