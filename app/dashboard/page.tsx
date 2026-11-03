"use client";

import { useEffect, useState } from "react";
import PaperCard, { PaperCardData } from "@/components/PaperCard";

interface Activity {
  saved_count: number;
  liked_count: number;
  viewed_count: number;
  interest_count: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(undefined);
  const [recommendations, setRecommendations] = useState<PaperCardData[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch("/api/recommendations").then((r) => r.json()),
      fetch("/api/saved").then((r) => r.json()),
    ])
      .then(([rec, sv]) => {
        setRecommendations(rec.recommendations ?? []);
        setSaved(sv.results ?? []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (user === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Please log in</h1>
        <p className="text-sm text-slate-500 mt-2">Log in to see your personalized dashboard.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Your Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <StatCard label="Saved" value={saved.length} />
        <StatCard label="Liked" value="—" />
        <StatCard label="Viewed" value="—" />
        <StatCard label="Interests" value="—" />
      </div>

      <h2 className="font-semibold text-slate-900 mt-10 mb-3">Recommended for You</h2>
      {loading ? (
        <p className="text-sm text-slate-400">Loading recommendations…</p>
      ) : recommendations.length === 0 ? (
        <p className="text-sm text-slate-400">
          No recommendations yet — save or like a few papers, or add research interests, to get started.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {recommendations.map((r) => (
            <PaperCard key={r.id} paper={r} />
          ))}
        </div>
      )}

      <h2 className="font-semibold text-slate-900 mt-10 mb-3">Recent Activity</h2>
      {saved.length === 0 ? (
        <p className="text-sm text-slate-400">No saved papers yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {saved.slice(0, 4).map((s) => (
            <PaperCard key={s.id} paper={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-2xl font-bold text-brand-700">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
