"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { PlanSummary } from "@/lib/plans";

export function PlansList({ initialPlans }: { initialPlans: PlanSummary[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const router = useRouter();

  async function activate(id: number) {
    const res = await apiFetch(`/plans/${id}/activate`, { method: "POST" });
    if (!res.ok) return;
    setPlans((prev) =>
      prev.map((p) => ({ ...p, is_active: p.id === id })),
    );
  }

  async function deletePlan(id: number) {
    const res = await apiFetch(`/plans/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setPlans((prev) => prev.filter((p) => p.id !== id));
    setConfirmingDeleteId(null);
  }

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No plans yet. Create one to get started.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {plans.map((plan) => (
        <li
          key={plan.id}
          className="flex items-center justify-between rounded-xl border border-border px-4 py-3 gap-3"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{plan.name}</span>
            {plan.is_active && (
              <Badge className="bg-green-600 hover:bg-green-700 shrink-0">
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!plan.is_active && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => activate(plan.id)}
              >
                Activate
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/plans/${plan.id}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={confirmingDeleteId === plan.id ? "bg-red-500 text-white border-red-500 hover:bg-red-600 hover:text-white" : ""}
              onClick={() => confirmingDeleteId === plan.id ? deletePlan(plan.id) : setConfirmingDeleteId(plan.id)}
              onBlur={() => setConfirmingDeleteId(null)}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
