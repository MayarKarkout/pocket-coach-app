import { notFound } from "next/navigation";
import { apiServerFetch } from "@/lib/api-server";
import type { Plan } from "@/lib/plans";
import { PlanEditor } from "./plan-editor";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiServerFetch(`/plans/${id}`, { cache: "no-store" });
  if (res.status === 404) notFound();
  const plan: Plan = await res.json();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <PlanEditor initialPlan={plan} />
    </main>
  );
}
