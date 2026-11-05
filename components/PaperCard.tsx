import Link from "next/link";

export interface PaperCardData {
  id: number;
  title: string;
  abstract: string;
  publication_year: number;
  category_name?: string | null;
  authors?: string[];
  score?: number;
  reason?: string;
}

export default function PaperCard({ paper }: { paper: PaperCardData }) {
  const excerpt =
    paper.abstract.length > 220 ? paper.abstract.slice(0, 220).trimEnd() + "…" : paper.abstract;
  return (
    <Link href={`/papers/${paper.id}`} className="card p-5 block hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900 leading-snug">{paper.title}</h3>
        {typeof paper.score === "number" && (
          <span className="shrink-0 text-xs font-medium text-brand-700 bg-brand-50 rounded-full px-2 py-1">
            {(paper.score * 100).toFixed(0)}% match
          </span>
        )}
      </div>
      {paper.authors && paper.authors.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">{paper.authors.join(", ")}</p>
      )}
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{excerpt}</p>
      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
        {paper.category_name && <span className="bg-slate-100 rounded-full px-2 py-0.5">{paper.category_name}</span>}
        <span>{paper.publication_year}</span>
      </div>
      {paper.reason && <p className="text-xs text-brand-700 mt-2 italic">{paper.reason}</p>}
    </Link>
  );
}
