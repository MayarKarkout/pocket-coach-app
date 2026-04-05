"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { apiFetch } from "@/lib/api";
import type { DateRange } from "@/lib/insights";

interface PeriodTonnage {
  date: string;
  tonnage: number;
  sessions: number;
}

interface GymInsightsData {
  sessions: number;
  total_tonnage: number;
  by_period: PeriodTonnage[];
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function GymInsights({ range }: { range: DateRange }) {
  const [data, setData] = useState<GymInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/workouts/insights?from_date=${range.from}&to_date=${range.to}`)
      .then((r) => r.json() as Promise<GymInsightsData>)
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [range.from, range.to]);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Gym</h2>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : data && data.sessions > 0 ? (
        <>
          <div className="flex gap-8 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Sessions</p>
              <p className="text-2xl font-bold">{data.sessions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tonnage (kg)</p>
              <p className="text-2xl font-bold">{Math.round(data.total_tonnage).toLocaleString()}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.by_period}>
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value) => [typeof value === "number" ? Math.round(value).toLocaleString() + " kg" : value, "Tonnage"]}
                labelFormatter={(label) => typeof label === "string" ? formatDate(label) : label}
              />
              <Bar dataKey="tonnage" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">No gym sessions in this period.</p>
      )}
    </section>
  );
}
