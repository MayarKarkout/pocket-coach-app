import { BackButton } from "@/app/log/back-button";
import { NewFootballForm } from "./new-football-form";

export default function NewFootballPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6">Log Football Session</h1>
      <NewFootballForm />
    </main>
  );
}
