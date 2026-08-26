export interface GymTotals {
  session_count: number;
  total_tonnage_kg: number;
}

export interface FootballTotals {
  session_count: number;
  training_count: number;
  match_count: number;
  total_duration_minutes: number;
  avg_rpe: number | null;
}

export interface ActivityTotals {
  session_count: number;
  total_duration_minutes: number;
  activity_types: string[];
}

export interface FoodTotals {
  days_logged: number;
  avg_daily_calories: number | null;
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
}

export interface HealthTotals {
  days_with_data: number;
  avg_steps: number | null;
  avg_sleep_minutes: number | null;
  avg_resting_hr: number | null;
}

export interface Snapshot {
  from_date: string;
  to_date: string;
  gym: GymTotals;
  football: FootballTotals;
  activity: ActivityTotals;
  food: FoodTotals | null;
  health: HealthTotals | null;
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatPeriodDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function gymLine(g: GymTotals): string {
  return `${plural(g.session_count, "session")} · ${Math.round(g.total_tonnage_kg).toLocaleString()} kg tonnage`;
}

export function footballLine(f: FootballTotals): string {
  const parts = [
    `${plural(f.session_count, "session")} (${f.training_count} training, ${f.match_count} match)`,
    formatMinutes(f.total_duration_minutes),
  ];
  if (f.avg_rpe != null) parts.push(`avg RPE ${f.avg_rpe.toFixed(1)}`);
  return parts.join(" · ");
}

export function activityLine(a: ActivityTotals): string {
  const parts = [plural(a.session_count, "session"), formatMinutes(a.total_duration_minutes)];
  if (a.activity_types.length > 0) parts.push(a.activity_types.join(", "));
  return parts.join(" · ");
}

export function foodLine(f: FoodTotals): string {
  const parts = [`${plural(f.days_logged, "day")} logged`];
  if (f.avg_daily_calories != null) parts.push(`avg ${Math.round(f.avg_daily_calories)} kcal/day`);
  if (f.total_protein_g != null) parts.push(`${Math.round(f.total_protein_g)}g protein`);
  if (f.total_carbs_g != null) parts.push(`${Math.round(f.total_carbs_g)}g carbs`);
  if (f.total_fat_g != null) parts.push(`${Math.round(f.total_fat_g)}g fat`);
  return parts.join(" · ");
}

export function healthLine(h: HealthTotals): string {
  const parts: string[] = [];
  if (h.avg_steps != null) parts.push(`${Math.round(h.avg_steps).toLocaleString()} avg steps`);
  if (h.avg_sleep_minutes != null) parts.push(`${formatMinutes(h.avg_sleep_minutes)} avg sleep`);
  if (h.avg_resting_hr != null) parts.push(`${Math.round(h.avg_resting_hr)} bpm avg RHR`);
  return parts.join(" · ");
}

export function hasActivityData(data: Snapshot): boolean {
  return data.gym.session_count > 0 || data.football.session_count > 0 || data.activity.session_count > 0;
}

export function toPlainText(data: Snapshot, aiSummary?: string | null): string {
  const lines: string[] = ["PocketCoach Activity Snapshot", `${formatPeriodDate(data.from_date)} – ${formatPeriodDate(data.to_date)}`, ""];
  if (data.gym.session_count > 0) lines.push(`Gym: ${gymLine(data.gym)}`);
  if (data.football.session_count > 0) lines.push(`Football: ${footballLine(data.football)}`);
  if (data.activity.session_count > 0) lines.push(`Activity: ${activityLine(data.activity)}`);
  if (!hasActivityData(data)) lines.push("No activity logged in this period.");
  if (data.food && data.food.days_logged > 0) lines.push(`Food: ${foodLine(data.food)}`);
  if (data.health && data.health.days_with_data > 0) lines.push(`Health: ${healthLine(data.health)}`);
  if (aiSummary) lines.push("", aiSummary);
  return lines.join("\n");
}
