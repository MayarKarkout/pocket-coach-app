import { apiServerFetch } from "@/lib/api-server";
import type { Plan } from "@/lib/plans";
import type { WorkoutSummary } from "@/lib/workouts";
import { NewWorkoutForm } from "./new-workout-form";

export default async function NewWorkoutPage() {
  const [plansRes, workoutsRes] = await Promise.all([
    apiServerFetch("/plans", { cache: "no-store" }),
    apiServerFetch("/workouts", { cache: "no-store" }),
  ]);
  const planSummaries: Pick<Plan, "id" | "name" | "is_active">[] = await plansRes.json();
  const pastWorkouts: WorkoutSummary[] = await workoutsRes.json();

  const fullPlans: Plan[] = await Promise.all(
    planSummaries.map(async (p) => {
      const r = await apiServerFetch(`/plans/${p.id}`, { cache: "no-store" });
      return r.json();
    })
  );

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">New Workout</h1>
      <NewWorkoutForm plans={fullPlans} pastWorkouts={pastWorkouts} />
    </main>
  );
}
