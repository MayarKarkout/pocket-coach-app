export interface PlanExercise {
  id: number;
  name: string;
  planned_sets: number;
  reps_min: number | null;
  reps_max: number | null;
  duration_seconds: number | null;
  per_side: boolean;
  intensity_pct: number;
  rest_seconds: number;
  position: number;
}

export interface Superset {
  id: number;
  group_label: string;
  rest_seconds: number;
  position: number;
  exercises: PlanExercise[];
}

export interface PlanDay {
  id: number;
  label: string;
  position: number;
  exercises: PlanExercise[];  // standalone only
  supersets: Superset[];
}

export interface Plan {
  id: number;
  name: string;
  is_active: boolean;
  days: PlanDay[];
}

export interface PlanSummary {
  id: number;
  name: string;
  is_active: boolean;
}
