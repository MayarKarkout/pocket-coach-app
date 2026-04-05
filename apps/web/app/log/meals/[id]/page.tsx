import { notFound } from "next/navigation";
import { apiServerFetch } from "@/lib/api-server";
import type { MealLog } from "@/lib/events";
import { EditMealForm } from "./edit-meal-form";

export default async function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiServerFetch(`/meals/${id}`, { cache: "no-store" });
  if (!res.ok) notFound();
  const meal: MealLog = await res.json();
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Meal</h1>
      <EditMealForm meal={meal} />
    </main>
  );
}
