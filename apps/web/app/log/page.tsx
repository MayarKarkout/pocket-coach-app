"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { FootballSession, ActivitySession, WellbeingLog, MealLog, EventItem } from "@/lib/events";

// --- Date helpers ---

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

// --- Card helpers ---

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
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
  );
}

function FootballCard({
  item,
  onDelete,
  onClick,
}: {
  item: FootballSession;
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 hover:bg-accent cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-blue-500">Football</span>
          <span className="text-xs text-muted-foreground capitalize">{item.session_type}</span>
        </div>
        <span className="font-medium">
          {formatDate(item.date)}{item.occurred_at && ` · ${formatTime(item.occurred_at)}`}
        </span>
        <span className="text-xs text-muted-foreground">
          {item.duration_minutes}min · RPE {item.rpe}
        </span>
        {item.notes && (
          <span className="text-xs text-muted-foreground truncate">{item.notes}</span>
        )}
      </div>
      <DeleteButton onDelete={onDelete} />
    </div>
  );
}

function ActivityCard({
  item,
  onDelete,
  onClick,
}: {
  item: ActivitySession;
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 hover:bg-accent cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-xs font-medium uppercase tracking-wide text-green-500">Activity</span>
        <span className="font-medium">{item.activity_type}</span>
        <span className="text-xs text-muted-foreground">
          {formatDate(item.date)}{item.occurred_at && ` · ${formatTime(item.occurred_at)}`} · {item.duration_minutes}min
        </span>
        {item.notes && (
          <span className="text-xs text-muted-foreground truncate">{item.notes}</span>
        )}
      </div>
      <DeleteButton onDelete={onDelete} />
    </div>
  );
}

function WellbeingCard({
  item,
  onDelete,
  onClick,
}: {
  item: WellbeingLog;
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 hover:bg-accent cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-xs font-medium uppercase tracking-wide text-orange-500">Wellbeing</span>
        <span className="font-medium capitalize">{item.log_type}</span>
        <span className="text-xs text-muted-foreground">
          {formatDate(item.date)}{item.occurred_at && ` · ${formatTime(item.occurred_at)}`} · Severity {item.severity}/10
          {item.body_part && ` · ${item.body_part}`}
        </span>
        {item.notes && (
          <span className="text-xs text-muted-foreground truncate">{item.notes}</span>
        )}
      </div>
      <DeleteButton onDelete={onDelete} />
    </div>
  );
}

function MealCard({
  item,
  onDelete,
  onClick,
}: {
  item: MealLog;
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 hover:bg-accent cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-xs font-medium uppercase tracking-wide text-purple-500">Meal</span>
        <span className="font-medium capitalize">{item.meal_type}</span>
        <span className="text-xs text-muted-foreground">
          {formatDate(item.date)}{item.occurred_at && ` · ${formatTime(item.occurred_at)}`}
          {item.calories != null && ` · ${item.calories} kcal`}
        </span>
        {item.notes && (
          <span className="text-xs text-muted-foreground truncate">{item.notes}</span>
        )}
      </div>
      <DeleteButton onDelete={onDelete} />
    </div>
  );
}

// --- Types ---

type TypeFilter = "all" | "football" | "activity" | "wellbeing" | "meal";

const TYPE_FILTERS: { label: string; value: TypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Football", value: "football" },
  { label: "Activity", value: "activity" },
  { label: "Wellbeing", value: "wellbeing" },
  { label: "Meal", value: "meal" },
];

// --- Inner page (needs Suspense for useSearchParams) ---

function LogPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const selectedDate = searchParams.get("date") ?? today();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [allItems, setAllItems] = useState<EventItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  function setSelectedDate(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", date);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    setLoadingItems(true);
    async function fetchForDate() {
      const [footballRes, activityRes, wellbeingRes, mealsRes] = await Promise.all([
        apiFetch(`/football?date=${selectedDate}`),
        apiFetch(`/activity?date=${selectedDate}`),
        apiFetch(`/wellbeing?date=${selectedDate}`),
        apiFetch(`/meals?date=${selectedDate}`),
      ]);

      const [football, activity, wellbeing, meals]: [
        FootballSession[],
        ActivitySession[],
        WellbeingLog[],
        MealLog[],
      ] = await Promise.all([
        footballRes.json(),
        activityRes.json(),
        wellbeingRes.json(),
        mealsRes.json(),
      ]);

      const items: EventItem[] = [
        ...football.map((d): EventItem => ({ kind: "football", data: d })),
        ...activity.map((d): EventItem => ({ kind: "activity", data: d })),
        ...wellbeing.map((d): EventItem => ({ kind: "wellbeing", data: d })),
        ...meals.map((d): EventItem => ({ kind: "meal", data: d })),
      ].sort((a, b) => b.data.created_at.localeCompare(a.data.created_at));

      setAllItems(items);
      setLoadingItems(false);
    }

    fetchForDate();
  }, [selectedDate]);

  function deleteItem(item: EventItem) {
    const path =
      item.kind === "football"
        ? `/football/${item.data.id}`
        : item.kind === "activity"
          ? `/activity/${item.data.id}`
          : item.kind === "wellbeing"
            ? `/wellbeing/${item.data.id}`
            : `/meals/${item.data.id}`;
    apiFetch(path, { method: "DELETE" }).then((res) => {
      if (!res.ok) return;
      setAllItems((prev) =>
        prev.filter((i) => !(i.kind === item.kind && i.data.id === item.data.id))
      );
    });
  }

  const filteredItems = typeFilter === "all"
    ? allItems
    : allItems.filter((item) => item.kind === typeFilter);

  const isToday = selectedDate === today();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Log</h1>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href="/log/football/new"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          + Football
        </Link>
        <Link
          href="/log/activity/new"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          + Activity
        </Link>
        <Link
          href="/log/wellbeing/new"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          + Wellbeing
        </Link>
        <Link
          href={`/food/new?date=${selectedDate}`}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          + Meal
        </Link>
      </div>

      {/* Date nav row */}
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
          onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
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

      {/* Type filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TYPE_FILTERS.map(({ label, value }) => (
          <Button
            key={value}
            size="sm"
            variant={typeFilter === value ? "default" : "outline"}
            onClick={() => setTypeFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Feed */}
      {loadingItems ? (
        <PageSpinner />
      ) : filteredItems.length === 0 ? (
        <p className="text-muted-foreground text-sm">No events logged yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredItems.map((item) => {
            if (item.kind === "football") {
              return (
                <FootballCard
                  key={`football-${item.data.id}`}
                  item={item.data}
                  onDelete={() => deleteItem(item)}
                  onClick={() => router.push(`/log/football/${item.data.id}`)}
                />
              );
            }
            if (item.kind === "activity") {
              return (
                <ActivityCard
                  key={`activity-${item.data.id}`}
                  item={item.data}
                  onDelete={() => deleteItem(item)}
                  onClick={() => router.push(`/log/activity/${item.data.id}`)}
                />
              );
            }
            if (item.kind === "wellbeing") {
              return (
                <WellbeingCard
                  key={`wellbeing-${item.data.id}`}
                  item={item.data}
                  onDelete={() => deleteItem(item)}
                  onClick={() => router.push(`/log/wellbeing/${item.data.id}`)}
                />
              );
            }
            return (
              <MealCard
                key={`meal-${item.data.id}`}
                item={item.data}
                onDelete={() => deleteItem(item)}
                onClick={() => router.push(`/log/meals/${item.data.id}`)}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LogPageInner />
    </Suspense>
  );
}
