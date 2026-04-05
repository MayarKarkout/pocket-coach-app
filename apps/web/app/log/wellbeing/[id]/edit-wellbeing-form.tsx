"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { WellbeingLog } from "@/lib/events";

type LogType = "pain" | "fatigue" | "soreness";

function toLocalTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function EditWellbeingForm({ log }: { log: WellbeingLog }) {
  const router = useRouter();

  const [date, setDate] = useState<string>(log.date);
  const [time, setTime] = useState<string>(toLocalTime(log.occurred_at));
  const [logType, setLogType] = useState<LogType>(log.log_type as LogType);
  const [severity, setSeverity] = useState<string>(String(log.severity));
  const [bodyPart, setBodyPart] = useState<string>(log.body_part ?? "");
  const [notes, setNotes] = useState<string>(log.notes ?? "");
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    await apiFetch(`/wellbeing/${log.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        occurred_at: time ? combineDateTime(date, time) : null,
        log_type: logType,
        severity: Number(severity),
        body_part: bodyPart || null,
        notes: notes || null,
      }),
    });

    router.push("/log");
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <>
      <Link href="/log" className="text-sm text-muted-foreground mb-4 inline-block">
        ← Back
      </Link>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-sm font-medium">
            Date
          </label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="time" className="text-sm font-medium">
            Time
          </label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="log_type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="log_type"
            value={logType}
            onChange={(e) => setLogType(e.target.value as LogType)}
            className={inputClass}
          >
            <option value="pain">Pain</option>
            <option value="fatigue">Fatigue</option>
            <option value="soreness">Soreness</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="severity" className="text-sm font-medium">
            Severity (1–10)
          </label>
          <input
            id="severity"
            type="number"
            required
            min={1}
            max={10}
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="body_part" className="text-sm font-medium">
            Body Part
          </label>
          <input
            id="body_part"
            type="text"
            placeholder="e.g. Left knee, Lower back"
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </form>
    </>
  );
}
