import Link from "next/link";
import { apiServerFetch } from "@/lib/api-server";
import type { PlanSummary } from "@/lib/plans";
import { PlansList } from "./plans-list";

export default async function PlansPage() {
  const res = await apiServerFetch("/plans", { cache: "no-store" });
  const plans: PlanSummary[] = await res.json();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Plans</h1>
        <Link
          href="/plans/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          New plan
        </Link>
      </div>
      <PlansList initialPlans={plans} />
    </main>
  );
}
