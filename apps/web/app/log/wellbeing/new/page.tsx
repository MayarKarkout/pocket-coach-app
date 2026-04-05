import { BackButton } from "@/app/log/back-button";
import { NewWellbeingForm } from "./new-wellbeing-form";

export default function NewWellbeingPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6">Log Wellbeing</h1>
      <NewWellbeingForm />
    </main>
  );
}
