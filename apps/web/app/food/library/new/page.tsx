import Link from "next/link";
import { MealDefinitionForm } from "../meal-definition-form";

export default function NewMealDefinitionPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <Link
        href="/food/library"
        className="mb-6 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        ← Back
      </Link>
      <h1 className="text-2xl font-bold mb-6">New Meal</h1>
      <MealDefinitionForm />
    </main>
  );
}
