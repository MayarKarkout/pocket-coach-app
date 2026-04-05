import Link from "next/link";
import { apiServerFetch } from "@/lib/api-server";
import type { WorkoutSummary } from "@/lib/workouts";
import { WorkoutsList } from "./workouts-list";

export default async function WorkoutsPage() {
  const res = await apiServerFetch("/workouts", { cache: "no-store" });
  const workouts: WorkoutSummary[] = await res.json();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <div className="flex gap-2">
          <Link
            href="/plans"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            Plans
          </Link>
          <Link
            href="/workouts/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            New workout
          </Link>
        </div>
      </div>
      <WorkoutsList initialWorkouts={workouts} />
    </main>
  );
}
