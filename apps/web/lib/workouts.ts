export interface WorkoutSet {
  id: number;
  reps_min: number | null;
  reps_max: number | null;
  duration_min_seconds: number | null;
  duration_max_seconds: number | null;
  weight_kg: string | null; // Decimal comes as string from JSON
  notes: string | null;
  position: number;
}

export interface WorkoutExercise {
  id: number;
  name: string;
  superset_group: string | null;
  position: number;
  sets: WorkoutSet[];
}

export interface Workout {
  id: number;
  date: string;
  plan_day_id: number | null;
  plan_day_label: string;
  notes: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  exercises: WorkoutExercise[];
}

export interface WorkoutSummary {
  id: number;
  date: string;
  plan_day_id: number | null;
  plan_day_label: string;
  notes: string | null;
  set_count: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}
