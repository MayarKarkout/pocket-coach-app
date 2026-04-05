"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { apiFetch } from "@/lib/api";
import type { DateRange } from "@/lib/insights";

interface PeriodLoad {
  date: string;
  load: number;
  session_type: string;
}

interface FootballInsights {
  sessions: number;
  training: number;
  matches: number;
  total_load: number;
  by_period: PeriodLoad[];
}

export function FootballInsights({ range }: { range: DateRange }) {
  const [data, setData] = useState<FootballInsights | null>(null);

  useEffect(() => {
    apiFetch(`/football/insights?from_date=${range.from}&to_date=${range.to}`)
      .then((r) => r.json() as Promise<FootballInsights>)
      .then(setData);
  }, [range.from, range.to]);

  if (!data) return null;

  if (data.sessions === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-2">Football</h2>
        <p className="text-muted-foreground text-sm">No football sessions in this period.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Football</h2>
      <div className="flex gap-6 mb-3 text-sm">
        <div>
          <span className="text-muted-foreground">Sessions</span>
          <p className="text-xl font-bold">{data.sessions}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Training</span>
          <p className="text-xl font-bold">{data.training}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Matches</span>
          <p className="text-xl font-bold">{data.matches}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Load: {data.total_load.toFixed(0)}
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data.by_period} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="load">
            {data.by_period.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.session_type === "match"
                    ? "hsl(var(--destructive))"
                    : "hsl(var(--primary))"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
