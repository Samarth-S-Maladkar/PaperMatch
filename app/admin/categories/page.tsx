"use client";

import { useEffect, useState } from "react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/categories").then((r) => r.json()).then((d) => setCategories(d.results ?? []));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setName("");
    setDescription("");
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Manage Categories</h1>
      <form onSubmit={handleCreate} className="card p-5 mt-6 flex gap-3">
        <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button className="btn-primary shrink-0">Add</button>
      </form>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="mt-6 space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="card p-3 text-sm">
            <p className="text-slate-900 font-medium">{c.name}</p>
            <p className="text-slate-500 text-xs">{c.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
