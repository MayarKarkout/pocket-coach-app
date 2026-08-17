import { BackButton } from "@/app/log/back-button";
import { NewFootballForm } from "./new-football-form";
import { todayISO } from "@/lib/dates";

export default async function NewFootballPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const initialDate = date ?? todayISO();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6">Log Football Session</h1>
      <NewFootballForm initialDate={initialDate} />
    </main>
  );
}
