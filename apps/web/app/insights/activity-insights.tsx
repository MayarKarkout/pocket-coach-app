"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "@/lib/api";
import type { DateRange } from "@/lib/insights";

interface PeriodActivity {
  date: string;
  minutes: number;
  activity_type: string;
}

interface ActivityInsights {
  sessions: number;
  total_minutes: number;
  by_period: PeriodActivity[];
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: PeriodActivity }[];
}

function ActivityTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded border bg-background px-3 py-2 text-sm shadow">
      <p className="font-medium">{d.activity_type}</p>
      <p>{formatMinutes(d.minutes)}</p>
    </div>
  );
}

export function ActivityInsights({ range }: { range: DateRange }) {
  const [data, setData] = useState<ActivityInsights | null>(null);

  useEffect(() => {
    apiFetch(`/activity/insights?from_date=${range.from}&to_date=${range.to}`)
      .then((r) => r.json() as Promise<ActivityInsights>)
      .then(setData);
  }, [range.from, range.to]);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Activity</h2>

      {data && data.by_period.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No activities in this period.
        </p>
      )}

      {data && data.by_period.length > 0 && (
        <>
          <div className="flex gap-6 mb-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sessions</p>
              <p className="text-xl font-bold">{data.sessions}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total time</p>
              <p className="text-xl font-bold">
                {formatMinutes(data.total_minutes)}
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.by_period}>
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11 }}
              />
              <YAxis hide />
              <Tooltip content={<ActivityTooltip />} />
              <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={2} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </section>
  );
}
