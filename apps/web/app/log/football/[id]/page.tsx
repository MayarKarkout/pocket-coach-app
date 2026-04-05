import { notFound } from "next/navigation";
import { apiServerFetch } from "@/lib/api-server";
import type { FootballSession } from "@/lib/events";
import { EditFootballForm } from "./edit-football-form";

export default async function EditFootballPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiServerFetch(`/football/${id}`, { cache: "no-store" });
  if (!res.ok) notFound();
  const session: FootballSession = await res.json();
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Football Session</h1>
      <EditFootballForm session={session} />
    </main>
  );
}
