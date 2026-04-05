import { BackButton } from "@/app/log/back-button";
import { NewMealForm } from "./new-meal-form";

export default function NewMealPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6">Log Meal</h1>
      <NewMealForm />
    </main>
  );
}
