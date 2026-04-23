import Link from "next/link";
import { apiServerFetch } from "@/lib/api-server";
import { AddMenu } from "./add-menu";
import { BriefingSection } from "./briefing-section";
import { ChatSection } from "./chat-section";
import { HealthSection } from "./health-section";
import { TriageSection } from "./triage-section";

// --- Types ---

interface Rolling7d {
  avg_daily_calories: number | null;
  sessions: number;
  avg_wellbeing_severity: number | null;
}

interface TodayEvent {
  kind: string;
  data: Record<string, string | number | null>;
}

interface HealthSnapshot {
  steps: number | null;
  calories_active: number | null;
  resting_hr: number | null;
  hrv: number | null;
  spo2: number | null;
  stress_avg: number | null;
  sleep_duration_minutes: number | null;
  sleep_deep_minutes: number | null;
  sleep_rem_minutes: number | null;
}

interface TodayOut {
  date: string;
  events: TodayEvent[];
  rolling_7d: Rolling7d;
  health: HealthSnapshot | null;
}

// --- StatCard ---

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// --- Event card ---

function kindBadgeClass(kind: string): string {
  switch (kind) {
    case "workout":
      return "text-primary";
    case "football":
      return "text-blue-500";
    case "activity":
      return "text-green-500";
    case "wellbeing":
      return "text-orange-500";
    case "meal":
      return "text-purple-500";
    default:
      return "text-muted-foreground";
  }
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "workout":
      return "Gym";
    case "football":
      return "Football";
    case "activity":
      return "Activity";
    case "wellbeing":
      return "Wellbeing";
    case "meal":
      return "Meal";
    default:
      return kind;
  }
}

function eventMainLabel(event: TodayEvent): string {
  const d = event.data;
  switch (event.kind) {
    case "workout":
      return typeof d.plan_day_label === "string" ? d.plan_day_label : "Workout";
    case "football":
      return typeof d.session_type === "string" ? d.session_type : "Football";
    case "activity":
      return typeof d.activity_type === "string" ? d.activity_type : "Activity";
    case "wellbeing":
      return typeof d.log_type === "string" ? d.log_type : "Wellbeing";
    case "meal":
      return typeof d.meal_type === "string" ? d.meal_type : "Meal";
    default:
      return event.kind;
  }
}

function eventDetail(event: TodayEvent): string | null {
  const d = event.data;
  switch (event.kind) {
    case "workout": {
      const count = d.set_count;
      return typeof count === "number" ? `${count} sets` : null;
    }
    case "football": {
      const dur = d.duration_minutes;
      const rpe = d.rpe;
      if (typeof dur === "number" && typeof rpe === "number") {
        return `${dur} min · RPE ${rpe}`;
      }
      return null;
    }
    case "activity": {
      const dur = d.duration_minutes;
      return typeof dur === "number" ? `${dur} min` : null;
    }
    case "wellbeing": {
      const sev = d.severity;
      return typeof sev === "number" ? `Severity ${sev}/10` : null;
    }
    case "meal": {
      const cal = d.calories;
      return typeof cal === "number" ? `${cal} kcal` : null;
    }
    default:
      return null;
  }
}

function editUrl(event: TodayEvent): string {
  const id = event.data.id;
  switch (event.kind) {
    case "workout": return `/workouts/${id}`;
    case "football": return `/log/football/${id}`;
    case "activity": return `/log/activity/${id}`;
    case "wellbeing": return `/log/wellbeing/${id}`;
    case "meal": return `/log/meals/${id}`;
    default: return "/log";
  }
}

function EventCard({ event }: { event: TodayEvent }) {
  const detail = eventDetail(event);
  return (
    <div className="rounded-xl border border-border p-3 flex flex-col gap-1 hover:bg-accent cursor-pointer">
      <span className={`text-xs font-semibold uppercase tracking-wide ${kindBadgeClass(event.kind)}`}>
        {kindLabel(event.kind)}
      </span>
      <p className="text-sm font-medium capitalize">{eventMainLabel(event)}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

// --- Page ---

export default async function TodayPage() {
  const res = await apiServerFetch("/today", { cache: "no-store" });
  const data: TodayOut = await res.json();

  const { events, rolling_7d, health } = data;

  const dateSubtitle = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const avgCaloriesDisplay =
    rolling_7d.avg_daily_calories !== null
      ? `${Math.round(rolling_7d.avg_daily_calories).toLocaleString()} kcal`
      : "—";

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold">Today</h1>
        <AddMenu />
      </div>
      <p className="text-sm text-muted-foreground mb-6">{dateSubtitle}</p>

      {/* Section 1: 7-day rolling stats */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <StatCard label="Avg calories / day" value={avgCaloriesDisplay} />
        <StatCard label="Sessions (7d)" value={String(rolling_7d.sessions)} />
      </div>
      <div className="flex justify-end mb-3">
        <Link href="/insights" className="text-xs text-muted-foreground hover:text-foreground">
          View Insights →
        </Link>
      </div>

      {/* Section 2: Health glance */}
      {health && (
        <div className="mb-6">
          <HealthSection health={health} />
        </div>
      )}

      {/* Section 3: Today's feed */}
      <h2 className="text-lg font-semibold mb-3">Today</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-6">Nothing logged yet today.</p>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {events.map((event, i) => (
            <Link key={i} href={editUrl(event)} className="block">
              <EventCard event={event} />
            </Link>
          ))}
        </div>
      )}

      {/* Section 4: Watch triage */}
      <TriageSection />

      {/* Section 5: Coach */}
      <BriefingSection />
      <div className="mt-6">
        <ChatSection />
      </div>
    </main>
  );
}
