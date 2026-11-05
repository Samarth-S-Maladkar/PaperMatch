import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
        <p className="text-xs uppercase tracking-widest text-brand-600 font-semibold mb-4">
          Research Discovery, Reimagined
        </p>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight">
          Discover research
          <br /> that matters to you.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-slate-600 text-lg">
          Search thousands of research papers using keyword, semantic, and hybrid search —
          then get recommendations built from your interests, saves, and reading history.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/search" className="btn-primary px-6 py-3 text-base">
            Explore Papers
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            Log in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 grid md:grid-cols-3 gap-6">
        <FeatureCard
          title="Semantic Search"
          body="PaperMatch understands meaning, not just keywords. A search for 'privacy preserving ML' surfaces relevant papers even if they never use that exact phrase, using vector embeddings compared with pgvector's cosine similarity."
        />
        <FeatureCard
          title="Personalized Recommendations"
          body="Your dashboard blends your selected research interests, saved and liked papers, and recent reading activity into a single preference signal, then ranks the whole catalogue against it."
        />
        <FeatureCard
          title="Research Discovery"
          body="Every paper links to the works most semantically similar to it, so one relevant result becomes a path into an entire subfield — not a dead end."
        />
      </section>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-6">
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
