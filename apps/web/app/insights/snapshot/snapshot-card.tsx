import { forwardRef } from "react";
import type { Snapshot } from "@/lib/snapshot";
import { activityLine, footballLine, foodLine, gymLine, hasActivityData, healthLine, formatPeriodDate } from "@/lib/snapshot";

export const SnapshotCard = forwardRef<HTMLDivElement, { data: Snapshot; aiSummary?: string | null }>(
  function SnapshotCard({ data, aiSummary }, ref) {
    return (
      <div ref={ref} className="rounded-2xl border border-border bg-background p-6 flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            PocketCoach Activity Snapshot
          </p>
          <p className="text-lg font-bold">
            {formatPeriodDate(data.from_date)} – {formatPeriodDate(data.to_date)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {data.gym.session_count > 0 && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">Gym</span>
              <span className="text-sm text-muted-foreground">{gymLine(data.gym)}</span>
            </div>
          )}
          {data.football.session_count > 0 && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">Football</span>
              <span className="text-sm text-muted-foreground">{footballLine(data.football)}</span>
            </div>
          )}
          {data.activity.session_count > 0 && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">Activity</span>
              <span className="text-sm text-muted-foreground">{activityLine(data.activity)}</span>
            </div>
          )}
          {!hasActivityData(data) && (
            <p className="text-sm text-muted-foreground">No activity logged in this period.</p>
          )}

          {data.food && data.food.days_logged > 0 && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">Food</span>
              <span className="text-sm text-muted-foreground">{foodLine(data.food)}</span>
            </div>
          )}
          {data.health && data.health.days_with_data > 0 && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">Health</span>
              <span className="text-sm text-muted-foreground">{healthLine(data.health)}</span>
            </div>
          )}
        </div>

        {aiSummary && <p className="text-sm border-t border-border pt-3">{aiSummary}</p>}
      </div>
    );
  }
);
