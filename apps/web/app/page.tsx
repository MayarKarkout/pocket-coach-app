import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "./logout-button";

interface HealthResponse {
  status: string;
  db: string;
}

export default async function Home() {
  const apiUrl = process.env.API_URL ?? "http://localhost:8000";

  let health: HealthResponse | null = null;
  let error = false;

  try {
    const res = await fetch(`${apiUrl}/health`, { cache: "no-store" });
    if (!res.ok) throw new Error("not ok");
    health = await res.json();
  } catch {
    error = true;
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">PocketCoach</h1>
        {error || !health ? (
          <Badge variant="destructive">DB error</Badge>
        ) : (
          <Badge className="bg-green-600 hover:bg-green-700">DB connected</Badge>
        )}
        <Link
          href="/plans"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Plans
        </Link>
        <LogoutButton />
      </div>
    </main>
  );
}
