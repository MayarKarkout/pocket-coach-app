"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { Plan } from "@/lib/plans";

export default function NewPlanPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    const res = await apiFetch("/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError(true);
      return;
    }
    const plan: Plan = await res.json();
    router.push(`/plans/${plan.id}/edit`);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">New plan</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Plan name (e.g. Push Pull Legs)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {error && (
          <p className="text-sm text-destructive">Something went wrong.</p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Create
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/plans")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </main>
  );
}
