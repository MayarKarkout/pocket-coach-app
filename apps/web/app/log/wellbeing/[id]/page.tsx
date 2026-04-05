import { notFound } from "next/navigation";
import { apiServerFetch } from "@/lib/api-server";
import type { WellbeingLog } from "@/lib/events";
import { EditWellbeingForm } from "./edit-wellbeing-form";

export default async function EditWellbeingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiServerFetch(`/wellbeing/${id}`, { cache: "no-store" });
  if (!res.ok) notFound();
  const log: WellbeingLog = await res.json();
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Wellbeing Log</h1>
      <EditWellbeingForm log={log} />
    </main>
  );
}
