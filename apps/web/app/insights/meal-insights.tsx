"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "@/lib/api";
import type { DateRange } from "@/lib/insights";

interface PeriodMeals {
  date: string;
  meal_count: number;
  total_calories: number | null;
}

interface MealInsights {
  total_meals: number;
  days_logged: number;
  avg_daily_calories: number | null;
  by_period: PeriodMeals[];
}

export function MealInsights({ range }: { range: DateRange }) {
  const [data, setData] = useState<MealInsights | null>(null);

  useEffect(() => {
    apiFetch(`/meals/insights?from_date=${range.from}&to_date=${range.to}`)
      .then((r) => r.json() as Promise<MealInsights>)
      .then(setData);
  }, [range.from, range.to]);

  if (!data) return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Meals</h2>
      <p className="text-muted-foreground text-sm">Loading…</p>
    </section>
  );

  if (data.total_meals === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-3">Meals</h2>
        <p className="text-sm text-muted-foreground">
          No meals logged in this period.
        </p>
      </section>
    );
  }

  const hasCalories = data.by_period.some((d) => d.total_calories !== null);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Meals</h2>
      <div className="flex gap-6 mb-4">
        <Stat label="Meals logged" value={data.total_meals} />
        <Stat label="Days logged" value={data.days_logged} />
        {data.avg_daily_calories !== null && (
          <Stat
            label="Avg daily kcal"
            value={Math.round(data.avg_daily_calories)}
          />
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={data.by_period}
          margin={{ top: 0, right: 0, left: -24, bottom: 0 }}
        >
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as PeriodMeals;
              return (
                <div className="rounded-lg bg-popover border border-border px-3 py-2 text-xs shadow">
                  <p className="font-medium mb-1">{d.date}</p>
                  <p>Meals: {d.meal_count}</p>
                  {hasCalories && (
                    <p>
                      {d.total_calories !== null
                        ? `${d.total_calories} kcal`
                        : "No calories logged"}
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="meal_count" fill="hsl(var(--primary))" radius={3} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
