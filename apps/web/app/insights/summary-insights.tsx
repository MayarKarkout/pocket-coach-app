"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { apiFetch } from "@/lib/api";
import type { DateRange } from "@/lib/insights";

interface WorkoutPeriod {
  date: string;
  tonnage: number;
  sessions: number;
}

interface WorkoutInsights {
  by_period: WorkoutPeriod[];
}

interface FootballPeriod {
  date: string;
  load: number;
  session_type: string;
}

interface FootballInsights {
  by_period: FootballPeriod[];
}

interface ActivityPeriod {
  date: string;
  duration_minutes: number;
}

interface ActivityInsights {
  by_period: ActivityPeriod[];
}

type DayActivity = { date: string; gym: number; football: number; activity: number };

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function mergeData(
  workouts: WorkoutPeriod[],
  football: FootballPeriod[],
  activity: ActivityPeriod[],
): DayActivity[] {
  const map = new Map<string, DayActivity>();

  for (const w of workouts) {
    const entry = map.get(w.date) ?? { date: w.date, gym: 0, football: 0, activity: 0 };
    entry.gym = w.sessions;
    map.set(w.date, entry);
  }

  for (const f of football) {
    const entry = map.get(f.date) ?? { date: f.date, gym: 0, football: 0, activity: 0 };
    entry.football += 1;
    map.set(f.date, entry);
  }

  for (const a of activity) {
    const entry = map.get(a.date) ?? { date: a.date, gym: 0, football: 0, activity: 0 };
    entry.activity += 1;
    map.set(a.date, entry);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function SummaryInsights({ range }: { range: DateRange }) {
  const [data, setData] = useState<DayActivity[] | null>(null);

  useEffect(() => {
    const params = `from_date=${range.from}&to_date=${range.to}`;
    Promise.all([
      apiFetch(`/workouts/insights?${params}`).then((r) => r.json() as Promise<WorkoutInsights>),
      apiFetch(`/football/insights?${params}`).then((r) => r.json() as Promise<FootballInsights>),
      apiFetch(`/activity/insights?${params}`).then((r) => r.json() as Promise<ActivityInsights>),
    ]).then(([workouts, football, activity]) => {
      setData(mergeData(workouts.by_period, football.by_period, activity.by_period));
    });
  }, [range.from, range.to]);

  if (data === null) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">All Activity</h2>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
          <Bar dataKey="gym" stackId="a" fill="hsl(var(--primary))" />
          <Bar dataKey="football" stackId="a" fill="#3b82f6" />
          <Bar dataKey="activity" stackId="a" fill="#22c55e" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-center">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
          Gym
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
          Football
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
          Activity
        </span>
      </div>
    </section>
  );
}
