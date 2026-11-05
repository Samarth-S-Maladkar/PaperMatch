"use client";

import { useEffect, useState } from "react";

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");

  function load() {
    fetch("/api/admin/authors").then((r) => r.json()).then((d) => setAuthors(d.results ?? []));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/authors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, affiliation: affiliation || undefined }),
    });
    setName("");
    setAffiliation("");
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Manage Authors</h1>
      <form onSubmit={handleCreate} className="card p-5 mt-6 flex gap-3">
        <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="Affiliation" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} />
        <button className="btn-primary shrink-0">Add</button>
      </form>
      <div className="mt-6 space-y-2">
        {authors.map((a) => (
          <div key={a.id} className="card p-3 text-sm flex justify-between">
            <span className="text-slate-900">{a.name}</span>
            <span className="text-slate-500">{a.affiliation}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
