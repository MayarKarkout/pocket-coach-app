"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { apiFetch } from "@/lib/api";
import type { MealLog } from "@/lib/events";

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function today() {
  return toISO(new Date());
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function formatNavDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function MealCard({ meal, onDelete }: { meal: MealLog; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Link
      href={`/log/meals/${meal.id}`}
      className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 hover:bg-accent"
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-xs font-medium uppercase tracking-wide text-purple-500">Meal</span>
        <span className="font-medium capitalize">{meal.meal_type}</span>
        <span className="text-xs text-muted-foreground">
          {meal.occurred_at ? formatTime(meal.occurred_at) : "—"}
          {meal.calories != null && ` · ${meal.calories} kcal${meal.calories_estimated ? " ~" : ""}`}
        </span>
        {meal.notes && <span className="text-xs text-muted-foreground truncate">{meal.notes}</span>}
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

function FoodPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const selectedDate = searchParams.get("date") ?? today();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);

  function setSelectedDate(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", date);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/meals?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data: MealLog[]) => {
        if (cancelled) return;
        data.sort((a, b) => (b.occurred_at ?? b.created_at).localeCompare(a.occurred_at ?? a.created_at));
        setMeals(data);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  function deleteMeal(id: number) {
    apiFetch(`/meals/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) return;
      setMeals((prev) => prev.filter((m) => m.id !== id));
    });
  }

  const totalKcal = meals.reduce((acc, m) => acc + (m.calories ?? 0), 0);
  const anyEstimated = meals.some((m) => m.calories_estimated);
  const isToday = selectedDate === today();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Food</h1>
        <Link
          href="/food/library"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Meal Library →
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <Link
          href={`/food/new?date=${selectedDate}`}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          + Add Meal
        </Link>
      </div>

      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
        >
          ←
        </Button>
        <button
          onClick={() => dateInputRef.current?.showPicker()}
          className="text-sm font-medium hover:underline cursor-pointer"
        >
          {formatNavDate(selectedDate)}
        </button>
        <input
          ref={dateInputRef}
          type="date"
          className="sr-only"
          value={selectedDate}
          max={today()}
          onChange={(e) => {
            if (e.target.value) setSelectedDate(e.target.value);
          }}
        />
        {isToday ? (
          <div className="w-9" />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          >
            →
          </Button>
        )}
      </div>

      {loading ? (
        <PageSpinner />
      ) : meals.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">Nothing logged yet.</p>
      ) : (
        <>
          <div className="rounded-xl border border-border p-4 mb-4 text-center">
            <p className="text-2xl font-bold">
              {totalKcal.toLocaleString()}
              {anyEstimated && " ~"} kcal
            </p>
            <p className="text-xs text-muted-foreground">
              {meals.length} meal{meals.length === 1 ? "" : "s"} today
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onDelete={() => deleteMeal(meal.id)} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export default function FoodPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <FoodPageInner />
    </Suspense>
  );
}
