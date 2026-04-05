"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nowLocalTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function NewActivityForm() {
  const router = useRouter();

  const [date, setDate] = useState<string>(todayISO());
  const [time, setTime] = useState<string>(nowLocalTime());
  const [activityType, setActivityType] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    await apiFetch("/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        occurred_at: time ? combineDateTime(date, time) : null,
        activity_type: activityType,
        duration_minutes: Number(durationMinutes),
        notes: notes || null,
      }),
    });

    router.push(`/log?date=${date}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="date" className="text-sm font-medium">
          Date
        </label>
        <input
          id="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="time" className="text-sm font-medium">
          Time
        </label>
        <input
          id="time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="activity_type" className="text-sm font-medium">
          Activity Type
        </label>
        <input
          id="activity_type"
          type="text"
          required
          placeholder="e.g. Walk, Home workout, Cycling"
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="duration_minutes" className="text-sm font-medium">
          Duration (minutes)
        </label>
        <input
          id="duration_minutes"
          type="number"
          required
          min={1}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Log Activity"}
      </button>
    </form>
  );
}
