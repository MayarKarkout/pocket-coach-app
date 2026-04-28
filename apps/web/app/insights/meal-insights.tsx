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
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
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
  const hasMacros = data.by_period.some(
    (d) => d.total_protein_g !== null || d.total_carbs_g !== null || d.total_fat_g !== null
  );

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

      {hasCalories && (
        <>
          <p className="text-xs text-muted-foreground mb-1">Calories per day</p>
          <ResponsiveContainer width="100%" height={120}>
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
                      <p>{d.total_calories !== null ? `${d.total_calories} kcal` : "No calories"}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total_calories" fill="hsl(var(--primary))" radius={3} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {hasMacros && (
        <>
          <p className="text-xs text-muted-foreground mt-4 mb-1">Macros per day (g)</p>
          <div className="flex gap-4 mb-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-blue-500" />Protein</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-amber-400" />Carbs</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-rose-400" />Fat</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
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
                      {d.total_protein_g !== null && <p>Protein: {d.total_protein_g}g</p>}
                      {d.total_carbs_g !== null && <p>Carbs: {d.total_carbs_g}g</p>}
                      {d.total_fat_g !== null && <p>Fat: {d.total_fat_g}g</p>}
                    </div>
                  );
                }}
              />
              <Bar dataKey="total_protein_g" name="Protein" stackId="macros" fill="hsl(217 91% 60%)" />
              <Bar dataKey="total_carbs_g" name="Carbs" stackId="macros" fill="hsl(43 96% 56%)" />
              <Bar dataKey="total_fat_g" name="Fat" stackId="macros" fill="hsl(351 83% 67%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
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
