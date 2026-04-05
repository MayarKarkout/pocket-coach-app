export interface FootballSession {
  id: number;
  date: string;
  session_type: string; // "training" | "match"
  duration_minutes: number;
  rpe: number;
  notes: string | null;
  occurred_at: string | null;
  created_at: string;
}

export interface ActivitySession {
  id: number;
  date: string;
  activity_type: string;
  duration_minutes: number;
  notes: string | null;
  occurred_at: string | null;
  created_at: string;
}

export interface WellbeingLog {
  id: number;
  date: string;
  log_type: string; // "pain" | "fatigue" | "soreness"
  severity: number;
  body_part: string | null;
  notes: string | null;
  occurred_at: string | null;
  workout_id: number | null;
  football_session_id: number | null;
  activity_session_id: number | null;
  created_at: string;
}

export interface MealLog {
  id: number;
  date: string;
  meal_type: string;
  notes: string | null;
  calories: number | null;
  occurred_at: string | null;
  created_at: string;
}

export type EventItem =
  | { kind: "football"; data: FootballSession }
  | { kind: "activity"; data: ActivitySession }
  | { kind: "wellbeing"; data: WellbeingLog }
  | { kind: "meal"; data: MealLog };
