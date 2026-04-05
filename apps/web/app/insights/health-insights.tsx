"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "@/lib/api";
import type { DateRange } from "@/lib/insights";

interface HealthInsightDay {
  date: string;
  steps: number | null;
  sleep_duration_minutes: number | null;
  resting_hr: number | null;
  hrv: number | null;
}

interface HealthInsightsData {
  by_day: HealthInsightDay[];
}

function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

function fmtSleep(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: HealthInsightDay }[];
  label?: string;
}

function StepsTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border bg-background px-3 py-2 text-sm shadow">
      <p className="font-medium">{label}</p>
      <p>{payload[0].value.toLocaleString()} steps</p>
    </div>
  );
}

function SleepTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border bg-background px-3 py-2 text-sm shadow">
      <p className="font-medium">{label}</p>
      <p>{fmtSleep(payload[0].value)}</p>
    </div>
  );
}

function HrTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border bg-background px-3 py-2 text-sm shadow">
      <p className="font-medium">{label}</p>
      <p>{payload[0].value} bpm</p>
    </div>
  );
}

export function HealthInsights({ range }: { range: DateRange }) {
  const [data, setData] = useState<HealthInsightsData | null>(null);

  useEffect(() => {
    apiFetch(
      `/gadgetbridge/health/insights?from_date=${range.from}&to_date=${range.to}`
    )
      .then((r) => r.json() as Promise<HealthInsightsData>)
      .then(setData);
  }, [range.from, range.to]);

  const hasData = data && data.by_day.length > 0;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Health</h2>

      {data && !hasData && (
        <p className="text-muted-foreground text-sm">No health data in this period.</p>
      )}

      {hasData && (
        <div className="flex flex-col gap-6">
          {/* Steps */}
          {data.by_day.some((d) => d.steps !== null) && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Steps</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data.by_day.filter((d) => d.steps !== null)}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis hide />
                  <Tooltip content={<StepsTooltip />} />
                  <Bar dataKey="steps" fill="hsl(var(--primary))" radius={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sleep */}
          {data.by_day.some((d) => d.sleep_duration_minutes !== null) && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Sleep duration</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={data.by_day.filter((d) => d.sleep_duration_minutes !== null)}
                >
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis hide />
                  <Tooltip content={<SleepTooltip />} />
                  <Bar
                    dataKey="sleep_duration_minutes"
                    fill="hsl(var(--primary))"
                    radius={2}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Resting HR */}
          {data.by_day.some((d) => d.resting_hr !== null) && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Resting HR</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart
                  data={data.by_day.filter((d) => d.resting_hr !== null)}
                >
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis hide />
                  <Tooltip content={<HrTooltip />} />
                  <Line
                    dataKey="resting_hr"
                    stroke="hsl(var(--primary))"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
