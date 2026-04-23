import Link from "next/link";
import { AddMealForm } from "./add-meal-form";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function NewFoodMealPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const initialDate = date ?? todayISO();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <Link
        href={`/food?date=${initialDate}`}
        className="mb-6 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        ← Back
      </Link>
      <h1 className="text-2xl font-bold mb-6">Log Meal</h1>
      <AddMealForm initialDate={initialDate} />
    </main>
  );
}
