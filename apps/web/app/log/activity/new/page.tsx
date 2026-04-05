import { BackButton } from "@/app/log/back-button";
import { NewActivityForm } from "./new-activity-form";

export default function NewActivityPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6">Log Activity</h1>
      <NewActivityForm />
    </main>
  );
}
