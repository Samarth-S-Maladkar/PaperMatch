"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Session = { userId: string; email: string; role: "RESEARCHER" | "ADMIN" } | null;

export default function NavBar() {
  const [user, setUser] = useState<Session>(null);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .finally(() => setLoaded(true));
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const links = [
    { href: "/search", label: "Search" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/saved", label: "Saved" },
    { href: "/interests", label: "Interests" },
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-brand-700">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
          PaperMatch
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-600">
              {l.label}
            </Link>
          ))}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="hover:text-brand-600">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {!loaded ? null : user ? (
            <>
              <Link href="/profile" className="text-sm text-slate-600 hover:text-brand-600">
                {user.email}
              </Link>
              <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-1.5">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-xs px-3 py-1.5">
                Log in
              </Link>
              <Link href="/register" className="btn-primary text-xs px-3 py-1.5">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
