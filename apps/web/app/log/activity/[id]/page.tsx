import { notFound } from "next/navigation";
import { apiServerFetch } from "@/lib/api-server";
import type { ActivitySession } from "@/lib/events";
import { EditActivityForm } from "./edit-activity-form";

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiServerFetch(`/activity/${id}`, { cache: "no-store" });
  if (!res.ok) notFound();
  const session: ActivitySession = await res.json();
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Activity</h1>
      <EditActivityForm session={session} />
    </main>
  );
}
