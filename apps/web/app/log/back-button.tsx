"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="mb-6 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
    >
      ← Back
    </button>
  );
}
