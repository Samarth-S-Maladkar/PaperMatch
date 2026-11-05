"use client";

import { useEffect, useState, useCallback } from "react";
import PaperCard, { PaperCardData } from "@/components/PaperCard";

type Mode = "keyword" | "semantic" | "hybrid";

interface Category {
  id: number;
  name: string;
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("hybrid");
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [author, setAuthor] = useState("");
  const [results, setResults] = useState<PaperCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.results ?? []))
      .catch(() => {});
  }, []);

  const runSearch = useCallback(
    async (targetPage: number) => {
      if (!q.trim()) return;
      setLoading(true);
      setError(null);
      setSearched(true);
      try {
        const params = new URLSearchParams({ q, mode, page: String(targetPage), pageSize: "10" });
        if (category) params.set("category", category);
        if (year) params.set("year", year);
        if (author) params.set("author", author);
        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Search failed");
          setResults([]);
          return;
        }
        setResults(data.results);
        setTotal(data.total);
        setTotalPages(data.totalPages ?? 1);
        setPage(targetPage);
      } finally {
        setLoading(false);
      }
    },
    [q, mode, category, year, author]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(1);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Search Research Papers</h1>
      <p className="text-sm text-slate-500 mt-1">
        Try: <span className="italic">machine learning for medical image analysis</span>
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Search papers by topic, method, or application…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["keyword", "semantic", "hybrid"] as Mode[]).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                mode === m
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-600 border-slate-300"
              }`}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Year (e.g. 2023)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <input
            className="input"
            placeholder="Author name"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
      </form>

      <div className="mt-8">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && searched && !loading && results.length === 0 && (
          <p className="text-sm text-slate-500">No papers found. Try a different search query.</p>
        )}
        {!searched && !error && (
          <p className="text-sm text-slate-400">Enter a query above to search the PaperMatch catalogue.</p>
        )}
        {results.length > 0 && (
          <p className="text-xs text-slate-500 mb-3">
            {total} result{total === 1 ? "" : "s"} · {mode} search
          </p>
        )}
        <div className="space-y-4">
          {results.map((r) => (
            <PaperCard key={r.id} paper={r} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              disabled={page <= 1}
              onClick={() => runSearch(page - 1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => runSearch(page + 1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
