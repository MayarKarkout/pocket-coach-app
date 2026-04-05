export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export type TimeWindow = "7d" | "4w" | "monthly" | "yearly" | "custom";

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateRangeFor(window: Exclude<TimeWindow, "custom">): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = toISO(today);

  switch (window) {
    case "7d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: toISO(from), to };
    }
    case "4w": {
      const from = new Date(today);
      from.setDate(from.getDate() - 27);
      return { from: toISO(from), to };
    }
    case "monthly": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toISO(from), to };
    }
    case "yearly": {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from: toISO(from), to };
    }
  }
}

export const WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "4w", label: "4W" },
  { key: "monthly", label: "Month" },
  { key: "yearly", label: "Year" },
  { key: "custom", label: "Custom" },
];
