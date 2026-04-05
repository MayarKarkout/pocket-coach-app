"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { EventItem, FootballSession, ActivitySession, WellbeingLog, MealLog } from "@/lib/events";

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
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

export function EventsFeed({ initialItems }: { initialItems: EventItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);

  async function deleteItem(item: EventItem) {
    const path =
      item.kind === "football"
        ? `/football/${item.data.id}`
        : item.kind === "activity"
          ? `/activity/${item.data.id}`
          : item.kind === "wellbeing"
            ? `/wellbeing/${item.data.id}`
            : `/meals/${item.data.id}`;
    const res = await apiFetch(path, { method: "DELETE" });
    if (!res.ok) return;
    setItems((prev) =>
      prev.filter((i) => !(i.kind === item.kind && i.data.id === item.data.id))
    );
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">No events logged yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
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
  );
}
