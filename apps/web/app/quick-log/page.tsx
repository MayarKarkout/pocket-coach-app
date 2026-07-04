import Link from "next/link";
import { QuickLogForm } from "./quick-log-form";

export default function QuickLogPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <Link
        href="/today"
        className="mb-6 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        ← Back
      </Link>
      <h1 className="text-2xl font-bold mb-2">Quick Log</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Describe your day in your own words — meals, workouts, football, activities, aches.
        The AI turns it into entries you can review before saving.
      </p>
      <QuickLogForm />
    </main>
  );
}
