"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PaperCard, { PaperCardData } from "@/components/PaperCard";

interface PaperDetail {
  id: number;
  title: string;
  abstract: string;
  publication_year: number;
  venue: string | null;
  doi: string | null;
  url: string | null;
  category_name: string | null;
  authors: { id: number; name: string; affiliation: string | null }[];
}

export default function PaperDetailPage() {
  const params = useParams<{ id: string }>();
  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [similar, setSimilar] = useState<PaperCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    fetch(`/api/papers/${params.id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load paper");
        return r.json();
      })
      .then((data) => {
        setPaper(data);
        // Record a VIEW interaction (best-effort; ignored if not logged in)
        fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paperId: data.id, type: "VIEW" }),
        }).catch(() => {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    fetch(`/api/papers/${params.id}/similar`)
      .then((r) => r.json())
      .then((d) => setSimilar(d.results ?? []))
      .catch(() => {});
  }, [params?.id]);

  async function handleSave() {
    if (!paper) return;
    const res = await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId: paper.id }),
    });
    if (res.status === 401) {
      setActionMsg("Log in to save papers.");
      return;
    }
    if (res.ok) {
      setSaved(true);
      setActionMsg("Saved to your library.");
    }
  }

  async function handleLike() {
    if (!paper) return;
    const res = await fetch("/api/liked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId: paper.id }),
    });
    if (res.status === 401) {
      setActionMsg("Log in to like papers.");
      return;
    }
    if (res.ok) {
      setLiked(true);
      setActionMsg("Liked.");
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-slate-400 text-sm">Loading…</div>;
  if (error || !paper)
    return <div className="mx-auto max-w-3xl px-4 py-16 text-red-600 text-sm">{error ?? "Paper not found."}</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {paper.category_name && (
        <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5 text-slate-600">{paper.category_name}</span>
      )}
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-3">{paper.title}</h1>
      <p className="text-sm text-slate-500 mt-2">
        {paper.authors.map((a) => a.name).join(", ")} · {paper.publication_year}
        {paper.venue ? ` · ${paper.venue}` : ""}
      </p>

      <div className="flex flex-wrap gap-3 mt-4 text-xs text-slate-500">
        {paper.doi && <span>DOI: {paper.doi}</span>}
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noreferrer" className="text-brand-600 underline">
            External link
          </a>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={handleSave} className="btn-primary text-sm" disabled={saved}>
          {saved ? "Saved ✓" : "Save"}
        </button>
        <button onClick={handleLike} className="btn-secondary text-sm" disabled={liked}>
          {liked ? "Liked ✓" : "Like"}
        </button>
      </div>
      {actionMsg && <p className="text-xs text-slate-500 mt-2">{actionMsg}</p>}

      <h2 className="font-semibold text-slate-900 mt-8 mb-2">Abstract</h2>
      <p className="text-slate-700 leading-relaxed">{paper.abstract}</p>

      <div className="mt-4 text-sm">
        <span className="font-medium text-slate-700">Affiliations: </span>
        <span className="text-slate-500">
          {paper.authors.map((a) => a.affiliation).filter(Boolean).join("; ") || "Not specified"}
        </span>
      </div>

      <h2 className="font-semibold text-slate-900 mt-10 mb-3">Similar Research Papers</h2>
      {similar.length === 0 ? (
        <p className="text-sm text-slate-400">No similar papers found yet.</p>
      ) : (
        <div className="space-y-4">
          {similar.map((s) => (
            <PaperCard key={s.id} paper={{ ...s, score: (s as any).similarity }} />
          ))}
        </div>
      )}
    </div>
  );
}
