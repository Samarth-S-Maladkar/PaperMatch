"use client";

import { useEffect, useState } from "react";

interface Interest {
  id: number;
  name: string;
  description: string | null;
}

export default function InterestsPage() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/interests")
      .then((r) => r.json())
      .then((d) => {
        setInterests(d.interests ?? []);
        setSelected(new Set(d.selected ?? []));
        setLoggedIn((d.selected ?? []).length >= 0);
      });
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setLoggedIn(!!d.user));
  }, []);

  async function toggle(id: number) {
    if (!loggedIn) return;
    const isSelected = selected.has(id);
    const method = isSelected ? "DELETE" : "POST";
    const res = await fetch("/api/interests", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interestId: id }),
    });
    if (!res.ok) return;
    setSelected((prev) => {
      const next = new Set(prev);
      isSelected ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Research Interests</h1>
      <p className="text-sm text-slate-500 mt-1">
        Select topics you care about — this feeds directly into your personalized recommendations.
      </p>
      {loggedIn === false && <p className="text-sm text-red-600 mt-4">Log in to manage your interests.</p>}

      <div className="grid sm:grid-cols-2 gap-3 mt-6">
        {interests.map((i) => {
          const active = selected.has(i.id);
          return (
            <button
              key={i.id}
              onClick={() => toggle(i.id)}
              className={`text-left card p-4 transition-colors ${
                active ? "border-brand-500 bg-brand-50" : ""
              }`}
            >
              <p className="font-medium text-slate-900">{i.name}</p>
              {i.description && <p className="text-xs text-slate-500 mt-1">{i.description}</p>}
              <span className={`text-xs mt-2 inline-block ${active ? "text-brand-700" : "text-slate-400"}`}>
                {active ? "Selected ✓" : "Tap to select"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
