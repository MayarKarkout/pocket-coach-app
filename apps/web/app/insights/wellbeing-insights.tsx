"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "@/lib/api";
import type { DateRange } from "@/lib/insights";

interface TypeSummary {
  log_type: string;
  count: number;
  avg_severity: number;
}

interface PeriodWellbeing {
  date: string;
  log_type: string;
  severity: number;
}

interface WellbeingInsightsData {
  total: number;
  avg_severity: number | null;
  by_type: TypeSummary[];
  by_period: PeriodWellbeing[];
}

const TYPE_COLORS: Record<string, string> = {
  pain: "hsl(var(--destructive))",
  fatigue: "#f97316",
  soreness: "hsl(var(--primary))",
};

const LOG_TYPES = ["pain", "fatigue", "soreness"] as const;

export function WellbeingInsights({ range }: { range: DateRange }) {
  const [data, setData] = useState<WellbeingInsightsData | null>(null);

  useEffect(() => {
    apiFetch(
      `/wellbeing/insights?from_date=${range.from}&to_date=${range.to}`
    ).then((r) => r.json() as Promise<WellbeingInsightsData>).then(setData);
  }, [range.from, range.to]);

  if (!data) return null;

  if (data.total === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-3">Wellbeing</h2>
        <p className="text-sm text-muted-foreground">
          No wellbeing logs in this period.
        </p>
      </section>
    );
  }

  const typeMap = Object.fromEntries(
    data.by_type.map((t) => [t.log_type, t])
  );

  type PivotedRow = { date: string; pain?: number; fatigue?: number; soreness?: number };
  type PivotKey = "pain" | "fatigue" | "soreness";
  const pivoted = data.by_period.reduce<PivotedRow[]>((acc, entry) => {
    let row = acc.find(r => r.date === entry.date);
    if (!row) { row = { date: entry.date }; acc.push(row); }
    row[entry.log_type as PivotKey] = entry.severity;
    return acc;
  }, []);
  pivoted.sort((a, b) => a.date.localeCompare(b.date));

  function formatDate(d: string): string {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Wellbeing</h2>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-4">
        <span className="text-muted-foreground">
          {data.total} log{data.total !== 1 ? "s" : ""}
        </span>
        {data.avg_severity !== null && (
          <span className="text-muted-foreground">
            Avg {data.avg_severity.toFixed(1)}/10
          </span>
        )}
        {LOG_TYPES.map((lt) =>
          typeMap[lt] ? (
            <span key={lt} className="text-muted-foreground">
              {lt}: {typeMap[lt].count}
            </span>
          ) : null
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={pivoted} margin={{ top: 14, right: 8, bottom: 0, left: -16 }}>
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} tickLine={false} />
          {LOG_TYPES.map((lt) => (
            <Line
              key={lt}
              type="monotone"
              dataKey={lt}
              stroke={TYPE_COLORS[lt]}
              dot={{ r: 3 }}
              connectNulls={false}
              name={lt}
            >
              <LabelList dataKey={lt} position="top" style={{ fontSize: 10 }} />
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
