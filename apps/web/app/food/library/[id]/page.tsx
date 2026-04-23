import Link from "next/link";
import { notFound } from "next/navigation";
import { apiServerFetch } from "@/lib/api-server";
import type { MealDefinition } from "@/lib/food";
import { MealDefinitionForm } from "../meal-definition-form";

export default async function EditMealDefinitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiServerFetch(`/meal-definitions/${id}`, { cache: "no-store" });
  if (!res.ok) notFound();
  const defn: MealDefinition = await res.json();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <Link
        href="/food/library"
        className="mb-6 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        ← Back
      </Link>
      <h1 className="text-2xl font-bold mb-6">Edit Meal</h1>
      <MealDefinitionForm existing={defn} />
    </main>
  );
}
