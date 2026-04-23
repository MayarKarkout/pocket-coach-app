"use client";

import { useState } from "react";
import Link from "next/link";

const LOG_TYPES = [
  { label: "Gym Workout", href: "/workouts/new" },
  { label: "Football", href: "/log/football/new" },
  { label: "Activity", href: "/log/activity/new" },
  { label: "Wellbeing", href: "/log/wellbeing/new" },
  { label: "Meal", href: "/food/new" },
];

export function AddMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center text-xl font-medium leading-none"
        aria-label="Add"
      >
        +
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-20 rounded-xl border border-border bg-background shadow-lg overflow-hidden min-w-[160px]">
            {LOG_TYPES.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="block px-4 py-3 text-sm hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
