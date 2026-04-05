import { apiServerFetch } from "@/lib/api-server";
import type { Workout } from "@/lib/workouts";
import { WorkoutLog } from "./workout-log";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiServerFetch(`/workouts/${id}`, { cache: "no-store" });
  const workout: Workout = await res.json();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <WorkoutLog initialWorkout={workout} />
    </main>
  );
}
