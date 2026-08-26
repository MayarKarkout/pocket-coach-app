"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { apiFetch } from "@/lib/api";
import { TimeWindowSelector } from "../time-window-selector";
import { dateRangeFor } from "@/lib/insights";
import type { DateRange } from "@/lib/insights";
import type { Snapshot } from "@/lib/snapshot";
import { toPlainText } from "@/lib/snapshot";
import { SnapshotCard } from "./snapshot-card";

export default function SnapshotPage() {
  const [range, setRange] = useState<DateRange>(dateRangeFor("4w"));
  const [includeFoodHealth, setIncludeFoodHealth] = useState(false);
  const [wantAiSummary, setWantAiSummary] = useState(false);

  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [copyLabel, setCopyLabel] = useState("Copy text");
  const [exporting, setExporting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setAiSummary(null);
    apiFetch(
      `/snapshot?from_date=${range.from}&to_date=${range.to}&include_food=${includeFoodHealth}&include_health=${includeFoodHealth}`
    )
      .then((r) => r.json() as Promise<Snapshot>)
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [range.from, range.to, includeFoodHealth]);

  async function generateAiSummary() {
    setAiLoading(true);
    const res = await apiFetch(`/snapshot/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_date: range.from,
        to_date: range.to,
        include_food: includeFoodHealth,
        include_health: includeFoodHealth,
      }),
    });
    const body: { summary: string } = await res.json();
    setAiSummary(body.summary);
    setAiLoading(false);
  }

  async function copyText() {
    if (!data) return;
    await navigator.clipboard.writeText(toPlainText(data, aiSummary));
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy text"), 2000);
  }

  async function exportPng() {
    if (!cardRef.current) return;
    setExporting(true);
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `pocketcoach-snapshot-${range.from}-to-${range.to}.png`;
    link.href = dataUrl;
    link.click();
    setExporting(false);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <Link href="/insights" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
        ← Insights
      </Link>
      <h1 className="text-2xl font-bold mb-4">Snapshot</h1>

      <TimeWindowSelector onChange={setRange} />

      <div className="flex flex-col gap-2 mb-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeFoodHealth}
            onChange={(e) => setIncludeFoodHealth(e.target.checked)}
          />
          Include food/health data
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={wantAiSummary}
            onChange={(e) => {
              setWantAiSummary(e.target.checked);
              if (!e.target.checked) setAiSummary(null);
            }}
          />
          Add AI summary
        </label>
        {wantAiSummary && !aiSummary && (
          <Button size="sm" variant="outline" onClick={generateAiSummary} disabled={aiLoading || loading}>
            {aiLoading ? "Generating…" : "Generate AI summary"}
          </Button>
        )}
      </div>

      {loading || !data ? (
        <PageSpinner />
      ) : (
        <>
          <SnapshotCard ref={cardRef} data={data} aiSummary={aiSummary} />

          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={copyText}>
              {copyLabel}
            </Button>
            <Button size="sm" variant="outline" onClick={exportPng} disabled={exporting}>
              {exporting ? "Exporting…" : "Export PNG"}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
