"use client";

import { useState } from "react";
import Link from "next/link";
import { TimeWindowSelector } from "./time-window-selector";
import { GymInsights } from "./gym-insights";
import { FootballInsights } from "./football-insights";
import { ActivityInsights } from "./activity-insights";
import { WellbeingInsights } from "./wellbeing-insights";
import { MealInsights } from "./meal-insights";
import { SummaryInsights } from "./summary-insights";
import { HealthInsights } from "./health-insights";
import { dateRangeFor } from "@/lib/insights";
import type { DateRange } from "@/lib/insights";

export default function InsightsPage() {
  const [range, setRange] = useState<DateRange>(dateRangeFor("4w"));

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Insights</h1>
        <Link href="/insights/snapshot" className="text-sm text-primary hover:underline">
          Snapshot →
        </Link>
      </div>
      <TimeWindowSelector onChange={setRange} />
      <div className="flex flex-col gap-8">
        <SummaryInsights range={range} />
        <hr className="border-border" />
        <GymInsights range={range} />
        <FootballInsights range={range} />
        <ActivityInsights range={range} />
        <WellbeingInsights range={range} />
        <MealInsights range={range} />
        <hr className="border-border" />
        <HealthInsights range={range} />
      </div>
    </main>
  );
}
