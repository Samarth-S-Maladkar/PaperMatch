"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/analytics").then(async (r) => {
      if (r.status === 403 || r.status === 401) {
        setForbidden(true);
        return;
      }
      setData(await r.json());
    });
  }, []);

  if (forbidden)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-red-600">
        Admin access only. Log in with an admin account to view this page.
      </div>
    );
  if (!data) return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-400">Loading…</div>;

  const s = data.stats;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/papers" className="btn-secondary text-xs px-3 py-1.5">Manage Papers</Link>
          <Link href="/admin/authors" className="btn-secondary text-xs px-3 py-1.5">Manage Authors</Link>
          <Link href="/admin/categories" className="btn-secondary text-xs px-3 py-1.5">Manage Categories</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <Stat label="Total Users" value={s.total_users} />
        <Stat label="Total Papers" value={s.total_papers} />
        <Stat label="Total Authors" value={s.total_authors} />
        <Stat label="Total Categories" value={s.total_categories} />
        <Stat label="Total Saves" value={s.total_saves} />
        <Stat label="Total Likes" value={s.total_likes} />
        <Stat label="Total Views" value={s.total_views} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-10">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Most Viewed Papers</h2>
          <ul className="space-y-2 text-sm">
            {data.mostViewed.map((p: any) => (
              <li key={p.paper_id} className="flex justify-between">
                <span className="text-slate-700 truncate pr-2">{p.title}</span>
                <span className="text-slate-400 shrink-0">{p.view_count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Most Saved Papers</h2>
          <ul className="space-y-2 text-sm">
            {data.mostSaved.map((p: any) => (
              <li key={p.paper_id} className="flex justify-between">
                <span className="text-slate-700 truncate pr-2">{p.title}</span>
                <span className="text-slate-400 shrink-0">{p.save_count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Popular Categories</h2>
          <ul className="space-y-2 text-sm">
            {data.popularCategories.map((c: any) => (
              <li key={c.name} className="flex justify-between">
                <span className="text-slate-700">{c.name}</span>
                <span className="text-slate-400">{c.paper_count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Recent Activity</h2>
          <ul className="space-y-2 text-sm">
            {data.recentActivity.map((a: any, i: number) => (
              <li key={i} className="text-slate-600">
                <span className="font-medium">{a.user_name}</span> {a.interaction_type.toLowerCase()}d{" "}
                <span className="italic">{a.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-2xl font-bold text-brand-700">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
