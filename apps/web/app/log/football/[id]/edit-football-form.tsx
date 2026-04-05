"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { FootballSession } from "@/lib/events";

type SessionType = "training" | "match";

function toLocalTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

interface Props {
  session: FootballSession;
}

export function EditFootballForm({ session }: Props) {
  const router = useRouter();

  const [date, setDate] = useState(session.date);
  const [time, setTime] = useState(toLocalTime(session.occurred_at));
  const [sessionType, setSessionType] = useState<SessionType>(
    session.session_type === "match" ? "match" : "training"
  );
  const [durationMinutes, setDurationMinutes] = useState(String(session.duration_minutes));
  const [rpe, setRpe] = useState(String(session.rpe));
  const [notes, setNotes] = useState(session.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const res = await apiFetch(`/football/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        session_type: sessionType,
        duration_minutes: Number(durationMinutes),
        rpe: Number(rpe),
        notes: notes || null,
        occurred_at: time ? combineDateTime(date, time) : null,
      }),
    });
    if (!res.ok) { setSubmitting(false); return; }
    router.push("/log");
  }

  return (
    <>
      <Link href="/log" className="text-sm text-muted-foreground mb-4 inline-block">← Back</Link>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="time">Time</label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Session Type</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="session_type"
                value="training"
                checked={sessionType === "training"}
                onChange={() => setSessionType("training")}
              />
              Training
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="session_type"
                value="match"
                checked={sessionType === "match"}
                onChange={() => setSessionType("match")}
              />
              Match
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="duration_minutes">
            Duration (minutes)
          </label>
          <input
            id="duration_minutes"
            type="number"
            required
            min={1}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="rpe">RPE (1–10)</label>
          <input
            id="rpe"
            type="number"
            required
            min={1}
            max={10}
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="mt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </>
  );
}
