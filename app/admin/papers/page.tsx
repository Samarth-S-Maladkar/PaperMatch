"use client";

import { useEffect, useState } from "react";

export default function AdminPapersPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    abstract: "",
    publication_year: new Date().getFullYear(),
    venue: "",
    doi: "",
    url: "",
    category_id: "",
    authorsText: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    fetch("/api/papers?pageSize=50").then((r) => r.json()).then((d) => setPapers(d.results ?? []));
    fetch("/api/admin/categories").then((r) => r.json()).then((d) => setCategories(d.results ?? []));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const authors = form.authorsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    const res = await fetch("/api/papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        abstract: form.abstract,
        publication_year: Number(form.publication_year),
        venue: form.venue || undefined,
        doi: form.doi || undefined,
        url: form.url || undefined,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        authors,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed to create paper");
      return;
    }
    setMessage("Paper created and embedding generated.");
    setForm({ ...form, title: "", abstract: "", venue: "", doi: "", url: "", authorsText: "" });
    load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/papers/${id}`, { method: "DELETE" });
    load();
  }

  async function handleRegenerate(id: number) {
    const res = await fetch(`/api/admin/papers/${id}/regenerate-embedding`, { method: "POST" });
    setMessage(res.ok ? `Regenerated embedding for paper #${id}` : "Embedding service unavailable");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Manage Papers</h1>

      <form onSubmit={handleCreate} className="card p-5 mt-6 space-y-3">
        <h2 className="font-semibold text-slate-900">Add Paper</h2>
        <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="input" placeholder="Abstract" rows={3} value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} required />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" type="number" placeholder="Year" value={form.publication_year} onChange={(e) => setForm({ ...form, publication_year: Number(e.target.value) })} />
          <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input className="input" placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          <input className="input" placeholder="DOI" value={form.doi} onChange={(e) => setForm({ ...form, doi: e.target.value })} />
        </div>
        <input className="input" placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <input className="input" placeholder="Authors (comma separated)" value={form.authorsText} onChange={(e) => setForm({ ...form, authorsText: e.target.value })} required />
        <button className="btn-primary">Create Paper</button>
        {message && <p className="text-xs text-slate-600">{message}</p>}
      </form>

      <div className="mt-8 space-y-2">
        {papers.map((p) => (
          <div key={p.id} className="card p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">{p.title}</p>
              <p className="text-xs text-slate-500">{p.publication_year} · {p.category_name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleRegenerate(p.id)} className="btn-secondary text-xs px-2 py-1">Regen. Embedding</button>
              <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 px-2 py-1">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
