"use client";

import { useEffect, useState } from "react";
import PaperCard from "@/components/PaperCard";

export default function SavedPage() {
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/saved")
      .then(async (r) => {
        if (r.status === 401) {
          setError("Log in to view your saved papers.");
          return { results: [] };
        }
        return r.json();
      })
      .then((d) => setSaved(d.results ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleRemove(paperId: number) {
    await fetch("/api/saved", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId }),
    });
    setSaved((prev) => prev.filter((p) => p.id !== paperId));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">My Saved Papers</h1>
      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      {loading && <p className="text-sm text-slate-400 mt-4">Loading…</p>}
      {!loading && !error && saved.length === 0 && (
        <p className="text-sm text-slate-400 mt-4">You haven&apos;t saved any papers yet.</p>
      )}
      <div className="space-y-4 mt-6">
        {saved.map((p) => (
          <div key={p.id} className="relative">
            <PaperCard paper={p} />
            <button
              onClick={(e) => {
                e.preventDefault();
                handleRemove(p.id);
              }}
              className="absolute top-4 right-4 text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
